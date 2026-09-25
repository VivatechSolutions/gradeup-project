jest.mock("./mockInertiaBackendResponse.json?raw", () => "{}", { virtual: true });

import { generateLessonFromBackendResponse } from "./mockLessonData";

describe("generateLessonFromBackendResponse", () => {
  it("preserves phases, inline media, suggestions, and MCQ resolutions", () => {
    const imageUrl = "https://gradeup-books-images.s3.us-east-1.amazonaws.com/test/example.jpg";
    const lesson = generateLessonFromBackendResponse({
      success: true,
      section_title: "Resources",
      suggested_questions_by_segment: {
        seg_001: ["Can you explain the first idea?"],
        seg_1: ["Why is this useful?"],
      },
      enrichment: {
        avatar_lesson: {
          phase_order: ["explanation", "mystery", "challenge_lab"],
          phases: [
            {
              phase: "explanation",
              segments: [
                {
                  segment_id: "seg_1",
                  type: "teaching",
                  text: `Look at [${imageUrl}] and explain the pattern.`,
                  audio: { male: "lesson-male.mp3", female: "lesson-female.mp3" },
                },
                {
                  segment_id: "seg_mcq",
                  type: "flashcard",
                  flashcard_type: "mcq",
                  question: "Which answer is correct?",
                  options: {
                    A: { text: "First", image_url: "option-a.jpg" },
                    B: "Second",
                  },
                  answer: "B",
                  resolutions: [
                    { option_id: "A", text: "Review this answer.", audio: { male: "a.mp3" } },
                    { option_id: "B", text: "Correct answer.", audio: { male: "b.mp3" } },
                  ],
                },
              ],
            },
            {
              phase: "mystery",
              pool: [
                {
                  mystery_id: "mystery_1",
                  question: "Which assumption is contradicted?",
                  options: { A: "The original assumption", B: "An unrelated statement" },
                  answer: "A",
                  option_explanations: {
                    A: "Correct explanation.",
                    B: "Incorrect explanation.",
                  },
                  reveal: {
                    text: "The original assumption is contradicted.",
                    audio: { male: "reveal-male.mp3", female: "reveal-female.mp3" },
                  },
                  visual: {},
                },
              ],
            },
            {
              phase: "challenge_lab",
              title: "Challenge Lab",
              intro: { segment_id: "lab_1", text: "Try the challenge." },
            },
          ],
        },
      },
    });

    expect(lesson).not.toBeNull();
    const explanationSlide = lesson!.slides.find((slide) => slide.phase === "explanation");
    const explanationSegments = explanationSlide?.segments || [];
    expect(explanationSegments.map((slide) => slide.segmentId)).toEqual(["seg_1", "seg_mcq"]);
    const teachingSlide = explanationSegments.find((slide) => slide.segmentId === "seg_1");
    expect(teachingSlide?.description).not.toContain(imageUrl);
    expect(teachingSlide?.images?.main).toBe(imageUrl);
    expect(teachingSlide?.suggestedQuestions).toEqual(["Why is this useful?"]);

    const mcqSlide = explanationSegments.find((slide) => slide.segmentId === "seg_mcq");
    expect(mcqSlide?.options?.[0].imageUrl).toBe("option-a.jpg");
    expect(mcqSlide?.resolutions?.B.text).toBe("Correct answer.");
    expect(mcqSlide?.resolutions?.B.audio?.male).toBe("b.mp3");
    expect(mcqSlide?.suggestedQuestions).toEqual(["Can you explain the first idea?"]);
    expect(lesson!.slides.filter((slide) => slide.phase === "explanation")).toHaveLength(1);
    expect(lesson!.slides.some((slide) => slide.id === "backend-concept-overview")).toBe(false);

    const mysterySlide = lesson!.slides.find((slide) => slide.phase === "mystery");
    expect(mysterySlide?.clues?.map((clue) => clue.text)).not.toContain("The original assumption is contradicted.");
    expect(mysterySlide?.options?.[0].explanation).toBe("Correct explanation.");
    expect(mysterySlide?.resolutions?.A.audio?.male).toBe("reveal-male.mp3");
    expect(mysterySlide?.resolutions?.B.audio?.male).toBe("reveal-male.mp3");

    expect(lesson!.slides.some((slide) => slide.phase === "challenge_lab")).toBe(true);
  });

  it("preserves ordered phase substeps and maps explore choices without subject-specific fallbacks", () => {
    const cue = (id: string, text: string) => ({
      segment_id: id,
      text,
      audio: { male: `${id}-male.mp3`, female: `${id}-female.mp3` },
    });
    const lesson = generateLessonFromBackendResponse({
      success: true,
      section_title: "Revisiting Irrational Numbers",
      enrichment: {
        avatar_lesson: {
          phases: [
            {
              phase: "explain_back",
              order: 6,
              prompt: "Explain the proof.",
              ask: cue("explain-ask", "Explain it in your own words."),
              closing: cue("explain-close", "Excellent explanation."),
              key_points: ["Assume it is rational.", "Reach a contradiction."],
              model_explanation: "Model response",
            },
            {
              phase: "explore",
              order: 4,
              title: "Rearranging Contradiction Steps",
              intro: cue("explore-intro", "Try the steps."),
              materials: [],
              steps: ["Rearrange the equation."],
              interaction: {
                type: "choice",
                prompt: "What does the root equal?",
                options: [
                  { id: "A", label: "(5b - a) / b", feedback: "Correct." },
                  { id: "B", label: "(a - 5b) / b", feedback: "Check the sign." },
                ],
                answer: "A",
              },
              wrap_up: cue("explore-wrap", "Rearranging reveals the contradiction."),
              challenge: {
                prompt: "Solve the challenge.",
                interaction: {
                  type: "choice",
                  prompt: "Choose the expression.",
                  options: [
                    { id: "A", label: "a / (3b)", feedback: "Correct." },
                    { id: "B", label: "3a / b", feedback: "Divide by three." },
                  ],
                  answer: "A",
                },
              },
            },
            {
              phase: "hook",
              order: 1,
              intro: cue("hook-intro", "Start with a prediction."),
              bridge: cue("hook-bridge", "Now connect the result."),
              question: "Does the prime divide the integer?",
              options: { A: "Yes", B: "No" },
              answer: "A",
            },
            { phase: "explanation", order: 2, segments: [cue("seg-1", "Key idea.")] },
            {
              phase: "real_world",
              order: 3,
              question: "Where is this useful?",
              ask: cue("rw-ask", "Can you find it in real life?"),
              reveal: cue("rw-reveal", "It appears in square diagonals."),
              why_it_matters: "It preserves exact measurements.",
            },
            {
              phase: "mystery",
              order: 5,
              intro: cue("mystery-intro", "Spot the flaw."),
              outro: cue("mystery-outro", "Contradictions expose false assumptions."),
              pool: [{
                mystery_id: "m01",
                question: "What is contradicted?",
                ask: cue("m01-ask", "Inspect the claim."),
                options: { A: "The coprime assumption", B: "Prime definition" },
                answer: "A",
                option_explanations: { A: "Correct.", B: "Incorrect." },
                reveal: cue("m01-reveal", "Both values share a factor."),
              }],
            },
          ],
        },
      },
    });

    expect(lesson).not.toBeNull();
    const phaseOrder = lesson!.slides.map((slide) => slide.phase).filter((phase, index, values) => phase !== values[index - 1]);
    expect(phaseOrder).toEqual(["hook", "explanation", "real_world", "explore", "mystery", "explain_back"]);

    const hookQuestion = lesson!.slides.find((slide) => slide.id === "backend-think");
    expect(hookQuestion?.completionNarration?.[0].audio?.female).toBe("hook-bridge-female.mp3");

    const realWorld = lesson!.slides.find((slide) => slide.phase === "real_world");
    expect(realWorld?.description).toBe("Can you find it in real life?");
    expect(realWorld?.completionNarration?.[0].audio?.male).toBe("rw-reveal-male.mp3");

    const explore = lesson!.slides.find((slide) => slide.id === "backend-activity");
    expect(explore?.options?.map((option) => option.title)).toEqual(["(5b - a) / b", "(a - 5b) / b"]);
    expect(explore?.images?.diagram).toBeUndefined();
    expect(explore?.images?.items).toEqual([]);
    expect(explore?.completionNarration?.[0].audio?.male).toBe("explore-wrap-male.mp3");

    const challenge = lesson!.slides.find((slide) => slide.id === "backend-explore-challenge");
    expect(challenge?.type).toBe("think");
    expect(challenge?.task.type).toBe("select-option");
    expect(challenge?.options?.[0].title).toBe("a / (3b)");

    const mystery = lesson!.slides.find((slide) => slide.phase === "mystery");
    expect(mystery?.introNarration?.map((item) => item.id)).toEqual(["mystery-intro", "m01-ask"]);
    expect(mystery?.completionNarration?.[0].audio?.female).toBe("mystery-outro-female.mp3");

    const explainBack = lesson!.slides.find((slide) => slide.phase === "explain_back");
    expect(explainBack?.keyPoints).toEqual(["Assume it is rational.", "Reach a contradiction."]);
    expect(explainBack?.completionNarration?.[0].audio?.male).toBe("explain-close-male.mp3");
  });
});
