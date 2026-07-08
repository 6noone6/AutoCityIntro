"""从逆地理编码文本/组件中解析城市信息"""
import re
from typing import Any, Dict, Optional


def parse_city_from_regeo_text(text: str) -> Optional[str]:
    if not text:
        return None
    for line in text.splitlines():
        if line.startswith("城市："):
            city = line.split("：", 1)[-1].strip()
            if city and city not in ("[]", ""):
                return _normalize_city_name(city)
    for line in text.splitlines():
        if line.startswith("地址："):
            addr = line.split("：", 1)[-1].strip()
            cm = re.search(r"[\u4e00-\u9fa5]{2,10}?市", addr)
            if cm:
                return cm.group(0)
    return None


def _normalize_city_name(city: str) -> str:
    city = city.strip()
    if not city:
        return city
    if city.endswith("市") or city.endswith("省") or city.endswith("自治区"):
        return city
    if len(city) <= 8:
        return f"{city}市"
    return city


def format_location_label(city: str, district: str = "", address: str = "", township: str = "") -> str:
    # 优先展示到街道/乡镇级，让用户看到更精确的定位
    if city and district and township:
        return f"{city} · {district} · {township}"
    if city and district:
        return f"{city} · {district}"
    if city:
        return city
    if address:
        return address[:24]
    return "当前位置"


def parse_ip_location_text(text: str) -> dict:
    """解析 amap_ip_location 工具返回的文本"""
    city = ""
    location = ""
    province = ""
    for line in (text or "").splitlines():
        line = line.strip()
        for prefix in ("城市:", "城市："):
            if line.startswith(prefix):
                city = line.split(prefix, 1)[-1].strip()
        for prefix in ("省份:", "省份："):
            if line.startswith(prefix):
                province = line.split(prefix, 1)[-1].strip()
        for prefix in ("建议中心坐标:", "建议中心坐标："):
            if line.startswith(prefix):
                loc = line.split(prefix, 1)[-1].strip()
                if loc and loc != "未知" and "," in loc:
                    location = loc
    if not city and province:
        city = province
    return {"city": city, "location": location, "province": province}
