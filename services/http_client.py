"""出站 HTTP：默认不走系统代理，避免本地代理未启动时请求失败"""
from typing import Any, Optional

import requests

_session: Optional[requests.Session] = None


def _no_proxy_session() -> requests.Session:
    global _session
    if _session is None:
        s = requests.Session()
        s.trust_env = False
        _session = s
    return _session


def http_get(url: str, **kwargs: Any) -> requests.Response:
    kwargs.setdefault("timeout", 15)
    return _no_proxy_session().get(url, **kwargs)


def http_post(url: str, **kwargs: Any) -> requests.Response:
    kwargs.setdefault("timeout", 30)
    return _no_proxy_session().post(url, **kwargs)
