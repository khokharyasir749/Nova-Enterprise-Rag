import logging
import os
import re
from typing import Any, Dict, List, Optional
import requests

from app.config import settings

logger = logging.getLogger(__name__)

NO_ACCESS_MESSAGE = "No accessible information found matching your permission level and tenant."

CONVERSATIONAL_PATTERNS = [
    r"^\s*(hi|hello|hey|greetings|good\s+(morning|afternoon|evening|day))\b",
    r"\b(who\s+are\s+you|who\s+r\s+u|what\s+are\s+you|what\s+is\s+your\s+name|introduce\s+yourself)\b",
    r"\b(what\s+can\s+you\s+do|what\s+do\s+you\s+do|how\s+can\s+you\s+help|what\s+are\s+your\s+capabilities|how\s+do\s+you\s+work|how\s+does\s+this\s+work)\b",
    r"\b(tell\s+me\s+about\s+yourself|who\s+made\s+you|who\s+created\s+you)\b",
]


def is_conversational_query(query: str) -> bool:
    """Detect if a user query is a general greeting, self-identification, or capabilities inquiry."""
    q = query.strip().lower()
    for pattern in CONVERSATIONAL_PATTERNS:
        if re.search(pattern, q):
            return True
    return False


def _clean_citations(text: str) -> str:
    """Strip any source citations like '(Source 1)', '(Sources 1 & 2)', '[Source 1]'."""
    if not text:
        return text
    cleaned = re.sub(r"\*?\(Sources?\s+\d+(?:(?:\s*(?:&|,|and)\s*)\d+)*\)\*?", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\*?\[Sources?\s+\d+(?:(?:\s*(?:&|,|and)\s*)\d+)*\]\*?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\s+\.", ".", cleaned)
    return cleaned.strip()


def format_context_prompt(
    query: str,
    chunks: List[Dict[str, Any]],
    tenant_id: Optional[str] = None,
    user_roles: Optional[List[str]] = None,
) -> str:
    """Format retrieved document chunks into a structured context prompt."""
    context_sections: List[str] = []
    for idx, chunk in enumerate(chunks, start=1):
        doc_name = chunk.get("doc_name", "Unknown Document")
        content = chunk.get("content", "").strip()
        context_sections.append(f"[Document: {doc_name}]\n{content}")

    joined_context = "\n\n".join(context_sections)
    roles_str = ", ".join(user_roles) if user_roles else "general"
    tenant_str = tenant_id or "default"

    return (
        f"You are an enterprise permission-aware AI assistant for tenant '{tenant_str}' (User roles: {roles_str}).\n"
        f"Answer the user's question accurately, naturally, and concisely based strictly on the authorized document context provided below.\n"
        f"Do NOT include citation labels like '(Source 1)', '(Source 2)', or references to source numbers in your final answer. Provide clean, natural, and direct answers without technical reference footnotes.\n"
        f"Do not assume or invent facts outside of the authorized context.\n\n"
        f"--- CONTEXT BEGIN ---\n{joined_context}\n--- CONTEXT END ---\n\n"
        f"User Question: {query}\n\nAnswer:"
    )


def format_conversational_prompt(
    query: str,
    tenant_id: Optional[str] = None,
    user_roles: Optional[List[str]] = None,
) -> str:
    """Format a conversational prompt for greetings or general assistant identity queries."""
    roles_str = ", ".join(user_roles) if user_roles else "general"
    tenant_str = tenant_id or "default"

    return (
        f"You are an enterprise permission-aware AI assistant for tenant '{tenant_str}' (active roles: {roles_str}).\n"
        f"The user asked: '{query}'\n\n"
        f"Instructions:\n"
        f"- Respond politely, concisely, and professionally as an enterprise AI assistant.\n"
        f"- Acknowledge your role in helping authorized users securely query organizational knowledge based on their tenant and role permissions.\n"
        f"- Keep the response concise (2-3 sentences max)."
    )


def _generate_with_openai(prompt: str) -> Optional[str]:
    """Generate answer using OpenAI API if configured."""
    api_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": "You are a helpful and concise enterprise AI assistant."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
        }
        res = requests.post(url, headers=headers, json=payload, timeout=20)
        res.raise_for_status()
        data = res.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"OpenAI generation failed: {e}. Falling back to alternative generator.")
        return None


