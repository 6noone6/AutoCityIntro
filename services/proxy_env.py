"""启动时检测本地代理是否可用，不可用则清除环境变量避免 requests 失败"""
import os
import socket
from typing import Dict, Iterable, Optional
from urllib.parse import urlparse

_PROXY_KEYS = (
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
)


def _proxy_endpoint(value: str) -> Optional[tuple[str, int]]:
    raw = (value or "").strip()
    if not raw:
        return None
    if "://" not in raw:
        raw = f"http://{raw}"
    parsed = urlparse(raw)
    host = parsed.hostname
    if not host:
        return None
    port = parsed.port
    if port is None:
        port = 443 if parsed.scheme == "https" else 80
    return host, port


def _is_local_host(host: str) -> bool:
    return host in ("127.0.0.1", "localhost", "::1")


def _proxy_reachable(value: str, timeout: float = 0.35) -> bool:
    endpoint = _proxy_endpoint(value)
    if not endpoint:
        return False
    host, port = endpoint
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _first_proxy_value(env: Dict[str, str]) -> Optional[str]:
    for key in _PROXY_KEYS:
        val = env.get(key, "").strip()
        if val:
            return val
    return None


def sanitize_proxy_env(env: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    """
    若环境变量指向不可达的本地代理（如 Clash 未启动），移除代理配置。
    返回处理后的 env 字典（原地修改 os.environ 当 env 为 None 时）。
    """
    target = os.environ if env is None else env
    proxy_val = _first_proxy_value(target)
    if not proxy_val:
        return target

    endpoint = _proxy_endpoint(proxy_val)
    if not endpoint or not _is_local_host(endpoint[0]):
        return target

    if _proxy_reachable(proxy_val):
        return target

    for key in _PROXY_KEYS:
        target.pop(key, None)
    return target


def clear_proxy_keys(env: Dict[str, str], keys: Iterable[str] = _PROXY_KEYS) -> None:
    for key in keys:
        env.pop(key, None)
