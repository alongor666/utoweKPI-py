# utoweKPI-py - 静态部署版

> 🚀 **完全静态化的KPI报告生成系统** - 零服务器成本，支持GitHub Pages自动部署

## 📋 项目概述

这是一个基于Flask的KPI报告生成系统的静态化重构版本，保持所有原有设计不变，但实现了完全的静态部署。系统支持CSV数据上传、业务逻辑处理、KPI计算和HTML报告生成。

### ✨ 核心特性

- 🌐 **完全静态**: 无需服务器，降低运维成本
- 📊 **智能分析**: 自动化KPI计算和经营分析
- 🎨 **美观界面**: 现代化UI设计，支持拖拽上传
- 🚀 **自动部署**: Git推送自动更新到GitHub Pages
- 📱 **响应式**: 适配桌面和移动设备
- 🔒 **数据安全**: 数据仅在本地处理，不上传服务器

## 🏗️ 系统架构

### 原架构 (Flask)
```
用户上传 → Flask服务器 → 数据处理 → 生成报告 → 返回HTML
```

### 新架构 (静态)
```
用户上传 → 浏览器处理 → JavaScript计算 → 动态渲染 → 本地显示
```

## 🧭 知识体系导航

本项目采用智能知识体系架构，所有功能模块都有完整的文档和元数据：

### 📖 快速导航
| 功能ID | 功能名称 | 状态 | 描述 |
|--------|----------|------|------|
| [F001](开发文档/01_features/F001_csv_parsing/README.md) | CSV数据解析与处理 | ✅ | 文件上传和解析 |
| [F002](开发文档/01_features/F002_business_mapping/README.md) | 业务类型映射 | ✅ | 数据标准化 |
| [F003](开发文档/01_features/F003_kpi_calculation/README.md) | KPI计算引擎 | ✅ | 核心算法 |
| [F004](开发文档/01_features/F004_data_aggregation/README.md) | 数据聚合统计 | ✅ | 多维分析 |
| [F005](开发文档/01_features/F005_report_generation/README.md) | HTML报告生成 | ✅ | 报告输出 |
| [F006](开发文档/01_features/F006_static_deployment/README.md) | 静态部署系统 | ✅ | 部署架构 |

📖 **完整导航**: 查看 [开发文档/KNOWLEDGE_INDEX.md](开发文档/KNOWLEDGE_INDEX.md)

## 🚀 快速开始

### 方法一：GitHub Pages部署 (推荐)

1. **Fork并克隆仓库**
```bash
git clone https://github.com/yourusername/utoweKPI-py.git
cd utoweKPI-py
```

2. **启用GitHub Pages**
- 仓库设置 → Pages → Source: Deploy from a branch
- 选择 main 分支和 / (root) 目录

3. **推送代码触发部署**
```bash
git add .
git commit -m "初始化静态部署"
git push origin main
```

4. **访问应用**
- 等待GitHub Actions完成部署
- 访问 `https://yourusername.github.io/utoweKPI-py`

### 方法二：本地运行

```bash
# 启动本地服务器
cd static
python3 -m http.server 8000

# 浏览器访问
open http://localhost:8000
```

## 📁 项目结构

```
utoweKPI-py/
├── static/                          # 静态网站文件
│   ├── index.html                   # 主页面
│   ├── js/
│   │   └── static-report-generator.js  # 核心业务逻辑
│   ├── assets/                      # 静态资源
│   ├── templates/                    # HTML模板
│   ├── reference/                    # 配置文件
│   └── README.md                    # 静态部署说明
├── 开发文档/                         # 知识体系文档
│   ├── KNOWLEDGE_INDEX.md           # 全景导航
│   ├── 00_conventions.md            # 协作规范
│   └── 01_features/                 # 功能单元文档
├── scripts/                         # 自动化脚本
│   ├── generate_docs_index.py        # 索引生成器
│   └── init_knowledge_system.py     # 初始化脚本
├── src/                            # 原Python代码(保留)
├── .github/workflows/               # GitHub Actions
└── README.md                       # 项目说明
```

## 🔧 配置说明

### 业务配置文件
- `reference/business_type_mapping.json`: 业务类型映射规则
- `reference/thresholds.json`: KPI阈值配置
- `reference/year-plans.json`: 年度计划数据

### 模板文件
- `templates/四川分公司车险第49周经营分析模板.html`: 报告模板

## 📊 使用流程

1. **上传CSV数据**: 支持拖拽或点击上传
2. **自动处理**: 系统自动解析、映射、计算
3. **生成报告**: 实时生成HTML分析报告
4. **查看结果**: 在新窗口中查看完整报告

## 🛠️ 技术栈

### 前端技术
- **HTML5**: 语义化标签
- **CSS3**: 现代样式和动画
- **JavaScript ES6+**: 模块化开发
- **Papa Parse**: CSV解析库
- **ECharts**: 数据可视化

### 部署技术
- **GitHub Pages**: 静态网站托管
- **GitHub Actions**: CI/CD自动化
- **Git**: 版本控制

### 知识体系
- **智能文档架构**: 自描述、自索引
- **元数据驱动**: 机器可读的功能描述
- **原子化设计**: 独立的功能单元

## 🔄 维护指南

### 更新业务逻辑
1. 修改 `static/js/static-report-generator.js`
2. 更新相关配置文件
3. 测试功能正常
4. 推送代码自动部署

### 更新文档
1. 修改功能单元文档
2. 运行索引生成器
3. 提交文档更新

```bash
python3 scripts/generate_docs_index.py 开发文档
```

## 📈 性能优势

| 指标 | 原Flask版本 | 静态版本 | 提升 |
|------|-------------|----------|------|
| 服务器成本 | 需要云服务器 | 免费 | 100% |
| 部署时间 | 手动部署 | 自动部署 | 90% |
| 全球访问 | 单点部署 | GitHub CDN | 50%+ |
| 维护成本 | 需要运维 | 零运维 | 100% |

## 🔒 安全特性

- **本地处理**: 数据不上传到服务器
- **HTTPS强制**: GitHub Pages自动HTTPS
- **XSS防护**: 输入数据过滤和转义
- **版本控制**: 所有变更可追溯

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

- 📖 **文档**: [开发文档](开发文档/)
- 🐛 **问题反馈**: [GitHub Issues](https://github.com/alongor666/utoweKPI-py/issues)
- 💬 **讨论**: [GitHub Discussions](https://github.com/alongor666/utoweKPI-py/discussions)

---

> 🌟 **如果这个项目对您有帮助，请给我们一个Star！**