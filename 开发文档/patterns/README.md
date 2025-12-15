# 可复用代码模式 (Reusable Patterns)

本目录存放项目中可复用的代码模式和最佳实践。

## 模式命名规范

- 文件命名: `P00X_模式名称.md`
- 模式ID: P001, P002, ...
- 每个模式对应一个独立的 Markdown 文件

## 模式模板

```markdown
# P00X: 模式名称

**类别**: 设计模式 / 编程技巧 / 算法
**适用场景**: 描述什么时候使用这个模式
**技术栈**: Python / JavaScript / etc.

## 问题 (Problem)

描述这个模式解决的问题。

## 解决方案 (Solution)

展示代码示例和实现思路。

\`\`\`python
# 代码示例
def pattern_example():
    pass
\`\`\`

## 优势 (Benefits)

这个模式带来的好处。

## 使用场景 (Use Cases)

在项目中的实际应用：
- src/module_name.py:123 - 具体应用描述

## 相关模式 (Related Patterns)

- P00X: 相关模式名称
```

## 示例模式类别

- **设计模式**: 工厂模式、单例模式、装饰器模式等
- **数据处理**: CSV 解析、数据验证、数据转换等
- **算法**: KPI 计算、统计聚合、周次计算等
- **架构模式**: 前后端分离、静态部署、配置化管理等

## 自动提取模式

在代码中使用清晰的函数/类文档字符串，提取脚本会自动识别可复用的模式：

```python
def calculate_week_of_year(policy_start_year: int, date: str) -> int:
    """计算保单年度内的周次

    基于保单年度（7月1日 - 次年6月30日）计算周次。
    每周六为一周的结束日期。

    Args:
        policy_start_year: 保单起始年度
        date: 日期字符串 YYYY-MM-DD

    Returns:
        周次（1-53）
    """
    pass
```
