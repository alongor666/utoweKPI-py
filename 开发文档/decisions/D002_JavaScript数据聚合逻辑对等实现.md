# D002: JavaScript数据聚合逻辑对等实现

**状态**: Accepted
**日期**: 2025-12-15
**决策者**: Claude Sonnet 4.5
**影响范围**: F006_static_deployment, 数据处理系统

---

## 背景 (Context)

在实现静态部署功能（F006）时,需要在纯前端环境下完成完整的数据处理流程。当前存在以下问题:

1. **功能不完整**: 简化版的 `transformToTemplateData` 方法只支持三级机构维度聚合，缺少客户类别和业务类型两个维度
2. **数据不准确**: `dataByCategory` 和 `dataByBusinessType` 使用了相同的机构数据（临时方案），年计划达成率固定为 100%
3. **逻辑不对等**: JavaScript 实现与 Python 后端 (`report_generator.py` 的 `_process_dimension` 方法) 逻辑不一致
4. **用户体验受损**: 前端多维度切换功能无法正常工作，KPI 计算不完整

## 决策 (Decision)

**将 Python 后端的数据聚合逻辑完整移植到 JavaScript，实现三级机构、客户类别、业务类型三个维度的完整数据聚合和 KPI 计算**

### 核心架构

```javascript
CSV原始数据
    ↓
1. 数据预处理
   - 字段映射（中英文兼容）
   - 业务类型映射（business_type_mapping.json）
    ↓
2. 多维度聚合（通用方法）
   - 按三级机构聚合 → dataByOrg
   - 按客户类别聚合 → dataByCategory
   - 按业务类型聚合 → dataByBusinessType
    ↓
3. KPI计算（每个维度）
   - 满期赔付率、费用率、变动成本率
   - 出险率、案均赔款
   - 保费占比、赔款占比
   - 年计划达成率（关联year-plans.json）
    ↓
4. 问题机构检测
   - 成本超标、保费未达标、费用率高
    ↓
5. 组装最终DATA对象
```

### 核心方法设计

```javascript
// 方法1: 通用维度聚合
_aggregateByDimension(csvData, dimensionField, labelName, planMap, totalPremium, totalClaim)

// 方法2: KPI计算
_calculateKPIsForGroup(groupData, plan)

// 方法3: 业务类型映射
_mapBusinessTypes(csvData)

// 方法4: 年度计划加载
_loadYearPlans()
```

## 理由 (Rationale)

### 选择完整移植的原因

1. **数据一致性**: 确保前后端生成的数据完全一致，便于调试和验证
2. **功能完整性**: 支持多维度数据分析，满足用户需求
3. **可维护性**: 遵循 DRY 原则，使用通用聚合方法减少代码重复
4. **可验证性**: Python 后端逻辑已验证正确，直接移植降低出错风险

### 选择通用聚合方法的原因

1. **代码复用**: 三个维度使用相同的聚合逻辑，只需实现一次
2. **易于维护**: 修改 KPI 计算公式时只需更新一处
3. **扩展性强**: 未来添加新维度时只需调用通用方法
4. **性能优化**: 统一的处理流程便于整体优化

## 权衡 (Trade-offs)

### 优势
- ✅ 数据准确性：JavaScript 生成的 DATA 对象与 Python 后端 100% 一致
- ✅ 功能完整：支持三个维度的数据聚合和 KPI 计算
- ✅ 代码质量：遵循 DRY 原则，可维护性强
- ✅ 用户体验：多维度切换功能正常工作

### 劣势
- ⚠️ 代码复杂度增加：需要实现约 150 行新代码
- ⚠️ 性能考虑：大数据量（3000+ 行）处理时间可能增加（预计仍 < 2 秒）
- ⚠️ 维护成本：需要同时维护 Python 和 JavaScript 两套逻辑

### 备选方案及弃用原因

#### 方案 A: 保持简化版实现，仅支持机构维度
```javascript
// 仅实现三级机构聚合
const dataByOrg = aggregateByOrg(csvData);
const dataByCategory = dataByOrg; // 复用机构数据
```
**弃用原因**:
- 数据不准确，误导用户
- 功能不完整，无法满足多维度分析需求
- 年计划达成率无法正确计算

#### 方案 B: 后端 API 方式，上传 CSV 到服务器处理
```javascript
// 上传到后端处理
const response = await fetch('/api/process-csv', {
    method: 'POST',
    body: formData
});
const data = await response.json();
```
**弃用原因**:
- 违背静态部署的设计目标（F006）
- 需要额外的服务器资源和维护成本
- 增加网络延迟，用户体验变差
- 数据隐私风险（用户可能不愿上传敏感数据）

#### 方案 C: Web Worker 异步处理
```javascript
// 在 Web Worker 中处理数据
const worker = new Worker('data-processor.js');
worker.postMessage(csvData);
worker.onmessage = (e) => { /* 处理结果 */ };
```
**弃用原因**:
- 过度设计，当前数据量（< 5000 行）主线程处理完全可行
- 增加代码复杂度和调试难度
- 浏览器兼容性问题
- 可作为后续优化方向，但不是当前最优解

