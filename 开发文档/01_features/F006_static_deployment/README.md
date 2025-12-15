# F006: 静态部署系统

> **最后更新**: 2025-12-15

## 功能描述

完全静态化的部署系统，支持单页应用模式与GitHub Pages自动部署，无需服务器运行，降低运维成本。

## 实现逻辑

### 架构转换
- **原架构**: Python Flask + 服务器
- **新架构**: 纯前端静态文件 + GitHub Pages
- **核心变化**: 
  - 后端逻辑转换为JavaScript (static-report-generator.js)
  - 采用 iframe 实现单页面无刷新报告预览
  - 引入5级状态颜色体系 (#00b050, #92d050, #0070c0, #ffc000, #c00000)

### 部署流程
```yaml
# GitHub Actions工作流
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./static
```

## 核心特性

1. **完全静态**: 无需服务器，降低成本
2. **单页应用 (SPA)**: 整合上传与报告展示于同一页面，提供无缝用户体验
   - iframe 无刷新报告预览
   - 元数据智能提取（周次、机构、保单年度）
   - 分析模式自动识别（单机构/多机构对比）
3. **智能状态配色**: 基于变动成本率的5级状态颜色（卓越/优秀/健康/预警/危险）
4. **UI/UX 优化**: 现代化毛玻璃效果（glassmorphism）设计
   - 渐变背景和卡片模糊效果
   - 实时元数据预览面板
   - 响应式设计，支持各种屏幕尺寸
5. **自动部署**: Git推送自动触发部署
6. **全球CDN**: GitHub Pages全球加速
7. **版本控制**: 所有变更可追溯

## 技术栈

### 前端技术
- **HTML5**: 语义化标签
- **CSS3**: 现代样式和动画
- **JavaScript ES6+**: 模块化开发
- **Papa Parse**: CSV解析库
- **ECharts**: 数据可视化

### 部署技术
- **GitHub Pages**: 静态网站托管
- **GitHub Actions**: CI/CD自动化
- **Git**: 版本控制和协作

## 文件结构

```
static/
├── index.html                 # 主页面（SPA入口）
├── js/
│   └── static-report-generator.js  # 核心业务逻辑（KPI计算、报告生成）
├── templates/
│   └── 四川分公司车险第49周经营分析模板.html  # 报告模板
├── css/                       # 样式文件
├── assets/                    # 静态资源
└── reports/                   # 生成的报告(可选)
```

## 核心文件说明

### static/index.html
- **功能**: SPA 主入口，集成文件上传和报告预览
- **技术**: HTML5, CSS3 (毛玻璃效果), JavaScript ES6+
- **特色**: 元数据智能提取和实时预览

### static/templates/四川分公司车险第49周经营分析模板.html
- **功能**: HTML 报告模板，用于动态生成周报
- **特色**:
  - 响应式布局（16:9 宽屏）
  - ECharts 图表集成（气泡图、表格）
  - 支持单机构和多机构分析模式
  - CDN 加载优化（baomitu、bootcdn、jsdelivr 多源）

### static/js/static-report-generator.js
- **功能**: 核心业务逻辑引擎
- **模块**:
  - CSV 解析（Papa Parse）
  - 业务类型映射（F002）
  - KPI 计算（F003）
  - 数据聚合（F004）
  - 报告生成（F005）
  - 元数据提取（周次、机构、模式识别）

## 依赖关系

- **F001**: CSV 数据解析与处理（数据加载）
- **F002**: 业务类型映射与转换（标准化映射）
- **F003**: KPI 计算引擎（指标计算）
- **F004**: 数据聚合与统计（多维分析）

静态部署系统将 F001-F004 的所有功能集成到纯前端环境中。

## 部署配置

### GitHub Pages设置
1. 仓库设置 → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)
4. 自定义域名(可选)

### GitHub Actions配置
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v3
      - uses: actions/configure-pages@v3
      - uses: actions/upload-pages-artifact@v2
        with:
          path: './static'
      - uses: actions/deploy-pages@v2
```

## 性能优化

1. **资源压缩**: CSS/JS文件压缩
2. **缓存策略**: 浏览器缓存优化
3. **CDN加速**:
   - GitHub Pages 全球 CDN
   - ECharts 多源 CDN 加载（baomitu、bootcdn、jsdelivr）
   - 自动降级和容错机制
4. **懒加载**: 图表和资源按需加载
5. **客户端计算**: 所有 KPI 计算在浏览器端完成，无服务器开销

## 安全考虑

1. **数据隐私**: 数据仅在本地处理
2. **XSS防护**: 输入数据过滤和转义
3. **HTTPS强制**: GitHub Pages自动HTTPS
4. **CSP策略**: 内容安全策略配置

## 测试要点

1. **功能测试**: 所有功能在静态环境下正常
2. **兼容性测试**: 各浏览器兼容性
3. **性能测试**: 页面加载速度
4. **部署测试**: 自动部署流程验证

## 维护说明

- 监控 GitHub Actions 部署状态
- 定期更新依赖库版本（Papa Parse、ECharts）
- 优化页面加载性能
- 备份重要配置和数据
- 测试多源 CDN 的可用性

## 最近更新 (2025-12-15)

### 新增功能
1. **元数据智能提取**
   - 自动识别周次、更新日期、保单年度
   - 支持中英文字段名（如 policy_start_year / 保单年度）
   - 实时预览提取的元数据

2. **分析模式识别**
   - 通过三级机构数量判断单机构/多机构模式
   - 模式标识显示（single/multi）
   - 自动适配不同分析场景

3. **UI/UX 优化**
   - 毛玻璃效果（glassmorphism）设计
   - 元数据预览面板
   - 模式标识和机构信息展示

4. **CDN 优化**
   - ECharts 从本地文件改为 CDN 加载
   - 多源 CDN 确保高可用性
   - 修复 GitHub Pages 子目录部署 404 问题

### 技术改进
- 增强 CSV 字段兼容性（支持中英文字段）
- 优化报告模板资源加载策略
- 完善错误处理和用户提示

### ECharts CDN 加载修复详解

**问题背景**：
- 原模板使用绝对路径 `/asset/echarts.min.js`
- GitHub Pages 部署在子目录 `/utoweKPI-py/`
- 绝对路径指向根域名 `https://alongor666.github.io/asset/echarts.min.js`（404）
- 导致图表库加载失败，报告无法渲染

**修复方案**（commit: a8289b0）：
```html
<!-- 旧方案（本地文件） -->
<script src="/asset/echarts.min.js"></script>

<!-- 新方案（多源CDN） -->
<script src="https://lib.baomitu.com/echarts/5.4.3/echarts.min.js" onerror="this.remove()"></script>
<script src="https://cdn.bootcdn.net/ajax/libs/echarts/5.4.3/echarts.min.js" onerror="this.remove()"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
```

**优势**：
1. ✅ 完全避免路径问题（CDN是绝对URL）
2. ✅ 多源容错（一个失败自动尝试下一个）
3. ✅ 减小仓库体积（无需维护1MB的echarts.min.js）
4. ✅ 自动获取最新稳定版本

**修改文件**：
- `static/templates/四川分公司车险第49周经营分析模板.html:7-10`
- `templates/四川分公司车险第49周经营分析模板.html:7-10`
- `static/js/static-report-generator.js:134-136`（默认模板）

---

> 此功能实现了系统的完全静态化，大幅降低运维成本并提高可靠性。单页应用模式提供了流畅的用户体验，元数据智能提取和分析模式识别进一步增强了系统的智能化水平。