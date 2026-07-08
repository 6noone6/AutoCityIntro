# 贡献指南

感谢你对 AutoCityIntro 的关注！欢迎通过 Issue 或 Pull Request 参与改进。

## 开始之前

1. 克隆仓库并安装依赖（见 [README.md](README.md) 快速开始）
2. 复制 `.env.example` 为 `.env`，填入必要的 API Key
3. 使用 Python 3.11+ 运行项目

## 开发流程

```bash
# 创建分支
git checkout -b feat/your-feature

# 安装依赖
pip install -r requirements.txt

# 运行测试
pytest -q

# 本地启动验证
python run_all.py
```

## 提交规范

- 使用清晰的中文或英文 commit message
- 一个 PR 聚焦一个改动（功能、修复或文档）
- 修复 bug 请在 PR 描述中说明复现步骤

推荐 commit 前缀：

| 前缀 | 用途 |
| --- | --- |
| `feat:` | 新功能 |
| `fix:` | Bug 修复 |
| `docs:` | 文档更新 |
| `refactor:` | 重构（不改变行为） |
| `test:` | 测试相关 |
| `chore:` | 构建、CI、依赖等 |

## 代码约定

- 遵循项目现有风格，改动范围尽量小
- 新增业务逻辑优先放在 `services/`，Agent 相关放在 `graph/`
- MCP 工具注册在 `mcp_server.py`，客户端封装在 `tools/`
- 不要提交 `.env` 或 `data/` 下的运行产物

## 报告 Bug

请使用 [Bug Report 模板](https://github.com/6noone6/AutoCityIntro/issues/new?template=bug_report.yml)，包含：

- 复现步骤
- 期望行为 vs 实际行为
- 环境信息（OS、Python 版本）

## 功能建议

请使用 [Feature Request 模板](https://github.com/6noone6/AutoCityIntro/issues/new?template=feature_request.yml)，说明使用场景与预期效果。

## Pull Request 检查清单

- [ ] 本地 `pytest -q` 通过
- [ ] 未提交敏感信息（`.env`、API Key）
- [ ] 相关文档已更新（如 README、`.env.example`）
- [ ] 改动范围与 PR 描述一致
