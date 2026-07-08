"""无需外部 API Key 的基础冒烟测试"""
from graph.agents import (
    DEFAULT_SUBGRAPH,
    INTENT_DEFAULT_AGENT,
    SUBGRAPH_NODE_NAMES,
    normalize_agent_name,
    resolve_subgraph,
)
from graph.replan import is_light_trip_request, is_replan_request
from services.coord_transform import parse_lnglat, wgs84_string_to_gcj02


def test_subgraph_registry_complete():
    assert len(SUBGRAPH_NODE_NAMES) == 7
    for intent, agent in INTENT_DEFAULT_AGENT.items():
        assert agent in SUBGRAPH_NODE_NAMES, f"intent {intent} maps to unknown agent {agent}"


def test_normalize_agent_name():
    assert normalize_agent_name("general") == "city_guide"
    assert normalize_agent_name("navigator") == "navigator"
    assert normalize_agent_name("") == DEFAULT_SUBGRAPH
    assert normalize_agent_name("unknown_agent") == DEFAULT_SUBGRAPH


def test_resolve_subgraph():
    assert resolve_subgraph("local_scout") == "local_scout"
    assert resolve_subgraph("general") == "city_guide"


def test_replan_detection():
    assert is_replan_request("换一个方案") is True
    assert is_replan_request("附近有什么好吃的") is False


def test_light_trip_detection():
    assert is_light_trip_request("帮我规划半日游") is True
    assert is_light_trip_request("今天天气怎么样") is False


def test_coord_transform():
    lng, lat = parse_lnglat("108.9402,34.3416")
    assert round(lng, 4) == 108.9402
    gcj = wgs84_string_to_gcj02("108.9402,34.3416")
    assert "," in gcj


def test_core_imports():
    import fast_mcp  # noqa: F401
    import graph_runner  # noqa: F401
    import llm_factory  # noqa: F401
    import session_store  # noqa: F401
    import user_profile  # noqa: F401
