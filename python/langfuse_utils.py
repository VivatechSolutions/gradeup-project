"""
Langfuse integration utilities for GradeUp extraction pipeline
Provides decorators and helpers for tracing OCR and LLM operations
"""

import os
from typing import Optional, Dict, Any
from functools import wraps
from contextlib import nullcontext

try:
    from langfuse import observe, get_client
    LANGFUSE_AVAILABLE = True
except ImportError:
    LANGFUSE_AVAILABLE = False
    print("Warning: langfuse not installed. Install with: pip install langfuse")


def get_langfuse_client():
    """Get Langfuse client instance, returns None if not available"""
    try:
        from langfuse import get_client as _get_client
        try:
            return _get_client()
        except Exception:
            pass
    except Exception:
        pass

    try:
        from langfuse import Langfuse
        public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
        secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
        base_url = os.environ.get("LANGFUSE_BASE_URL")
        if public_key and secret_key:
            kwargs = {"public_key": public_key, "secret_key": secret_key}
            if base_url:
                kwargs["host"] = base_url
            return Langfuse(**kwargs)
    except Exception:
        pass

    if not LANGFUSE_AVAILABLE:
        return None
    try:
        return get_client()
    except Exception as e:
        print(f"Warning: Failed to initialize Langfuse client: {e}")
        return None


def safe_observe(*args, **kwargs):
    """Safe wrapper for @observe decorator that gracefully handles missing Langfuse"""
    def decorator(func):
        if LANGFUSE_AVAILABLE:
            return observe(*args, **kwargs)(func)
        else:
            @wraps(func)
            def wrapper(*func_args, **func_kwargs):
                return func(*func_args, **func_kwargs)
            return wrapper
    return decorator


def update_trace_safely(client, **kwargs):
    """Safely update current trace, no-op if Langfuse not available"""
    if client and LANGFUSE_AVAILABLE:
        try:
            client.update_current_trace(**kwargs)
        except Exception as e:
            print(f"Warning: Failed to update trace: {e}")


def update_generation_safely(client, **kwargs):
    """Safely update current generation, no-op if Langfuse not available"""
    if client and LANGFUSE_AVAILABLE:
        try:
            client.update_current_generation(**kwargs)
        except Exception as e:
            print(f"Warning: Failed to update generation: {e}")


def flush_safely(client):
    """Safely flush Langfuse client"""
    if client and LANGFUSE_AVAILABLE:
        try:
            client.flush()
        except Exception as e:
            print(f"Warning: Failed to flush Langfuse: {e}")


def score_trace_safely(client, name: str, value: float, **kwargs):
    """Safely score current trace"""
    if client and LANGFUSE_AVAILABLE:
        try:
            client.score_current_trace(name=name, value=value, **kwargs)
        except Exception as e:
            print(f"Warning: Failed to score trace: {e}")


def extract_usage_from_mistral_response(response) -> Optional[Dict[str, int]]:
    """Extract token usage from Mistral API response"""
    try:
        if hasattr(response, 'usage'):
            usage = response.usage
            return {
                "input": getattr(usage, 'prompt_tokens', 0),
                "output": getattr(usage, 'completion_tokens', 0),
                "total": getattr(usage, 'total_tokens', 0)
            }
    except Exception:
        pass
    return None


def extract_usage_from_openrouter_response(response_data: Dict[str, Any]) -> Optional[Dict[str, int]]:
    """Extract token usage from OpenRouter API response"""
    try:
        if usage := response_data.get("usage"):
            return {
                "input": usage.get("prompt_tokens", 0),
                "output": usage.get("completion_tokens", 0),
                "total": usage.get("total_tokens", 0)
            }
    except Exception:
        pass
    return None


def create_span_context(client, name: str, **kwargs):
    """Create a context manager for a span"""
    if client and LANGFUSE_AVAILABLE:
        return client.start_as_current_span(name=name, **kwargs)
    else:
        return nullcontext()


def link_to_parent_trace(parent_trace_id: Optional[str] = None):
    """Get trace context for linking to parent trace"""
    trace_id = parent_trace_id or os.environ.get("LANGFUSE_TRACE_ID")
    if trace_id:
        return {"trace_id": trace_id}
    return None
