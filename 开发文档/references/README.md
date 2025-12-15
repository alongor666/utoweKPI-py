# 参考文档 (References)

本目录存放项目的参考文档、配置模板和领域知识。

## 目录内容

### 业务领域知识

放置与业务相关的参考文档：
- 华安保险车险业务规则
- KPI 指标定义和计算公式
- 业务术语词汇表

### 配置模板

放置项目使用的配置文件示例：
- `business_type_mapping.json` - 业务类型映射配置
- `thresholds.json` - KPI 阈值配置
- `year-plans.json` - 年度计划配置

### 技术参考

放置技术相关的参考资料：
- 第三方库文档链接
- API 规范文档
- 技术选型调研报告

## 文件命名规范

- 业务文档: `业务主题.md`
- 配置模板: `config-name.json` 或 `config-name.yaml`
- 技术文档: `tech-主题.md`

## 使用方式

在功能单元的 `meta.json` 中引用配置文件：

```json
{
  "id": "F003",
  "name": "KPI计算引擎",
  "core_files": [
    "src/kpi_calculator.py",
    "reference/thresholds.json",
    "reference/year-plans.json"
  ]
}
```

## 维护原则

- 配置文件应有完整的注释说明
- 业务文档应定期更新，保持与实际业务一致
- 技术文档应包含版本信息和更新日期
