# AutoCityIntro · 智能城市助手

[![CI](https://github.com/6noone6/AutoCityIntro/actions/workflows/ci.yml/badge.svg)](https://github.com/6noone6/AutoCityIntro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agent-orange.svg)](https://github.com/langchain-ai/langgraph)
[![MCP](https://img.shields.io/badge/MCP-Tools-green.svg)](https://modelcontextprotocol.io/)

一个基于 **LangGraph + LangChain + FastAPI + MCP** 的智能城市伴游助手。通过自然语言对话即可完成城市景点推荐、周边探索、路线规划、实时路况、行程编排、语音播报与图像生成等任务，前端提供流式聊天、地图、语音、分享等完整体验。

**在线体验**：克隆仓库后本地运行，访问 http://localhost:7003

---
## ✨ 功能特性

- **多 Agent 协同**：Supervisor 调度 7 个专职子 Agent，按意图自动路由
  | Agent | 职责 |
  | --- | --- |
  | `navigator` 导航专家 | 路线规划、多出行方式、唤起高德 App 导航/叫车 |
  | `local_scout` 本地探索专家 | 周边 POI 搜索、半径筛选、个性化推荐 |
  | `city_guide` 城市向导 | 城市 POI 推荐、POI 详情、天气查询 |
  | `creative` 创意生成专家 | POI 实景图生成（MiniMax 图像） |
  | `trip_planner` 行程规划专家 | 多日行程结构化编排、半日游、协作行程 |
  | `realtime_guard` 实时守护专家 | 实时路况、紧急医疗就近医院 |
  | `companion` 城市伴游助手 | 闲聊、主动建议、伴游跟踪 |
- **流式对话**：基于 SSE 的真流式 token 输出，边想边答
- **高德地图能力**：地理编码、周边搜索、路线规划、公交实时、IP 定位、逆地理、路况、距离计算、URI 唤起
- **多模态**：图片识景（视觉模型 + POI 联想）、TTS 语音播报、POI 效果图生成
- **会话与画像**：会话持久化、用户画像、跨会话偏好（POI/路线/城市）
- **行程管理**：行程保存、协作、导出 Markdown、分享链接
- **隐私与未成年模式**：位置脱敏、内容过滤
- **离线缓存**：POI 缓存、详情缓存，弱网可用
- **PWA**：manifest + Service Worker，可装到桌面

---

## 🏗️ 架构概览

```
┌─────────────┐    SSE     ┌──────────────────┐   HTTP    ┌──────────────┐
│  浏览器 UI  │ <───────> │  web_app.py      │ <───────> │ mcp_server.py│
│ (static/)   │           │  (FastAPI :7003) │           │ (FastMCP :7001)│
└─────────────┘           └──────────────────┘           └──────────────┘
                                  │                              │
                                  │ LangGraph                    │ 23 个 MCP 工具
                                  ▼                              ▼
                          ┌──────────────┐           ┌────────────────────┐
                          │ graph_runner │           │ 高德 / OpenWeather │
                          │  + 7 子图    │           │ / MiniMax / 视觉   │
                          └──────────────┘           └────────────────────┘
```

- `run_all.py` 一键拉起 MCP 服务（:7001）与 Web 服务（:7003）
- `graph_runner.py` 对外暴露 `CityGraphAgent`，LangGraph 驱动状态流转
- `graph/` 主状态图 + 子图（Supervisor 模式）
- `mcp_server.py` 注册 23 个 MCP 工具，供 LangGraph 节点调用
- `llm_factory.py` 统一封装 Kimi/Moonshot（OpenAI 兼容接口）
- `services/` 业务服务层（地理、路线、行程、语音、隐私、缓存等）
- `static/` 前端单页应用（原生 JS + 高德地图 JS SDK）

---

## 📂 目录结构

```
AutoCityIntro/
├── run_all.py              # 一键启动 MCP + Web
├── web_app.py              # FastAPI Web 服务与 API 网关
├── mcp_server.py           # FastMCP 工具服务（23 个工具）
├── graph_runner.py         # LangGraph 运行器（对外 API）
├── llm_factory.py          # LLM 工厂（Kimi/Moonshot）
├── fast_mcp.py             # 轻量 MCP 服务端实现
├── session_store.py        # 会话持久化
├── user_profile.py         # 用户画像持久化
├── graph/                  # LangGraph 状态图与子图
│   ├── city_graph.py       # 主图编译
│   ├── state.py            # 状态定义
│   ├── nodes.py            # 节点实现
│   ├── agents.py           # 子 Agent 注册表
│   ├── subgraphs/          # 各子 Agent 子图
│   └── ...
├── services/               # 业务服务层
│   ├── geocode.py  nearby_poi.py  route_destination.py
│   ├── trip_builder.py  trip_store.py  halfday_trip.py
│   ├── speech_text.py  tts_store.py
│   ├── traffic_status.py  poi_guide.py  companion.py
│   ├── privacy.py  offline_cache.py  accounts.py  ...
├── tools/                  # MCP 客户端与工具封装
│   ├── mcp_client.py       # 调用 MCP 工具
│   ├── city_tools.py  cache.py
├── static/                 # 前端 SPA
│   ├── index.html  app.js  chat-stream.js  map-panel.js
│   ├── route-planner.js  poi-detail.js  voice.js  multimodal.js
│   ├── share.html  share-page.js  settings-panel.js  theme.js  ...
├── data/                   # 运行产物（已 gitignore）
│   ├── sessions/ profiles/ trips/ shares/
│   ├── audio/ images/ cache/  checkpoints.db
├── agents/  scripts/       # 预留扩展目录
├── requirements.txt
├── .env.example            # 配置模板（见下文）
├── .gitignore
├── LICENSE                 # MIT 许可证
├── CONTRIBUTING.md         # 贡献指南
├── SECURITY.md             # 安全策略
├── tests/                  # 冒烟测试
└── RUNTIME.md              # 运行环境补充说明
```
---

## 🚀 快速开始

### 1. 环境准备

推荐使用专用 conda 环境（项目内部约定名为 `auto_city`，详见 `RUNTIME.md`）：

```bash
# 创建环境
conda create -n auto_city python=3.11 -y
conda activate auto_city

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置 `.env`

在项目根目录复制配置模板并填入真实值：

```bash
cp .env.example .env
```

```dotenv# 大模型（OpenAI 兼容接口，默认 Kimi/Moonshot）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2.6
OPENAI_THINKING=disabled
OPENAI_TEMPERATURE=0.6

# 高德地图（必填）
AMAP_API_KEY=your_amap_rest_key
AMAP_JS_KEY=your_amap_js_key   # 可选，前端 JS API 用

# OpenWeatherMap（可选）
OPENWEATHER_API_KEY=

# MiniMax（语音合成 / 图像生成）
MINIMAX_API_KEY=your_minimax_key
MINIMAX_API_HOST=https://api.minimaxi.com
MINIMAX_TTS_MODEL=speech-2.6-hd
MINIMAX_GROUP_ID=
```

> 配置项说明详见 `.env` 文件内注释，由 `load_dotenv()` 自动加载。

### 3. 启动服务

```bash
python run_all.py
```

启动成功后：

- MCP 服务：http://localhost:7001
- Web 服务：http://localhost:7003  ← 浏览器访问此地址

按 `Ctrl+C` 停止全部服务。

> macOS / Linux 上若使用专用 conda 环境，可直接：
> `/opt/anaconda3/envs/auto_city/bin/python run_all.py`

---

## 🔧 配置项速查

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | — | 大模型 API Key（必填） |
| `OPENAI_BASE_URL` | `https://api.moonshot.cn/v1` | OpenAI 兼容接口地址 |
| `OPENAI_MODEL` | `kimi-k2.6` | 模型名 |
| `OPENAI_THINKING` | `disabled` | `enabled` / `disabled` |
| `OPENAI_TEMPERATURE` | 自动 | thinking 开启建议 1，关闭时 kimi-k2.6 为 0.6 |
| `AMAP_API_KEY` | — | 高德 REST 服务端 Key（必填） |
| `AMAP_JS_KEY` | — | 高德 Web 端 JS Key（可选） |
| `OPENWEATHER_API_KEY` | — | OpenWeatherMap Key |
| `MINIMAX_API_KEY` | — | MiniMax API Key（TTS/图像） |
| `MINIMAX_API_HOST` | `https://api.minimaxi.com` | MiniMax 端点 |
| `MINIMAX_TTS_MODEL` | `speech-2.6-hd` | TTS 模型 |
| `WEB_PORT` | `7003` | Web 服务端口 |
| `MCP_SERVER_URL` | `http://localhost:7001` | MCP 服务地址 |
| `MCP_TIMEOUT` | `25` | MCP 调用超时（秒） |
| `MCP_MAX_RETRIES` | `2` | MCP 调用重试次数 |
| `MCP_CACHE_ENABLED` | `true` | 是否启用 MCP 结果缓存 |
| `SPEECH_ENABLED` | `true` | 是否启用语音 |
| `MINOR_MODE` | `false` | 未成年模式 |
| `AUDIO_OUTPUT_DIR` | `data/audio` | 音频输出目录 |
| `IMAGE_OUTPUT_DIR` | `data/images` | 图像输出目录 |

---

## 🧰 MCP 工具一览（23 个）

| 工具 | 说明 |
| --- | --- |
| `get_current_time` | 当前日期时间 |
| `get_current_weather` | 城市天气（OpenWeather） |
| `amap_geocode` | 关键字 → 经纬度 |
| `amap_place_around` | 经纬度周边 POI 搜索 |
| `amap_adcode_search` | 地名 → adcode |
| `amap_weather_forecast` | adcode → 国内城市天气预报 |
| `amap_route_planning` | 多出行方式路线规划 |
| `get_city_poi` | 城市热门景点/餐饮 |
| `get_city_weather_cn` | 中文城市名一步查天气 |
| `amap_regeocode` | 经纬度逆地理 |
| `amap_ip_location` | IP 定位 |
| `amap_distance` | 两点距离 |
| `amap_traffic_status` | 实时路况 |
| `get_poi_detail` | POI 详情 + 文化攻略 |
| `amap_transit_realtime` | 公交/地铁实时方案 |
| `plan_city_trip` | 结构化多日行程 |
| `tts_speak` | 文本转语音 |
| `analyze_scene_image` | 图片识景 + POI 联想 |
| `generate_poi_visual` | POI 效果图生成 |
| `amap_transit_nearby` | 周边公交/地铁站 |
| `amap_schema_navi` | 唤起高德 App 导航 URI |
| `amap_schema_taxi` | 唤起高德 App 叫车 URI |
| `emergency_nearest_hospital` | 紧急就近医院 + 驾车路线 |

---

## 🛠️ 技术栈

- **后端**：Python 3.11、FastAPI、Uvicorn
- **Agent 框架**：LangGraph、LangChain、LangChain-OpenAI
- **MCP**：自实现 `fast_mcp.py` 轻量服务端
- **大模型**：Kimi / Moonshot（OpenAI 兼容接口）
- **地图**：高德地图 Web/REST API
- **语音/图像**：MiniMax
- **天气**：OpenWeatherMap + 高德天气
- **持久化**：SQLite（LangGraph checkpointer）+ JSON 文件
- **前端**：原生 JS + 高德地图 JS SDK + PWA

---

## 📜 常用命令

```bash
# 单独启动 MCP 服务（调试）
python mcp_server.py

# 单独启动 Web 服务（调试）
python web_app.py

# 一键启动
python run_all.py

# 安装依赖
pip install -r requirements.txt

# 运行测试
pytest -q
```

---

## 🤝 参与贡献

欢迎提交 Issue 与 Pull Request！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

- [报告 Bug](https://github.com/6noone6/AutoCityIntro/issues/new?template=bug_report.yml)
- [功能建议](https://github.com/6noone6/AutoCityIntro/issues/new?template=feature_request.yml)
- [安全报告](SECURITY.md)

---

## ⚠️ 注意事项

- `.env` 含敏感信息，已被 `.gitignore` 忽略，切勿提交
- `data/` 下所有运行产物（音频、图像、缓存、会话、画像、行程）均不纳入版本控制
- 启动前请确认端口 `7001` / `7003` 未被占用；Windows 下 `run_all.py` 会尝试自动释放，macOS/Linux 需手动处理
- 若使用 SOCKS 代理，依赖中已包含 `socksio` 以支持 httpx 连接 OpenAI 兼容接口
- 更多运行环境细节参见 `RUNTIME.md`

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源。