def _generate_with_gemini(prompt: str) -> Optional[str]:
    """
    Generate answer using Google Gemini.
    Tries google-genai SDK first, with REST endpoint fallback across supported models.
    """
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    preferred = [
        settings.GEMINI_MODEL,
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
    ]
    models_to_try = list(dict.fromkeys(m for m in preferred if m))

    # 1. Attempt using google-genai SDK if available
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        for model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as model_err:
                logger.debug(f"google-genai client error with model '{model}': {model_err}")
                continue
    except ImportError:
        logger.debug("google-genai SDK not available; using REST endpoint.")
    except Exception as e:
        logger.warning(f"google-genai initialization failed: {e}")

    # 2. REST API fallback
    for model in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {"parts": [{"text": prompt}]}
                ]
            }
            res = requests.post(url, json=payload, timeout=12)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
            else:
                logger.debug(f"Gemini model '{model}' returned status {res.status_code}")
        except Exception as rest_err:
            logger.debug(f"Gemini REST error for model '{model}': {rest_err}")
            continue

    logger.warning("All Gemini model endpoints failed. Falling back to local generation.")
    return None


def _generate_local_fallback(query: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Local smart deterministic answer synthesizer from authorized context.
    Operates without external API keys or network latency.
    """
    if not chunks:
        return NO_ACCESS_MESSAGE

    # Collect source documents
    sources = list(dict.fromkeys(c.get("doc_name", "unknown") for c in chunks))
    source_str = ", ".join(f"'{s}'" for s in sources)

    # Extract keywords from query for sentence ranking
    query_words = set(re.findall(r"\w+", query.lower()))
    stopwords = {"what", "who", "where", "when", "why", "how", "is", "are", "the", "a", "an", "and", "or", "in", "on", "of", "to", "for"}
    keywords = query_words - stopwords

    scored_sentences: List[tuple[int, str]] = []
    for chunk in chunks:
        content = chunk.get("content", "")
        # Split into sentences
        sentences = re.split(r"(?<=[.!?])\s+", content)
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            s_words = set(re.findall(r"\w+", s_clean.lower()))
            overlap = len(keywords & s_words)
            if overlap > 0:
                scored_sentences.append((overlap, s_clean))

    # Sort sentences by keyword relevance
    scored_sentences.sort(key=lambda x: x[0], reverse=True)
    top_sentences = [s[1] for s in scored_sentences[:5]]

    if top_sentences:
        answer_body = " ".join(top_sentences)
    else:
        # Fall back to first chunk excerpt
        answer_body = chunks[0].get("content", "").strip()[:400] + "..."

    return f"Based on authorized document(s) {source_str}:\n\n{answer_body}"


def generate_augmented_answer(
    query: str,
    chunks: List[Dict[str, Any]],
    tenant_id: Optional[str] = None,
    user_roles: Optional[List[str]] = None,
) -> str:
    """
    Augment context and generate a secure answer.

    - If conversational query (e.g. "who are you", "what can you do"):
      Synthesizes a polite, context-aware enterprise response.
    - If chunks is empty and not conversational:
      Strict pre-LLM check prevents LLM invocation and returns permission denial.
    - If chunks are present:
      Uses Gemini / OpenAI to generate a natural, cited answer grounded in context.
    """
    # 1. Handle conversational / self-identification questions
    if is_conversational_query(query):
        conv_prompt = format_conversational_prompt(query, tenant_id=tenant_id, user_roles=user_roles)
        gemini_ans = _generate_with_gemini(conv_prompt)
        if gemini_ans:
            return gemini_ans

        openai_ans = _generate_with_openai(conv_prompt)
        if openai_ans:
            return openai_ans

        # Conversational local fallback
        roles_str = ", ".join(user_roles) if user_roles else "general"
        tenant_str = tenant_id or "default"
        return (
            f"Hello! I am your Enterprise Permission-Aware AI Assistant for tenant '{tenant_str}' "
            f"(active roles: {roles_str}). I help you securely access and query authorized organizational "
            f"knowledge and documents. How can I assist you today?"
        )

    # 2. Strict Pre-LLM check: if chunks list is empty, suppress LLM call and deny access
    if not chunks:
        logger.info("Pre-LLM check: chunks list is empty. Suppressing LLM call.")
        return NO_ACCESS_MESSAGE

    # 3. Context-augmented generation with authorized chunks
    prompt = format_context_prompt(query, chunks, tenant_id=tenant_id, user_roles=user_roles)

    # Prioritize Gemini if API key configured
    gemini_ans = _generate_with_gemini(prompt)
    if gemini_ans:
        return gemini_ans

    # Fall back to OpenAI if configured
    openai_ans = _generate_with_openai(prompt)
    if openai_ans:
        return openai_ans

    # Deterministic local fallback
    return _generate_local_fallback(query, chunks)
