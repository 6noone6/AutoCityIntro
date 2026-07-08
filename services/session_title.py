"""会话标题：首轮对话完成后由 LLM 生成简短标题"""
import re

from langchain_core.messages import HumanMessage

from llm_factory import get_intent_llm

_MAX_LEN = 24


def _fallback_title(user_text: str) -> str:
    text = re.sub(r"\s+", " ", (user_text or "").strip())
    if not text:
        return "新对话"
    if len(text) <= _MAX_LEN:
        return text
    return text[: _MAX_LEN - 1] + "…"


def _clean_title(raw: str) -> str:
    title = (raw or "").strip()
    title = re.sub(r'^["\'「『【《]+|["\'」』】》]+$', "", title)
    title = re.sub(r"[。！？.!?，,；;：:]+$", "", title)
    title = re.sub(r"\s+", " ", title)
    if len(title) > _MAX_LEN:
        title = title[: _MAX_LEN - 1] + "…"
    return title or "新对话"


def needs_title_generation(session: dict) -> bool:
    if session.get("title_generated"):
        return False
    title = (session.get("title") or "").strip()
    if title and title != "新对话":
        return False
    history = session.get("conversation_history") or []
    user_msgs = sum(1 for m in history if m.get("role") == "user")
    return user_msgs == 1 and len(history) >= 2


def generate_session_title(user_text: str, assistant_text: str = "") -> str:
    user_text = (user_text or "").strip()
    assistant_text = (assistant_text or "").strip()[:300]
    if not user_text:
        return "新对话"
    try:
        llm = get_intent_llm()
        prompt = (
            "你是会话标题生成器。根据下面用户与助手的第一轮对话，"
            "生成一个简短中文标题，概括对话主题。\n"
            "要求：6-16个字；不要用引号；不要以标点结尾；"
            "不要空泛词如「对话」「咨询」「问答」；只输出标题本身。\n\n"
            f"用户：{user_text}\n"
        )
        if assistant_text:
            prompt += f"助手：{assistant_text}\n"
        resp = llm.invoke([HumanMessage(content=prompt)])
        title = _clean_title(str(resp.content or ""))
        if title and title != "新对话":
            return title
    except Exception:
        pass
    return _fallback_title(user_text)


def maybe_update_session_title(session: dict, user_text: str, assistant_text: str) -> bool:
    if not needs_title_generation(session):
        return False
    session["title"] = generate_session_title(user_text, assistant_text)
    session["title_generated"] = True
    return True
