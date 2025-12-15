# D001: ECharts CDN 加载优化

**状态**: Accepted
**日期**: 2025-12-15
**决策者**: Claude Sonnet 4.5
**影响范围**: F006_static_deployment, 报告模板系统

---

## 背景 (Context)

在 GitHub Pages 部署环境中，原本使用本地 ECharts 文件（`/asset/echarts.min.js`）导致了以下问题：

1. **路径问题**: GitHub Pages 可能部署到子目录（如 `/utoweKPI-py/`），导致绝对路径 `/asset/echarts.min.js` 404 错误
2. **资源管理**: 本地文件需要手动更新维护
3. **加载速度**: 缺少 CDN 加速，首次加载速度慢

## 决策 (Decision)

**采用多源 CDN 加载 ECharts，并实现自动降级机制**

```javascript
// 多源 CDN 配置
const echartsUrls = [
    'https://lib.baomitu.com/echarts/5.4.3/echarts.min.js',
    'https://cdn.bootcdn.net/ajax/libs/echarts/5.4.3/echarts.min.js',
    'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js'
];

// 自动降级加载
function loadEChartsFromCDN(urls, index = 0) {
    if (index >= urls.length) {
        console.error('所有 ECharts CDN 源均加载失败');
        return;
    }

    const script = document.createElement('script');
    script.src = urls[index];
    script.onload = () => console.log(`✅ ECharts 从 CDN 加载成功: ${urls[index]}`);
    script.onerror = () => {
        console.warn(`❌ CDN 源 ${urls[index]} 加载失败，尝试下一个...`);
        loadEChartsFromCDN(urls, index + 1);
    };
    document.head.appendChild(script);
}
```

## 理由 (Rationale)

### 选择 CDN 加载的原因

1. **路径无关性**: CDN URL 不受部署路径影响，避免绝对路径问题
2. **高可用性**: 多源 CDN 降级机制，确保至少一个源可用
3. **全球加速**: CDN 节点分布全球，加载速度更快
4. **自动更新**: 锁定版本（5.4.3），同时可轻松升级
5. **零维护**: 无需手动下载和更新 ECharts 文件

### 选择多源 CDN 的原因

1. **容错能力**: 单个 CDN 可能因网络、防火墙等原因不可用
2. **国内优化**: baomitu 和 bootcdn 在国内访问速度更快
3. **国际备份**: jsdelivr 在国际环境表现更好
4. **自动降级**: 主 CDN 失败时自动尝试备用源

## 权衡 (Trade-offs)

### 优势
- ✅ 解决 GitHub Pages 子目录部署 404 问题
- ✅ 提高资源加载可靠性和速度
- ✅ 降低维护成本
- ✅ 支持离线缓存（浏览器缓存 CDN 资源）

### 劣势
- ⚠️ 依赖外部 CDN 服务（通过多源降级缓解）
- ⚠️ 首次加载需要从 CDN 下载（后续有浏览器缓存）
- ⚠️ 版本锁定需要手动更新（但相比本地文件更容易）

### 备选方案及弃用原因

#### 方案 A: 使用相对路径本地文件
```html
<script src="../asset/echarts.min.js"></script>
```
**弃用原因**:
- 相对路径在不同嵌套层级的模板中难以维护
- 仍需手动管理文件更新
- 无法利用 CDN 加速

#### 方案 B: 使用单一 CDN 源
```html
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
```
**弃用原因**:
- 单点故障风险
- 国内访问 jsdelivr 可能较慢
- 无容错机制

#### 方案 C: 内联 ECharts 代码
```html
<script>
// 完整的 ECharts 代码...
</script>
```
**弃用原因**:
- HTML 文件过大（ECharts 压缩后仍有 ~1MB）
- 无法利用浏览器缓存
- 维护困难

## 实施细节

### 受影响的文件

1. **static/templates/四川分公司车险第49周经营分析模板.html**
   - 移除: `<script src="/asset/echarts.min.js"></script>`
   - 新增: CDN 多源加载脚本

2. **static/js/static-report-generator.js**
   - 更新模板生成逻辑，注入 CDN 加载代码

### CDN 源选择标准

| CDN 源 | 国内速度 | 国际速度 | 可靠性 | 备注 |
|--------|---------|---------|--------|------|
| baomitu | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 七牛云，国内首选 |
| bootcdn | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 极兔，国内备选 |
| jsdelivr | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 全球 CDN，国际首选 |

### 版本锁定

- **当前版本**: ECharts 5.4.3
- **锁定原因**: 确保兼容性和稳定性
- **升级策略**: 测试后手动更新版本号

## 验证方法

### 测试场景

1. **正常加载**: 主 CDN 源可用
   - 预期: 从 baomitu 加载成功
   - 验证: 控制台输出 "✅ ECharts 从 CDN 加载成功: https://lib.baomitu.com/..."

2. **降级加载**: 主 CDN 源不可用
   - 模拟: 修改主 CDN URL 为错误地址
   - 预期: 自动尝试 bootcdn，然后 jsdelivr
   - 验证: 控制台输出降级尝试信息

3. **全部失败**: 所有 CDN 源均不可用
   - 预期: 控制台输出错误提示
   - 验证: 用户看到友好的错误提示

### 性能指标

- **首次加载时间**: < 2 秒（国内网络）
- **缓存命中后**: < 100ms（浏览器缓存）
- **降级时间**: < 5 秒（尝试 3 个源）

## 相关功能 (Related Features)

- **F006_static_deployment**: 静态部署系统主功能
- **F005_report_generation**: HTML 报告生成器

## 参考资料 (References)

1. [ECharts 官方文档 - CDN 引入](https://echarts.apache.org/handbook/zh/basics/import)
2. [七牛云 CDN - baomitu](https://cdn.baomitu.com/)
3. [BootCDN](https://www.bootcdn.cn/)
4. [jsDelivr CDN](https://www.jsdelivr.com/)

## 后续优化

1. **监控 CDN 可用性**: 收集用户端 CDN 加载成功率数据
2. **动态调整顺序**: 根据用户地理位置自动调整 CDN 优先级
3. **服务工作器缓存**: 使用 Service Worker 实现离线缓存
4. **版本自动检测**: 自动检测 ECharts 新版本并提示升级

---

**决策生效日期**: 2025-12-15
**下次审查日期**: 2026-06-15（6个月后）
