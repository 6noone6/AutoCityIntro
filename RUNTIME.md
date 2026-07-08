# 运行环境

## Python 解释器

本项目使用专用的 conda 环境 `auto_city`：

```
/opt/anaconda3/envs/auto_city/bin/python
```

## 启动方式

使用 `auto_city` 环境的 Python 执行启动脚本，而不是系统默认 `python`：

```bash
/opt/anaconda3/envs/auto_city/bin/python run_all.py
```

`run_all.py` 会拉起两个服务：
- MCP 服务：http://localhost:7001
- Web 服务：http://localhost:7003

浏览器访问 http://localhost:7003 即可使用。

## 安装依赖

首次运行或更新依赖时，也务必使用该环境的 Python：

```bash
/opt/anaconda3/envs/auto_city/bin/pip install -r requirements.txt
```

## 配置

敏感信息（API Key 等）统一放在项目根目录的 `.env` 文件中，由 `load_dotenv()` 自动加载，无需在 shell 里 export。
