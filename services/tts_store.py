"""TTS 音频本地缓存：按 session_id 分目录存储，同文本+音色复用文件"""
from __future__ import annotations

import hashlib
import os
import re
import shutil
from pathlib import Path
from typing import Optional

from services.speech_text import to_speech_text

AUDIO_ROOT = Path(os.getenv("AUDIO_OUTPUT_DIR", "data/audio"))


def _safe_session_id(session_id: str) -> str:
    return re.sub(r"[^\w-]", "", session_id or "")


def normalize_for_tts(text: str) -> str:
    return to_speech_text(text, max_len=500)


def cache_key(spoken_text: str, voice_id: str) -> str:
    raw = f"{voice_id}:{spoken_text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def session_dir(session_id: str) -> Path:
    sid = _safe_session_id(session_id)
    if not sid:
        raise ValueError("session_id 无效")
    d = AUDIO_ROOT / sid
    d.mkdir(parents=True, exist_ok=True)
    return d


def audio_path(session_id: str, spoken_text: str, voice_id: str) -> Path:
    return session_dir(session_id) / f"{cache_key(spoken_text, voice_id)}.mp3"


def audio_url(session_id: str, spoken_text: str, voice_id: str) -> str:
    sid = _safe_session_id(session_id)
    key = cache_key(spoken_text, voice_id)
    return f"/static-audio/{sid}/{key}.mp3"


def get_cached(session_id: str, spoken_text: str, voice_id: str) -> Optional[dict]:
    path = audio_path(session_id, spoken_text, voice_id)
    if path.is_file() and path.stat().st_size > 0:
        return {
            "path": str(path),
            "url": audio_url(session_id, spoken_text, voice_id),
            "cached": True,
        }
    return None


def save_audio(session_id: str, spoken_text: str, voice_id: str, data: bytes) -> dict:
    path = audio_path(session_id, spoken_text, voice_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return {
        "path": str(path),
        "url": audio_url(session_id, spoken_text, voice_id),
        "cached": False,
    }


def attach_tts_to_message(session_id: str, spoken_text: str, voice_id: str, url: str) -> None:
    """将会话历史中匹配的 assistant 消息绑定 tts_url。"""
    import session_store

    session = session_store.get_session(session_id)
    if not session:
        return
    target = spoken_text.strip()
    for msg in reversed(session.get("conversation_history", [])):
        if msg.get("role") != "assistant":
            continue
        if normalize_for_tts(msg.get("content", "")) == target:
            msg["tts_url"] = url
            msg["tts_voice_id"] = voice_id
            session_store.save_session(session)
            return


def delete_session_audio(session_id: str) -> None:
    sid = _safe_session_id(session_id)
    if not sid:
        return
    d = AUDIO_ROOT / sid
    if d.is_dir():
        shutil.rmtree(d, ignore_errors=True)