## 实施细节

### 受影响的文件

1. **static/js/static-report-generator.js** [UPDATED]
   - 新增 `_mapBusinessTypes` 方法（约 15 行）
   - 新增 `_calculateKPIsForGroup` 方法（约 60 行）
   - 新增 `_aggregateByDimension` 方法（约 50 行）
   - 新增 `_loadYearPlans` 方法（约 10 行）
   - 重构 `transformToTemplateData` 方法（约 15 行）

2. **开发文档/01_features/F006_static_deployment/meta.json** [UPDATED]
   - 更新 `updated_at` 字段
   - 添加 `D002` 到 `related_decisions`

3. **开发文档/reports/DEVLOG.md** [UPDATED]
   - 新增开发记录条目

### 数据依赖

| 文件 | 用途 | 结构 |
|------|------|------|
| `reference/business_type_mapping.json` | 业务类型映射 | `{ "原始类型": "简称" }` |
| `reference/year-plans.json` | 年度计划 | `{ "机构名": { "premium": 数值 } }` |
| `reference/thresholds.json` | 阈值配置 | `{ "expense_ratio": 0.25, ... }` |

### KPI 计算公式（16 个核心指标）

```javascript
// 1. 满期赔付率 = 已报告赔款 / 满期保费 × 100
loss_ratio: (reported_claim / matured_premium * 100).toFixed(2)

// 2. 费用率 = 费用额 / 签单保费 × 100
expense_ratio: (expense / signed_premium * 100).toFixed(2)

// 3. 变动成本率 = 满期赔付率 + 费用率
variable_cost_ratio: (loss_ratio + expense_ratio).toFixed(2)

// 4. 出险率 = 赔案件数 / 保单件数 × 100
claim_frequency: (claim_count / policy_count * 100).toFixed(2)

// 5. 案均赔款 = 已报告赔款 / 赔案件数
average_claim: (reported_claim / claim_count).toFixed(2)

// 6-16. 其他基础指标：签单保费、满期保费、已报告赔款等
```

### 年度计划达成率计算

```javascript
if (planMap && planMap.has(dimensionValue)) {
    const plan = planMap.get(dimensionValue);
    const achievement = (signed_premium / plan.premium * 100).toFixed(2);
} else {
    const achievement = '-'; // 无计划数据
}
```

## 验证方法

### 测试场景

1. **三级机构维度聚合**
   - 输入：天府CSV（单机构）
   - 预期：dataByOrg 包含正确的 KPI 计算
   - 验证：与 Python 后端输出对比

2. **客户类别维度聚合**
   - 输入：四川分公司CSV（多客户类别）
   - 预期：dataByCategory 正确分组聚合
   - 验证：切换到客户类别视图，数据显示正确

3. **业务类型维度聚合**
   - 输入：包含多种业务类型的CSV
   - 预期：dataByBusinessType 应用映射后聚合
   - 验证：业务类型显示简称，数据正确

4. **年度计划达成率**
   - 输入：包含天府机构的CSV + year-plans.json
   - 预期：天府机构显示正确的达成率
   - 验证：达成率 = 签单保费 / 年度计划保费 × 100

### 数据一致性验证工具

```bash
# 1. 生成 Python 版本 DATA
python main.py --csv data/test.csv --output python_data.json

# 2. 生成 JavaScript 版本 DATA（从浏览器控制台复制）
# 保存为 js_data.json

# 3. 对比差异
python scripts/compare_data_output.py python_data.json js_data.json
```

### 性能指标

- **处理速度**: 3000 行 CSV < 2 秒
- **内存占用**: < 50MB
- **数据准确性**: JavaScript vs Python 差异 < 0.01%

## 相关功能 (Related Features)

- **F006_static_deployment**: 静态部署系统主功能
- **F001_csv_processing**: CSV 数据处理
- **F002_kpi_calculation**: KPI 计算引擎
- **F004_multi_dimension_analysis**: 多维度分析

## 参考资料 (References)

1. Python 后端实现: `src/report_generator.py` - `_process_dimension` 方法
2. KPI 计算逻辑: `src/kpi_calculator.py` - `calculate_kpis` 方法
3. 重构计划文档: `开发文档/archive/重构计划.md`

## 后续优化

1. **性能优化**: 大数据量（> 5000 行）时使用 Web Worker 异步处理
2. **代码复用**: 提取 Python 和 JavaScript 共用的配置文件
3. **单元测试**: 添加 JavaScript 单元测试，自动化验证数据一致性
4. **错误处理**: 增强异常数据处理能力（如缺失字段、格式错误）

---

**决策生效日期**: 2025-12-15
**下次审查日期**: 2026-03-15（3个月后）
