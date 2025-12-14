# F005: HTML报告生成器

## 功能描述

基于模板的HTML报告生成，支持动态数据注入和图表渲染，生成美观的经营分析报告。

## 实现逻辑

### 模板引擎
```python
def generate_html(data, template_path):
    """HTML报告生成核心算法"""
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
    
    # 数据占位符替换
    html = template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        return get_data_value(data, key)
    })
    
    # 注入JavaScript数据
    data_script = f"<script>window.reportData = {json.dumps(data)};</script>"
    html = html.replace('</body>', data_script + '</body>')
    
    return html
```

### 前端渲染
- **图表库**: ECharts
- **数据绑定**: 动态DOM操作
- **交互功能**: Tab切换、数据筛选

## 核心特性

1. **模板化设计**: HTML模板与数据分离
2. **动态渲染**: JavaScript实时渲染图表
3. **响应式布局**: 适配不同屏幕尺寸
4. **交互功能**: 支持数据筛选和视图切换

## 模板结构

### HTML模板
```html
<!DOCTYPE html>
<html>
<head>
    <title>{{机构名称}}第{{周次}}周经营分析</title>
    <script src="echarts.min.js"></script>
</head>
<body>
    <h1>{{机构名称}}第{{周次}}周经营分析</h1>
    
    <div class="kpi-cards">
        <div class="card">
            <h3>总保费收入</h3>
            <div class="value">{{summary.总保费}}</div>
        </div>
    </div>
    
    <div id="chart-container"></div>
</body>
</html>
```

### 数据绑定
```javascript
// 数据注入后自动触发图表渲染
window.reportData = {
    "summary": {"总保费": 1000000},
    "aggregated": {...}
};

setTimeout(renderCharts, 100);
```

## 依赖关系

- **F004**: 数据聚合与统计 (提供聚合数据)
- **F006**: 静态部署系统 (部署生成的HTML)

## 图表组件

### 主要图表类型
1. **趋势图**: 保费收入趋势
2. **结构图**: 业务类型占比
3. **对比图**: 同比环比分析
4. **KPI仪表盘**: 关键指标展示

### 交互功能
- Tab切换不同视图
- 时间范围筛选
- 数据导出功能
- 打印优化

## 性能优化

1. **模板缓存**: 编译后的模板缓存
2. **数据压缩**: JSON数据压缩传输
3. **按需加载**: 图表按需渲染
4. **缓存策略**: 浏览器缓存优化

## 测试要点

1. **模板渲染**: 数据正确注入
2. **图表显示**: 各图表正常渲染
3. **交互功能**: 用户操作响应
4. **性能测试**: 大数据量渲染时间

## 维护说明

- 模板样式更新和优化
- 新增图表类型和组件
- 数据格式变更的兼容性
- 浏览器兼容性测试

---

> 此功能是系统的输出层，将数据转化为直观的可视化报告。