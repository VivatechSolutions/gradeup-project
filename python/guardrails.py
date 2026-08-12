"""
Middleware Guardrails for GradeUp AI Tutor.
Intercepts homework questions before they reach the main RAG/Agent tutor.
"""

import os
import json
import time
import threading
import requests
from typing import Any, Dict, List, Optional, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from homework_engine import get_homework_engine

# Classifier model
CLASSIFIER_MODEL = "gpt-4o-mini"
CLASSIFIER_TIMEOUT = 8  # Low timeout for fast pre-flight interception

# TTL Cache for pending homework questions (avoids repeated DB fetches)

_hw_cache: Dict[Tuple, Any] = {}
_hw_cache_lock = threading.Lock()
_HW_CACHE_TTL = 60  # seconds

CLASSIFIER_SYSTEM_PROMPT = r"""You are an academic integrity middleware guardrail.
Your job is to analyze the student's query (and any description of an uploaded image) and determine if they are asking for a direct solution, direct answer, or completion of a homework question, printed worksheet problem, or textbook exercise.

## CLASSIFICATION CRITERIA
1. "general_academic_doubt": The student is asking general conceptual questions, requesting definitions, asking for study tips, or wanting to learn about a topic (e.g. "How does photosynthesis work?", "What is gravity?", "Explain Newton's first law"). These queries are SAFE and should be allowed.
2. "assigned_homework_request": The student is explicitly asking to solve one of their currently assigned homework questions (listed in the context).
3. "external_homework_request": The student is asking to solve an external school worksheet, textbook problem, or exam question that is NOT in the assigned list (e.g., "Solve this math problem: 3x + 5 = 20", "Give me the answer to Q3 on the paper").

## OUTPUT FORMAT
Respond with a JSON object with these keys ONLY:
{
  "classification": "general_academic_doubt" | "assigned_homework_request" | "external_homework_request",
  "concept": "string (the underlying academic concept/topic, e.g. 'Displacement in Circular Motion'. Leave empty if general_academic_doubt.)"
}
"""

# ---------------------------------------------------------------------------
# Predefined static message shown to students when homework is detected.
# Edit this string to change the response for all homework interceptions.
# ---------------------------------------------------------------------------
PREDEFINED_HOMEWORK_MESSAGE = """📚 **Homework Detected!**

It looks like you're asking for the answer to a homework or exam question. I'm not able to give you direct answers to homework problems — but I'm here to help you **understand the concept** so you can solve it yourself! 💪

Here's what you can do:
- Ask me to **explain the concept** behind this topic.
- Ask me for a **general example** (with different values) to understand the method.
- Ask me **"How do I approach this type of problem?"** and I'll guide you step by step.

Remember: Understanding the concept is more valuable than getting the answer! 🌟"""

def get_pending_homework_questions(candidate_id: str, subject: str, unit_number: int) -> List[str]:
    """Fetch all pending assigned homework questions for the student/subject/unit.
    
    Results are cached for _HW_CACHE_TTL seconds to avoid repeated DB round-trips
    on every single query, reducing per-request latency.
    """
    cache_key = (candidate_id, subject, unit_number)
    now = time.time()

    with _hw_cache_lock:
        entry = _hw_cache.get(cache_key)
        if entry is not None and (now - entry["ts"]) < _HW_CACHE_TTL:
            print(f"  [Guardrails] HW cache hit for {cache_key}")
            return entry["questions"]

    try:
        engine = get_homework_engine()
        pending_hws = engine.get_homeworks(
            candidate_id=candidate_id,
            subject=subject,
            unit_number=unit_number,
            status="pending"
        )
        questions = []
        for hw in pending_hws:
            detail = engine.get_homework_detail(candidate_id, hw["homework_id"])
            if detail and "questions" in detail:
                for q in detail["questions"]:
                    text = q.get("question", "")
                    if text:
                        questions.append(text)
    except Exception as e:
        print(f"  [Guardrails] Failed to fetch pending homework: {e}")
        questions = []

    with _hw_cache_lock:
        _hw_cache[cache_key] = {"questions": questions, "ts": now}

    return questions

def classify_homework_intent(
    query: str,
    pending_questions: List[str],
    image_description: Optional[str] = None
) -> Dict[str, Any]:
    """Calls OpenAI to classify if the student query is requesting homework answers."""
    api_key = os.environ.get("OPENAI_API_KEY_TEXT") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("  [Guardrails] OpenAI API Key missing, bypass guardrail.")
        return {"classification": "general_academic_doubt", "concept": "", "explanation_or_response": ""}

    # Construct user message content
    user_content = f"Student Query: {query}\n\n"
    if image_description:
        user_content += f"Uploaded Image Description:\n{image_description}\n\n"
    
    if pending_questions:
        user_content += "STUDENT'S ACTIVE ASSIGNED HOMEWORK QUESTIONS:\n"
        for i, q in enumerate(pending_questions, 1):
            user_content += f"{i}. {q}\n"
    else:
        user_content += "STUDENT'S ACTIVE ASSIGNED HOMEWORK QUESTIONS: None\n"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": CLASSIFIER_MODEL,
        "messages": [
            {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0,
    }

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=CLASSIFIER_TIMEOUT
        )
        if resp.ok:
            data = json.loads(resp.json()["choices"][0]["message"]["content"])
            return data
        else:
            print(f"  [Guardrails] Classifier API failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"  [Guardrails] Error running classifier: {e}")

    # Fallback to bypass in case of failure (fail-safe approach)
    return {"classification": "general_academic_doubt", "concept": ""}

def run_query_guardrail(
    query: str,
    subject: str,
    unit_number: int,
    candidate_id: str,
    image_description: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Orchestrates the pre-flight middleware checks.
    If homework is detected, returns a redirection response payload.
    Otherwise, returns None (meaning query is safe to pass through to the tutor).
    """
    # 1. Fetch active assigned homework
    pending_questions = get_pending_homework_questions(candidate_id, subject, unit_number)

    # 2. Run LLM classification
    result = classify_homework_intent(
        query=query,
        pending_questions=pending_questions,
        image_description=image_description
    )

    classification = result.get("classification", "general_academic_doubt")

    if classification in ("assigned_homework_request", "external_homework_request"):
        concept = result.get("concept", "this topic")

        # Tutor-style follow-up questions based on the detected concept
        suggested = [
            f"Can you explain the concept of {concept}?",
            f"Give me a general example (with different values) for {concept}.",
            f"How do I approach problems related to {concept}?",
        ]

        follow_up_block = (
            "\n\n💡 **You could ask next:**\n"
            + "\n".join(f"{i}. {q}" for i, q in enumerate(suggested, 1))
        )

        full_answer = PREDEFINED_HOMEWORK_MESSAGE + follow_up_block

        return {
            "answer": full_answer,
            "suggested_questions": suggested,
            "sources": [],
            "context_chunks_used": 0,
            "is_relevant": True,
            "homework_detected": True,
            "concept": concept,
            "redirection_allowed": True
        }

    return None
