# 知识体系全景导航 (Knowledge System Panorama)

> **自动生成**: 由 `tools/update-docs.js` 动态构建
> **更新时间**: 2025-12-22 01:46:56

---

## 🧭 快速导航

| 功能ID | 功能名称 | 状态 | 标签 | 核心文件 |
|--------|----------|------|------|----------|
| [F001](开发文档/01_features/F001_csv_parsing/README.md) | 多源数据摄入与解析 | ✅ implemented | 数据处理, CSV解析, Excel解析, JSON解析, WebWorker, 性能优化 | `js/data.worker.js`, `js/static-report-generator.js`, `index.html` |
| [F002](开发文档/01_features/F002_business_mapping/README.md) | 业务类型映射与转换 | ✅ implemented | 数据映射, 业务逻辑, 配置化 | `src/mapper.py`, `reference/business_type_mapping.json`, `static/js/static-report-generator.js` |
| [F003](开发文档/01_features/F003_kpi_calculation/README.md) | KPI计算引擎 | ✅ implemented | KPI计算, 业务指标, 算法 | `src/kpi_calculator.py`, `reference/thresholds.json`, `reference/year-plans.json` ... (+1) |
| [F004](开发文档/01_features/F004_data_aggregation/README.md) | 数据聚合与统计 | ✅ implemented | 数据聚合, 统计分析, 多维分析 | `src/kpi_calculator.py`, `static/js/static-report-generator.js` |
| [F005](开发文档/01_features/F005_report_generation/README.md) | HTML报告生成器 (已弃用) | ⚠️ deprecated | 报告生成, HTML, 弃用 | `js/static-report-generator.js` |
| [F006](开发文档/01_features/F006_static_deployment/README.md) | 静态部署系统 | ✅ implemented | 静态部署, GitHub Pages, SPA, UI优化, CDN优化 | `index.html`, `js/static-report-generator.js`, `js/dashboard.js` ... (+2) |
| [F007](开发文档/01_features/F007_metadata_extraction/README.md) | 智能元数据提取与分析模式识别 | fully_implemented | 元数据提取, 智能识别, 字段映射, 分析模式, 前端, UI组件 | `js/data.worker.js`, `js/dashboard.js`, `index.html` ... (+1) |
| [F008](开发文档/01_features/F008_dashboard_visualization/README.md) | 交互式数据可视化仪表盘 | ✅ implemented | 可视化, ECharts, 交互设计, SPA, 图表样式规范 | `index.html`, `js/dashboard.js`, `css/dashboard.css` |
| [F009](开发文档/01_features/F009_ui_optimization/README.md) | UI优化 - 麦肯锡式仪表盘体验提升 | implementing | ui, ux, visualization, dashboard, optimization | - |

## 📊 状态概览

### ⚠️ Deprecated (1)

- **[F005](开发文档/01_features/F005_report_generation/README.md)**: HTML报告生成器 (已弃用)
  - 标签: `报告生成`, `HTML`, `弃用`

### fully_implemented (1)

- **[F007](开发文档/01_features/F007_metadata_extraction/README.md)**: 智能元数据提取与分析模式识别
  - 标签: `元数据提取`, `智能识别`, `字段映射`, `分析模式`, `前端`, `UI组件`

### ✅ Implemented (6)

- **[F001](开发文档/01_features/F001_csv_parsing/README.md)**: 多源数据摄入与解析
  - 标签: `数据处理`, `CSV解析`, `Excel解析`, `JSON解析`, `WebWorker`, `性能优化`

- **[F002](开发文档/01_features/F002_business_mapping/README.md)**: 业务类型映射与转换
  - 标签: `数据映射`, `业务逻辑`, `配置化`

- **[F003](开发文档/01_features/F003_kpi_calculation/README.md)**: KPI计算引擎
  - 标签: `KPI计算`, `业务指标`, `算法`

- **[F004](开发文档/01_features/F004_data_aggregation/README.md)**: 数据聚合与统计
  - 标签: `数据聚合`, `统计分析`, `多维分析`

- **[F006](开发文档/01_features/F006_static_deployment/README.md)**: 静态部署系统
  - 标签: `静态部署`, `GitHub Pages`, `SPA`, `UI优化`, `CDN优化`

- **[F008](开发文档/01_features/F008_dashboard_visualization/README.md)**: 交互式数据可视化仪表盘
  - 标签: `可视化`, `ECharts`, `交互设计`, `SPA`, `图表样式规范`

### implementing (1)

- **[F009](开发文档/01_features/F009_ui_optimization/README.md)**: UI优化 - 麦肯锡式仪表盘体验提升
  - 标签: `ui`, `ux`, `visualization`, `dashboard`, `optimization`

## 🏷️ 标签索引

### `报告生成` (1)

- **[F005](开发文档/01_features/F005_report_generation/README.md)**: HTML报告生成器 (已弃用)

### `多维分析` (1)

- **[F004](开发文档/01_features/F004_data_aggregation/README.md)**: 数据聚合与统计

### `分析模式` (1)

- **[F007](开发文档/01_features/F007_metadata_extraction/README.md)**: 智能元数据提取与分析模式识别

### `交互设计` (1)

- **[F008](开发文档/01_features/F008_dashboard_visualization/README.md)**: 交互式数据可视化仪表盘

### `静态部署` (1)

