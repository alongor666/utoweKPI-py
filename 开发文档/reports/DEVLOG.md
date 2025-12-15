# 开发记录 (Devlog)

用于记录“可交付变更”的最小闭环信息，便于回溯：做了什么、为什么做、影响哪些文件、如何验证。

## 2025-12-15

### README 与入口说明对齐

- 变更摘要：重写项目根 `README.md`，按仓库真实入口与结构说明三种使用方式（CLI/Web/静态站点）。
- 影响文件：
  - `README.md`
- 关键点：
  - 明确 CLI 入口 `main.py` 与 Web 入口 `app.py`
  - 补齐 CSV 必需字段列表（来自 `src/data_loader.py`）与模板/配置文件说明
  - 补充静态站点与 GitHub Pages 部署流水线的定位
  - 将 Python 版本建议收敛为 `3.9 ~ 3.12`（更符合 `pandas/numpy` 常见兼容范围；CI 也使用 3.9）
- 验证：
  - 文档结构自检：手动阅读确认与仓库文件路径一致
  - 测试运行：在当前机器的 Python 3.14 环境下运行 `pytest` 出现卡住/超时现象（疑似依赖兼容问题），因此未在该环境完成有效回归；建议在 3.9~3.12 环境重跑 `python -m pytest -q tests/test_branch_mode.py`

