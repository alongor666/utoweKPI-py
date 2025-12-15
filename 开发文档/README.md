# 项目知识库

> 索引更新于 2025-12-15 14:14:46

## 📁 目录结构

```
开发文档/
├── docs/                  # 项目文档 (0个)
├── decisions/             # 技术决策 (1条)
├── patterns/              # 可复用模式
│   ├── code/             # 代码模式 (7个)
│   └── configs/          # 配置模板 (0个)
└── reports/              # 分析报告
```

## 📋 文档索引

### 项目文档


### 技术决策

- [README](decisions/README.md)

### 代码模式

- `safe_divide` - 来自 `kpi_calculator.py`
- `calculate_kpis` - 来自 `kpi_calculator.py`
- `_build_canonical_map` - 来自 `mapper.py`
- `_build_compatibility_map` - 来自 `mapper.py`
- `map_business_type` - 来自 `mapper.py`
- `load_data` - 来自 `data_loader.py`
- `_detect_problems` - 来自 `report_generator.py`

## 🏷️ 标签索引

*文档中尚未使用标签*

## 📊 知识库统计

- 项目文档: 0
- 技术决策: 1
- 代码模式: 7
- 配置模板: 0
- 标签数量: 0
- 最后更新: 2025-12-15

---

**使用说明**: 
- 本索引由 `generate_index.py` 自动生成
- 修改文档后运行 `python scripts/generate_index.py <知识库路径>` 更新索引
- 通过 `project-knowledge-base` Skill 管理知识库