- **[F006](开发文档/01_features/F006_static_deployment/README.md)**: 静态部署系统

### `可视化` (1)

- **[F008](开发文档/01_features/F008_dashboard_visualization/README.md)**: 交互式数据可视化仪表盘

### `配置化` (1)

- **[F002](开发文档/01_features/F002_business_mapping/README.md)**: 业务类型映射与转换

### `弃用` (1)

- **[F005](开发文档/01_features/F005_report_generation/README.md)**: HTML报告生成器 (已弃用)

### `前端` (1)

- **[F007](开发文档/01_features/F007_metadata_extraction/README.md)**: 智能元数据提取与分析模式识别

### `数据处理` (1)

- **[F001](开发文档/01_features/F001_csv_parsing/README.md)**: 多源数据摄入与解析

### `数据聚合` (1)

- **[F004](开发文档/01_features/F004_data_aggregation/README.md)**: 数据聚合与统计

### `数据映射` (1)

- **[F002](开发文档/01_features/F002_business_mapping/README.md)**: 业务类型映射与转换

### `算法` (1)

- **[F003](开发文档/01_features/F003_kpi_calculation/README.md)**: KPI计算引擎

### `统计分析` (1)

- **[F004](开发文档/01_features/F004_data_aggregation/README.md)**: 数据聚合与统计

### `图表样式规范` (1)

- **[F008](开发文档/01_features/F008_dashboard_visualization/README.md)**: 交互式数据可视化仪表盘

### `性能优化` (1)

- **[F001](开发文档/01_features/F001_csv_parsing/README.md)**: 多源数据摄入与解析

### `业务逻辑` (1)

- **[F002](开发文档/01_features/F002_business_mapping/README.md)**: 业务类型映射与转换

### `业务指标` (1)

- **[F003](开发文档/01_features/F003_kpi_calculation/README.md)**: KPI计算引擎

### `元数据提取` (1)

- **[F007](开发文档/01_features/F007_metadata_extraction/README.md)**: 智能元数据提取与分析模式识别

### `智能识别` (1)

- **[F007](开发文档/01_features/F007_metadata_extraction/README.md)**: 智能元数据提取与分析模式识别

### `字段映射` (1)

- **[F007](开发文档/01_features/F007_metadata_extraction/README.md)**: 智能元数据提取与分析模式识别

### `CDN优化` (1)

- **[F006](开发文档/01_features/F006_static_deployment/README.md)**: 静态部署系统

### `CSV解析` (1)

- **[F001](开发文档/01_features/F001_csv_parsing/README.md)**: 多源数据摄入与解析

### `dashboard` (1)

- **[F009](开发文档/01_features/F009_ui_optimization/README.md)**: UI优化 - 麦肯锡式仪表盘体验提升

### `ECharts` (1)

- **[F008](开发文档/01_features/F008_dashboard_visualization/README.md)**: 交互式数据可视化仪表盘

### `Excel解析` (1)

- **[F001](开发文档/01_features/F001_csv_parsing/README.md)**: 多源数据摄入与解析

### `GitHub Pages` (1)

- **[F006](开发文档/01_features/F006_static_deployment/README.md)**: 静态部署系统

### `HTML` (1)

- **[F005](开发文档/01_features/F005_report_generation/README.md)**: HTML报告生成器 (已弃用)

### `JSON解析` (1)

- **[F001](开发文档/01_features/F001_csv_parsing/README.md)**: 多源数据摄入与解析

### `KPI计算` (1)

- **[F003](开发文档/01_features/F003_kpi_calculation/README.md)**: KPI计算引擎

### `optimization` (1)

- **[F009](开发文档/01_features/F009_ui_optimization/README.md)**: UI优化 - 麦肯锡式仪表盘体验提升

### `SPA` (2)

- **[F006](开发文档/01_features/F006_static_deployment/README.md)**: 静态部署系统
- **[F008](开发文档/01_features/F008_dashboard_visualization/README.md)**: 交互式数据可视化仪表盘

### `ui` (1)

- **[F009](开发文档/01_features/F009_ui_optimization/README.md)**: UI优化 - 麦肯锡式仪表盘体验提升

### `UI优化` (1)

- **[F006](开发文档/01_features/F006_static_deployment/README.md)**: 静态部署系统

### `UI组件` (1)

- **[F007](开发文档/01_features/F007_metadata_extraction/README.md)**: 智能元数据提取与分析模式识别

### `ux` (1)

- **[F009](开发文档/01_features/F009_ui_optimization/README.md)**: UI优化 - 麦肯锡式仪表盘体验提升

### `visualization` (1)

- **[F009](开发文档/01_features/F009_ui_optimization/README.md)**: UI优化 - 麦肯锡式仪表盘体验提升

### `WebWorker` (1)

- **[F001](开发文档/01_features/F001_csv_parsing/README.md)**: 多源数据摄入与解析

---

## 📖 使用指南

### AI协作者导航路径

1. **定位**: 在此页面搜索关键词或标签，找到目标功能ID
2. **锁定**: 进入功能目录，查看 `meta.json` 获取核心文件位置
3. **执行**: 直接修改代码，更新元数据，运行索引脚本

### 维护者工作流

```bash
# 1. 修改代码或文档
# 2. 更新功能元数据
vim 开发文档/01_features/F001/meta.json
# 3. 重新生成索引
node "tools/update-docs.js"
```
