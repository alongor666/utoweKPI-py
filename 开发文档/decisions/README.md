# 技术决策记录 (Technical Decisions)

本目录存放项目的技术决策记录（Architecture Decision Records, ADR）。

## 决策命名规范

- 文件命名: `D00X_决策标题.md`
- 决策ID: D001, D002, ...
- 每个决策对应一个独立的 Markdown 文件

## 决策模板

```markdown
# D00X: 决策标题

**状态**: Accepted / Deprecated / Superseded
**日期**: YYYY-MM-DD
**决策者**: AI / 团队成员
**影响范围**: F00X_功能名称

## 背景 (Context)

描述为什么需要做这个决策，遇到了什么问题或需求。

## 决策 (Decision)

说明最终选择了什么方案。

## 理由 (Rationale)

为什么选择这个方案而不是其他方案。

## 权衡 (Trade-offs)

这个决策带来的优势和劣势。

## 相关功能 (Related Features)

- F00X: 功能名称

## 参考资料 (References)

- 相关文档链接
- 技术博客
```

## 自动提取决策

在代码中使用 `@decision` 注释标记技术决策：

```python
# @decision: 选择 python-pptx 而非 ReportLab
# 理由: python-pptx 支持精确布局控制,满足麦肯锡风格要求
# 权衡: 性能略低但 12-13 页规模可接受
# 影响范围: F005_report_generation
# 决策日期: 2025-12-09
```

运行提取脚本：
```bash
python3 .claude/skills/project-knowledge-base/scripts/extract_patterns.py src 开发文档
```

## 决策状态说明

- **Accepted**: 已采纳并正在使用
- **Deprecated**: 已废弃，但代码中可能还有遗留
- **Superseded**: 被新的决策替代，参见 D00X
