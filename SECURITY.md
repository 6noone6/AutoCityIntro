# 安全策略

## 支持的版本

| 版本 | 支持状态 |
| --- | --- |
| `main` 分支最新代码 | ✅ 活跃维护 |

## 报告漏洞

如果你发现安全漏洞，**请勿公开提交 Issue**。

请通过以下方式私下报告：

- GitHub Security Advisory：[创建私有安全报告](https://github.com/6noone6/AutoCityIntro/security/advisories/new)
- 或在仓库 Owner 的 GitHub 主页通过私信联系

我们会在确认后尽快回复，并在修复发布前暂不公开细节。

## 安全最佳实践

使用本项目时请注意：

1. **切勿提交 `.env`**：API Key 仅保存在本地，`.env` 已在 `.gitignore` 中忽略
2. **生产部署**：修改默认 CORS 策略，不要将服务直接暴露到公网而不加鉴权
3. **API Key 权限**：高德 / Kimi / MiniMax Key 建议使用最小权限、独立 Key
4. **运行产物**：`data/sessions/`、`data/profiles/` 可能含用户位置信息，注意访问控制

## 已知注意事项

- Web 服务默认监听 `0.0.0.0`，开发环境适用；生产环境请配合反向代理与 HTTPS
- 未成年模式（`MINOR_MODE=true`）会启用位置脱敏，但不替代完整的隐私合规审查
