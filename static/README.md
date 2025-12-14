# 静态部署使用指南

## 🚀 快速开始

### 本地测试
```bash
# 启动本地服务器
cd static
python3 -m http.server 8000

# 在浏览器中访问
open http://localhost:8000
```

### GitHub Pages部署

1. **推送代码到GitHub**
```bash
git add .
git commit -m "升级为静态部署"
git push origin main
```

2. **启用GitHub Pages**
- 进入仓库设置 → Pages
- Source: Deploy from a branch
- Branch: main / (root)
- 保存设置

3. **自动部署**
- GitHub Actions会自动构建和部署
- 部署完成后可通过 `https://[username].github.io/utoweKPI-py` 访问

## 📁 文件结构

```
static/
├── index.html                    # 主页面
├── js/
│   └── static-report-generator.js  # 核心业务逻辑
├── assets/
│   └── echarts.min.js            # 图表库
├── templates/                    # HTML模板
├── reference/                    # 配置文件
└── asset/                       # 静态资源
```

## 🔧 配置说明

### 业务配置
- `reference/business_type_mapping.json`: 业务类型映射
- `reference/thresholds.json`: KPI阈值配置
- `reference/year-plans.json`: 年度计划数据

### 模板配置
- `templates/四川分公司车险第49周经营分析模板.html`: 报告模板

## 📊 功能特性

### ✅ 已实现功能
- [x] CSV文件上传和解析
- [x] 业务类型映射
- [x] KPI计算引擎
- [x] 数据聚合统计
- [x] HTML报告生成
- [x] 静态部署支持
- [x] 响应式设计
- [x] 拖拽上传

### 🎯 核心优势
1. **零服务器成本**: 完全静态化部署
2. **全球加速**: GitHub Pages CDN
3. **自动部署**: Git推送自动更新
4. **数据安全**: 数据仅在本地处理
5. **版本控制**: 所有变更可追溯

## 🔄 工作流程

### 开发流程
1. 修改代码或配置
2. 本地测试功能
3. 提交到Git仓库
4. 自动部署到GitHub Pages

### 维护流程
1. 更新配置文件
2. 修改业务逻辑
3. 更新文档索引
4. 推送更新

## 🛠️ 故障排除

### 常见问题

**Q: CSV文件无法解析？**
A: 检查文件编码格式，支持UTF-8和GBK

**Q: 图表不显示？**
A: 检查网络连接，确保ECharts库加载成功

**Q: 部署失败？**
A: 检查GitHub Actions权限设置

**Q: 数据计算错误？**
A: 检查配置文件格式和数据完整性

### 调试方法
1. 打开浏览器开发者工具
2. 查看Console错误信息
3. 检查Network请求状态
4. 验证数据格式正确性

## 📈 性能优化

### 前端优化
- 资源压缩和缓存
- 按需加载图表组件
- 优化大数据量处理

### 部署优化
- GitHub Pages缓存策略
- CDN加速
- 压缩传输

## 🔒 安全考虑

- 数据仅在本地处理，不上传到服务器
- 输入数据验证和过滤
- HTTPS强制访问
- XSS攻击防护

---

> 技术支持：查看 [开发文档](./docs/) 了解详细技术实现