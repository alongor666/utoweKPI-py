# 车险数据分析标准提示词库

> 作者：Alongor  
> 适用场景：华安保险车险业务数据分析  
> 更新时间：2024-12-20

## 📚 使用说明

### 提示词命名规范
- `INS-` 前缀：保险业务类
- `DATA-` 前缀：数据处理类
- `VIZ-` 前缀：数据可视化类
- `RPT-` 前缀：报告生成类

### 如何使用
1. 根据任务类型选择对应提示词
2. 替换 `{{...}}` 占位符为实际内容
3. 根据需要调整"输出要求"部分
4. 复制完整提示词到AI对话框

---

## 1️⃣ 数据清洗与验证类

### INS-DATA-QUALITY-CHECK
**用途**: 检查车险数据质量，识别异常和缺失

```markdown
【角色】你是华安保险数据质量专家，精通车险业务规则和数据标准。

【任务】对上传的车险数据进行全面质量检查。

【数据信息】
- 数据来源：{{来源系统，如核心、中间件、DW}}
- 时间范围：{{起始日期}} 至 {{结束日期}}
- 数据类型：{{保费/赔付/承保/业务量}}
- 预期记录数：{{约X万条}}

【检查维度】
1. **完整性检查**
   - 必填字段缺失率（机构、险种、保费、赔款等）
   - 时间字段缺失或异常（如未来日期、1900-01-01等占位日期）
   
2. **合规性检查**
   - 保费是否为负数或异常大（>100万/单）
   - 赔款是否为负数
   - 费用率是否超过35%（监管红线）
   - 业务类型×险种×渠道组合是否符合业务规则
   
3. **一致性检查**
   - 签单保费 vs 满期保费 vs 已赚保费的逻辑关系
   - 赔款金额 vs 已决赔款 + 未决赔款
   - 机构代码与机构名称是否匹配
   
4. **异常值检测**
   - 使用3σ原则识别保费/赔款异常值
   - 识别可能的重复数据（保单号+出单日期完全相同）
   - 识别"0保费有赔款"等异常组合

【输出格式】
## 数据质量报告

### 基本信息
- 总记录数：X条
- 检查时间：YYYY-MM-DD HH:mm
- 数据覆盖：X个机构 × Y个险种 × Z周

### 质量评分：{{A/B/C/D级}}
（A: 优秀≥95分, B: 良好≥85分, C: 及格≥70分, D: 不合格<70分）

### 问题清单（按严重程度排序）

#### 🔴 严重问题（阻断性，需立即修复）
1. {{字段名}}：缺失率{{X%}}，影响{{Y个}}机构
   - 典型案例：[展示2-3条记录]
   - 建议处理：{{具体方案}}

#### 🟡 一般问题（影响分析，建议修复）
...

#### 🟢 轻微问题（可接受，记录备查）
...

### 数据可用性建议
- ✅ 可直接用于：{{场景1, 场景2}}
- ⚠️ 需清洗后用于：{{场景3, 场景4}}
- ❌ 不建议用于：{{场景5}}

【质量标准】
- 每个问题必须标注：影响范围（记录数/占比）+ 业务影响 + 处理建议
- 严重问题必须给出SQL/Python修复代码示例
- 报告总长度控制在500行以内，聚焦关键问题
```

---

### INS-DATA-CLEAN-SCRIPT
**用途**: 生成数据清洗的SQL/Python脚本

```markdown
【角色】你是精通SQL和Python的数据工程师，专门处理车险数据清洗。

【任务】根据数据质量检查结果，生成自动化清洗脚本。

【问题描述】
{{从质量检查报告中复制的具体问题，例如：
- 机构代码51010501在12月出现缺失，影响1200条记录
- 交强险赔款出现负数，共35条
- 保费字段存在NULL，需补0
}}

【数据表结构】
```sql
{{粘贴实际表结构，例如：
CREATE TABLE dw_premium_detail (
  org_code VARCHAR(20),
  biz_type VARCHAR(10),
  premium DECIMAL(15,2),
  ...
)
}}
```

【清洗要求】
1. **生成两种脚本**：
   - DuckDB SQL版本（适合本地分析，200MB以内数据）
   - Python Pandas版本（适合大数据，500MB以上）

2. **脚本必须包含**：
   - 清洗前数据概况统计
   - 清洗逻辑（带注释说明业务规则）
   - 清洗后数据验证
   - 清洗日志（记录清洗了哪些字段、影响多少行）

3. **安全要求**：
   - 保留原始数据，清洗结果写入新表
   - 提供回滚方案
   - 标注不可自动清洗的问题（需人工介入）

【输出格式】
## 清洗方案摘要
- 处理问题数：X个
- 预计影响记录：Y条（占比Z%）
- 预计执行时间：M分钟

## 方案1: DuckDB SQL脚本
```sql
-- ========================================
-- 车险数据清洗脚本（DuckDB版本）
-- 生成时间：{{当前时间}}
-- 处理表：{{表名}}
-- ========================================

-- 步骤1: 创建清洗日志表
CREATE TABLE IF NOT EXISTS data_clean_log (
  clean_date TIMESTAMP,
  table_name VARCHAR,
  field_name VARCHAR,
  issue_type VARCHAR,
  affected_rows INT,
  clean_action VARCHAR
);

-- 步骤2: 清洗逻辑
-- 问题1: {{问题描述}}
UPDATE {{表名}} SET
  {{字段名}} = {{清洗逻辑，如COALESCE(字段, 默认值)}}
WHERE {{条件}};

-- 记录清洗日志
INSERT INTO data_clean_log VALUES (...);

-- 步骤3: 验证清洗结果
SELECT 
  '问题1' as issue,
  COUNT(*) as still_affected_rows
FROM {{表名}}
WHERE {{原问题条件}};
```

## 方案2: Python Pandas脚本
```python
import pandas as pd
import duckdb
from datetime import datetime

# 清洗配置
CLEAN_CONFIG = {
    'log_file': 'data_clean_log.csv',
    'backup_table': '{{表名}}_backup'
}

def clean_insurance_data(file_path: str) -> pd.DataFrame:
    """
    清洗车险数据
    
    Args:
        file_path: 数据文件路径（支持csv/xlsx/parquet）
    
    Returns:
        清洗后的DataFrame
    """
    # 步骤1: 读取数据
    print(f"📖 读取数据: {file_path}")
    df = pd.read_{{格式}}(file_path)
    print(f"原始数据: {len(df)}行 × {len(df.columns)}列")
    
    # 步骤2: 备份原始数据
    df_backup = df.copy()
    
    # 步骤3: 清洗逻辑
    clean_log = []
    
    # 问题1: {{问题描述}}
    affected = df[{{问题条件}}].shape[0]
    df.loc[{{条件}}, '{{字段}}'] = {{清洗逻辑}}
    clean_log.append({
        'timestamp': datetime.now(),
        'issue': '{{问题名}}',
        'affected_rows': affected,
        'action': '{{处理动作}}'
    })
    print(f"✅ 问题1处理完成，影响{affected}行")
    
    # ... 更多清洗逻辑
    
    # 步骤4: 保存清洗日志
    pd.DataFrame(clean_log).to_csv(CLEAN_CONFIG['log_file'], index=False)
    
    # 步骤5: 验证清洗结果
    validate_clean_result(df)
    
    return df

def validate_clean_result(df: pd.DataFrame):
    """验证清洗结果"""
    print("\n📊 清洗结果验证：")
    # 检查1: 必填字段缺失率
    for col in ['{{必填字段列表}}']:
        miss_rate = df[col].isna().sum() / len(df)
        status = "✅" if miss_rate < 0.01 else "❌"
        print(f"{status} {col}缺失率: {miss_rate:.2%}")
    
    # 检查2: 数值字段合理性
    # ...

if __name__ == '__main__':
    df_clean = clean_insurance_data('{{文件路径}}')
    df_clean.to_parquet('{{输出路径}}', index=False)
    print("🎉 清洗完成！")
```

## 不可自动清洗的问题
以下问题需要人工介入：
1. {{问题描述}} - 需要联系{{业务部门}}确认业务规则
2. ...

## 回滚方案
如果清洗结果有误，执行以下操作恢复：
```sql
-- SQL回滚
DROP TABLE {{表名}};
ALTER TABLE {{表名}}_backup RENAME TO {{表名}};
```

【质量标准】
- 代码必须可直接运行，不需要修改
- 每个清洗步骤必须有注释说明业务逻辑
- 必须包含清洗前后的数据对比统计
- 处理大数据时（>100万行）需要分批处理并显示进度
```

---

## 2️⃣ KPI计算与分析类

### INS-KPI-CALCULATOR
**用途**: 计算车险业务KPI指标

```markdown
【角色】你是车险业务分析专家，精通保险行业KPI计算规则。

【任务】根据原始数据计算以下KPI指标，并生成分析报告。

【数据范围】
- 统计周期：{{第X周 / X月 / X季度}}
- 对比周期：{{上周/上月/去年同期}}
- 统计维度：{{机构/险种/渠道/业务类型}}

【需要计算的KPI】
选择适用的指标（在[]中打✓）：

**规模类**
- [ ] 签单保费（Premium Written）
- [ ] 满期保费（Premium Earned）
- [ ] 业务量（Policy Count）

**盈利类**
- [ ] 赔付率（Loss Ratio）= 已决赔款 / 已赚保费
- [ ] 费用率（Expense Ratio）= 费用支出 / 签单保费
- [ ] 综合成本率（Combined Ratio）= 赔付率 + 费用率
- [ ] 边际贡献率（Contribution Margin）= (保费 - 赔款 - 变动费用) / 保费

**效率类**
- [ ] 人均保费（Premium per Person）
- [ ] 件均保费（Premium per Policy）
- [ ] 时间进度（Time Progress）= 当前周/总周数

**质量类**
- [ ] 赔付杠杆率（Claim Leverage）= 赔款金额 / 保费金额
- [ ] 大案率（Large Claim Ratio）= 单案赔款>5万的件数 / 总赔案件数
- [ ] 结案率（Settlement Rate）= 已决件数 / 总报案件数

【计算要求】
1. **使用Python + Pandas**：生成可复用的计算函数
2. **遵循insurance-kpi-standard技能**：确保计算公式与公司标准一致
3. **处理边界情况**：
   - 分母为0时返回None或标记"N/A"
   - 异常值（如赔付率>200%）需要标记预警
   - 缺失数据需要在结果中明确说明

【输出格式】
## KPI计算结果

### 计算函数库
```python
import pandas as pd
import numpy as np
from typing import Dict, Optional

class InsuranceKPICalculator:
    """车险KPI计算器"""
    
    def __init__(self, df: pd.DataFrame):
        """
        初始化
        
        Args:
            df: 包含以下字段的DataFrame
                - premium_written: 签单保费
                - premium_earned: 已赚保费
                - claim_paid: 已决赔款
                - expense: 费用支出
                - policy_count: 业务量
                ...
        """
        self.df = df
        self._validate_data()
    
    def _validate_data(self):
        """验证必需字段"""
        required = ['premium_written', 'premium_earned']
        missing = [f for f in required if f not in self.df.columns]
        if missing:
            raise ValueError(f"缺少必需字段: {missing}")
    
    def loss_ratio(self, group_by: Optional[list] = None) -> pd.DataFrame:
        """
        计算赔付率
        
        Args:
            group_by: 分组字段，如['org_code', 'product']
        
        Returns:
            包含赔付率的DataFrame
        """
        if group_by:
            result = self.df.groupby(group_by).apply(
                lambda x: self._calc_loss_ratio(
                    x['claim_paid'].sum(),
                    x['premium_earned'].sum()
                )
            ).reset_index(name='loss_ratio')
        else:
            lr = self._calc_loss_ratio(
                self.df['claim_paid'].sum(),
                self.df['premium_earned'].sum()
            )
            result = pd.DataFrame({'loss_ratio': [lr]})
        
        return result
    
    @staticmethod
    def _calc_loss_ratio(claim: float, premium: float) -> Optional[float]:
        """赔付率计算逻辑"""
        if premium == 0:
            return None
        lr = claim / premium
        # 异常值检测
        if lr > 2.0:
            print(f"⚠️ 赔付率异常: {lr:.2%}，请核查数据")
        return lr
    
    # ... 其他KPI计算方法
    
    def calculate_all(self, group_by: list) -> pd.DataFrame:
        """一次性计算所有KPI"""
        results = []
        
        kpis = [
            ('loss_ratio', self.loss_ratio),
            ('expense_ratio', self.expense_ratio),
            # ... 添加所有勾选的KPI
        ]
        
        for kpi_name, kpi_func in kpis:
            df_kpi = kpi_func(group_by)
            results.append(df_kpi)
        
        # 合并所有KPI
        final = results[0]
        for df in results[1:]:
            final = final.merge(df, on=group_by, how='outer')
        
        return final

# 使用示例
if __name__ == '__main__':
    # 读取数据
    df = pd.read_csv('{{数据文件路径}}')
    
    # 初始化计算器
    calc = InsuranceKPICalculator(df)
    
    # 计算KPI（按机构+险种分组）
    result = calc.calculate_all(group_by=['org_code', 'product'])
    
    # 保存结果
    result.to_excel('kpi_result.xlsx', index=False)
    print("✅ KPI计算完成")
```

### 计算结果摘要
| 指标 | 全公司 | {{维度1}} | {{维度2}} | 同比 | 环比 |
|------|--------|----------|----------|------|------|
| 赔付率 | {{X%}} | {{Y%}} | {{Z%}} | {{+/-A%}} | {{+/-B%}} |
| 费用率 | ... | ... | ... | ... | ... |
| 综合成本率 | ... | ... | ... | ... | ... |

### 异常预警
🔴 以下指标超出正常范围，需要关注：
1. {{机构A}}的{{指标B}}达到{{C%}}，超出阈值{{D%}}
   - 可能原因：{{分析}}
   - 建议措施：{{建议}}

### 趋势分析
📈 核心发现：
1. {{发现1}}：数据支撑{{具体数字}}
2. {{发现2}}：对比历史{{变化趋势}}

【质量标准】
- 计算结果必须可复现（提供完整数据+代码）
- 异常值必须标记并给出可能原因
- 同比环比计算必须使用正确的对比期
- 代码必须包含单元测试（至少3个test case）
```

---

### INS-MULTIDIM-ANALYSIS
**用途**: 多维度交叉分析（基于insurance-multidim-analysis技能）

```markdown
【角色】你是车险多维度分析专家，擅长发现数据中的隐藏模式。

【任务】对车险数据进行多维度交叉分析，识别高风险业务组合。

【分析维度】（最多选3个维度组合）
可选维度：
- 机构（org）
- 业务类型（biz_type）：新保/续保
- 险种（product）：交强险/商业险/其他
- 渠道（channel）：直销/代理/电销
- 车辆类型（vehicle_type）：家用车/营运车/货车
- 时间（period）：周/月

选择的维度组合：{{维度1}} × {{维度2}} × {{维度3}}

【分析指标】
- 主指标：{{赔付杠杆率 / 边际贡献率 / 综合成本率}}
- 辅助指标：{{保费规模 / 业务量 / 赔案件数}}

【分析目标】
1. 识别"小保费大赔付"的杀手业务
2. 发现赔付杠杆率>1.5的高风险组合
3. 计算周环比变化，预警恶化趋势

【数据文件】
```
{{上传CSV/Excel文件，或提供DuckDB查询SQL}}
```

【输出格式】
## 多维度分析报告

### 1. 数据概览
- 数据范围：{{周期}}
- 分析粒度：{{维度组合}}
- 总业务组合数：{{X个}}（有数据的组合）
- 分析时间：{{YYYY-MM-DD}}

### 2. 高风险业务识别（Top 10）

#### 杀手业务清单
| 排名 | {{维度1}} | {{维度2}} | {{维度3}} | 保费 | 赔款 | 杠杆率 | 风险等级 |
|------|-----------|-----------|-----------|------|------|--------|----------|
| 1 | {{值}} | {{值}} | {{值}} | {{X万}} | {{Y万}} | {{Z}} | 🔴极高 |
| 2 | ... | ... | ... | ... | ... | ... | 🟠高 |
| ... |

**风险等级定义**：
- 🔴 极高：杠杆率>2.0 或 赔款>保费×2
- 🟠 高：杠杆率1.5-2.0
- 🟡 中：杠杆率1.0-1.5
- 🟢 低：杠杆率<1.0

### 3. 趋势分析

#### 周环比恶化Top 5
| 业务组合 | 本周杠杆率 | 上周杠杆率 | 变化 | 保费占比 | 建议措施 |
|---------|------------|------------|------|----------|----------|
| {{组合A}} | {{2.3}} | {{1.5}} | 🔺+0.8 | {{5%}} | {{立即暂停承保/提高费率}} |

### 4. Python分析脚本
```python
import pandas as pd
import duckdb

def multidim_analysis(
    data_path: str,
    dimensions: list,
    metric: str = 'leverage_ratio'
) -> pd.DataFrame:
    """
    多维度交叉分析
    
    Args:
        data_path: 数据文件路径
        dimensions: 分析维度列表，如['org', 'product', 'channel']
        metric: 主指标，可选leverage_ratio/loss_ratio/contribution_margin
    
    Returns:
        分析结果DataFrame
    """
    # 读取数据
    conn = duckdb.connect()
    df = conn.execute(f"""
        SELECT 
            {', '.join(dimensions)},
            SUM(premium) as total_premium,
            SUM(claim) as total_claim,
            COUNT(*) as policy_count,
            SUM(claim) / NULLIF(SUM(premium), 0) as leverage_ratio,
            SUM(premium) - SUM(claim) as margin
        FROM read_csv_auto('{data_path}')
        GROUP BY {', '.join(dimensions)}
        HAVING SUM(premium) > 0  -- 排除无保费的组合
        ORDER BY leverage_ratio DESC
    """).df()
    
    # 风险分级
    df['risk_level'] = pd.cut(
        df['leverage_ratio'],
        bins=[0, 1.0, 1.5, 2.0, float('inf')],
        labels=['🟢低', '🟡中', '🟠高', '🔴极高']
    )
    
    # 计算保费占比
    df['premium_pct'] = df['total_premium'] / df['total_premium'].sum()
    
    # 识别杀手业务（保费<10万 且 杠杆率>1.5）
    df['is_killer'] = (
        (df['total_premium'] < 100000) & 
        (df['leverage_ratio'] > 1.5)
    )
    
    return df

def compare_period(df_current: pd.DataFrame, df_previous: pd.DataFrame, 
                   dimensions: list) -> pd.DataFrame:
    """周环比分析"""
    merged = df_current.merge(
        df_previous,
        on=dimensions,
        suffixes=('_current', '_previous'),
        how='outer'
    )
    
    merged['leverage_change'] = (
        merged['leverage_ratio_current'] - 
        merged['leverage_ratio_previous']
    )
    
    # 只保留恶化的组合（杠杆率上升>0.3）
    deteriorated = merged[merged['leverage_change'] > 0.3].copy()
    deteriorated = deteriorated.sort_values('leverage_change', ascending=False)
    
    return deteriorated

# 使用示例
if __name__ == '__main__':
    # 本周数据分析
    df_week50 = multidim_analysis(
        data_path='week50_data.csv',
        dimensions=['org_code', 'product', 'biz_type']
    )
    
    # 上周数据（用于对比）
    df_week49 = multidim_analysis(
        data_path='week49_data.csv',
        dimensions=['org_code', 'product', 'biz_type']
    )
    
    # 周环比分析
    df_compare = compare_period(df_week50, df_week49, 
                                 dimensions=['org_code', 'product', 'biz_type'])
    
    # 输出结果
    print("=== 高风险业务Top 10 ===")
    print(df_week50.head(10)[['org_code', 'product', 'leverage_ratio', 'risk_level']])
    
    print("\n=== 周环比恶化Top 5 ===")
    print(df_compare.head(5))
    
    # 保存Excel（带格式）
    with pd.ExcelWriter('multidim_analysis.xlsx', engine='openpyxl') as writer:
        df_week50.to_excel(writer, sheet_name='本周分析', index=False)
        df_compare.to_excel(writer, sheet_name='周环比', index=False)
```

### 5. 业务建议
基于分析结果，建议采取以下措施：

**立即行动（本周内）**：
1. {{业务组合A}}：{{具体措施，如暂停承保/提高费率20%/增加风控审核}}
2. ...

**中期优化（本月内）**：
1. {{分析发现的系统性问题}}
2. {{建议的业务规则调整}}

**长期策略**：
1. {{基于趋势的战略建议}}

【质量标准】
- 必须使用DuckDB或Pandas处理数据，展示完整代码
- 杀手业务识别必须同时考虑：规模（保费）+ 风险（杠杆率）
- 周环比计算必须使用同一维度组合（确保可比性）
- 业务建议必须具体到：哪个业务组合 + 什么措施 + 预期效果
```

---

## 3️⃣ 数据可视化类

### VIZ-INSURANCE-DASHBOARD
**用途**: 生成车险业务可视化图表

```markdown
【角色】你是数据可视化专家，精通ECharts和保险业务指标呈现。

【任务】为以下车险数据生成交互式可视化图表。

【数据文件】
{{上传CSV/Excel或粘贴数据样例}}

【图表需求】
选择需要的图表类型（可多选）：
- [ ] **四象限图**：用于分析"保费规模 vs 赔付率"
- [ ] **气泡图**：三维展示"保费 × 赔款 × 业务量"
- [ ] **折线图**：时间序列趋势（周度/月度）
- [ ] **柱状图**：对比分析（机构/险种排名）
- [ ] **雷达图**：多指标综合评价
- [ ] **桑基图**：业务流向分析
- [ ] **热力图**：多维度交叉矩阵

【呈现要求】
1. **使用ECharts 5+**：生成独立HTML文件，可在浏览器直接打开
2. **交互功能**：
   - Tooltip显示详细数据
   - Legend点击筛选
   - DataZoom区域缩放（时间序列图）
   - 点击图表元素跳转详情（如点击机构跳转到该机构明细）
3. **配色方案**：使用华安保险品牌色（红色#C8102E为主色）
4. **响应式设计**：适配桌面和投影仪（16:9）

【输出格式】
## 可视化方案

### 图表1: {{图表名称，如"保费-赔付率四象限图"}}

**业务目标**: {{用这个图表发现什么问题}}

**设计说明**:
- X轴：{{指标A}}，取值范围{{min-max}}
- Y轴：{{指标B}}，取值范围{{min-max}}
- 象限划分：以{{阈值1}}和{{阈值2}}为分界线
- 颜色编码：🟢优秀 / 🟡一般 / 🟠预警 / 🔴高风险

**完整HTML代码**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{图表标题}}</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            font-family: 'Microsoft YaHei', sans-serif; 
            background: #f5f5f5;
        }
        #main { 
            width: 1600px; 
            height: 900px; 
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .info {
            margin-bottom: 10px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="info">
        <h2>{{图表标题}}</h2>
        <p>数据周期：{{周期}} | 生成时间：{{时间}}</p>
    </div>
    <div id="main"></div>
    
    <script>
        // 数据准备
        const data = [
            // 从CSV转换的数据，格式：
            // { name: '机构A', premium: 1000, loss_ratio: 0.65, count: 500 }
            {{自动从上传的数据文件提取并转换为JSON}}
        ];
        
        // 初始化图表
        const chart = echarts.init(document.getElementById('main'));
        
        // 配置项
        const option = {
            title: {
                text: '{{图表标题}}',
                subtext: '{{副标题，如"数据来源：核心系统 DW_PREMIUM_DETAIL"}}',
                left: 'center',
                textStyle: {
                    color: '#333',
                    fontSize: 24
                }
            },
            
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    const d = params.data;
                    return `
                        <b>${d.name}</b><br/>
                        保费：${(d.premium/10000).toFixed(2)}万<br/>
                        赔付率：${(d.loss_ratio*100).toFixed(2)}%<br/>
                        业务量：${d.count}件
                    `;
                },
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderColor: '#C8102E',
                borderWidth: 1
            },
            
            // 四象限分界线
            visualMap: {
                show: false,
                dimension: 1, // 对应loss_ratio
                pieces: [
                    { min: 0, max: 0.7, color: '#52c41a' },  // 优秀
                    { min: 0.7, max: 0.85, color: '#faad14' }, // 一般
                    { min: 0.85, max: 1.0, color: '#ff7a45' }, // 预警
                    { min: 1.0, color: '#f5222d' }  // 高风险
                ]
            },
            
            xAxis: {
                type: 'value',
                name: '保费规模（万元）',
                nameLocation: 'middle',
                nameGap: 30,
                axisLine: { lineStyle: { color: '#999' } },
                splitLine: { lineStyle: { type: 'dashed' } }
            },
            
            yAxis: {
                type: 'value',
                name: '赔付率',
                nameLocation: 'middle',
                nameGap: 40,
                axisLabel: {
                    formatter: '{value}%'
                },
                axisLine: { lineStyle: { color: '#999' } },
                splitLine: { lineStyle: { type: 'dashed' } },
                // 添加预警线
                markLine: {
                    data: [
                        { yAxis: 0.7, lineStyle: { color: '#faad14', type: 'solid' }, label: { formatter: '监管线 70%' } },
                        { yAxis: 0.85, lineStyle: { color: '#ff7a45', type: 'solid' }, label: { formatter: '预警线 85%' } }
                    ],
                    symbol: 'none'
                }
            },
            
            series: [{
                type: 'scatter',
                symbolSize: function(data) {
                    // 气泡大小对应业务量
                    return Math.sqrt(data[2]) / 5;  // data[2]是count
                },
                data: data.map(d => [
                    d.premium / 10000,  // X: 保费（万元）
                    d.loss_ratio * 100, // Y: 赔付率（%）
                    d.count,            // 气泡大小
                    d.name              // 用于tooltip
                ]),
                label: {
                    show: true,
                    formatter: '{@[3]}',  // 显示机构名
                    position: 'top',
                    fontSize: 10
                },
                emphasis: {
                    focus: 'series',
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                }
            }]
        };
        
        chart.setOption(option);
        
        // 响应式
        window.addEventListener('resize', () => {
            chart.resize();
        });
        
        // 点击事件（可选）
        chart.on('click', function(params) {
            console.log('点击了:', params.data[3]);
            // 可以在这里添加跳转逻辑，如打开详情页
        });
    </script>
</body>
</html>
```

**预览效果**:
{{如果可能，生成图表截图或描述视觉效果}}

**使用说明**:
1. 保存上述代码为`chart1.html`
2. 用浏览器打开即可查看
3. 右键"另存为图片"可导出PNG

---

### 图表2: {{其他选中的图表类型}}
{{按照同样格式输出}}

---

## 可视化最佳实践建议

### 针对不同场景的图表选择
1. **监控日常运营**：柱状图 + 折线图组合
2. **发现业务问题**：四象限图 + 热力图
3. **汇报领导**：气泡图 + 雷达图（视觉冲击力强）
4. **分析业务结构**：桑基图 + 饼图

### 配色方案
```javascript
// 华安保险标准色板
const HUAAN_COLORS = {
    primary: '#C8102E',      // 主红色
    secondary: '#003087',    // 深蓝
    success: '#52c41a',      // 绿色（优秀）
    warning: '#faad14',      // 橙色（预警）
    danger: '#f5222d',       // 红色（危险）
    neutral: ['#91c7ae','#749f83','#ca8622','#bda29a'] // 中性色
};
```

### 交互功能清单
- ✅ Tooltip悬浮提示
- ✅ Legend图例筛选
- ✅ DataZoom区域缩放
- ✅ 点击事件（可扩展）
- ✅ 数据高亮（hover效果）
- ⚠️ 数据导出（需要额外配置）
- ⚠️ 实时刷新（需要后端支持）

【质量标准】
- HTML文件必须可以直接在浏览器打开，无需额外依赖
- 图表必须包含标题、坐标轴标签、单位
- 数据必须从用户上传的文件自动提取（不能是硬编码假数据）
- 交互功能必须可用（tooltip、legend等）
- 配色必须符合华安保险品牌规范
```

---

## 4️⃣ 报告生成类

### RPT-WEEKLY-AUTO
**用途**: 自动生成车险周报PPT（基于insurance-weekly-report技能）

```markdown
【角色】你是华安保险经营分析专家，精通麦肯锡风格的商务报告制作。

【任务】根据本周车险数据，自动生成董事会级别的周报PPT。

【数据输入】
方式1: 上传Excel/CSV数据文件
方式2: 提供DuckDB数据库连接信息
方式3: 粘贴汇总数据（格式见下）

**数据格式要求**:
```
必需字段：
- 机构代码(org_code)
- 机构名称(org_name)
- 险种(product): 交强险/商业险
- 业务类型(biz_type): 新保/续保
- 签单保费(premium_written)
- 已赚保费(premium_earned)
- 已决赔款(claim_paid)
- 费用支出(expense)
- 业务量(policy_count)
- 统计周期(period): 如"2024-W50"
```

【报告规格】
- 页数：12-13页
- 风格：麦肯锡咨询风格（简洁、数据驱动、问题导向）
- 受众：董事会成员、高管
- 格式：PPTX（使用pptx技能）

【报告结构】
1. **封面页**：周报标题 + 周期 + 生成日期
2. **目录页**：5大板块概览
3. **经营概览**：核心KPI仪表盘（4×4网格）
4. **保费进度**：时间进度vs完成进度对比
5. **成本分析**：赔付率+费用率+综合成本率
6. **损失暴露**：高风险业务识别（四象限图）
7. **费用支出**：费用结构和效率分析
8. **机构排名**：Top 10 / Bottom 10
9. **险种分析**：产品结构和盈利性
10. **问题诊断**：本周发现的3-5个核心问题
11. **行动建议**：针对性改进措施
12. **附录**：数据说明和计算口径

【可视化要求】
- 优先使用：四象限图、气泡图、柱状图、子弹图
- 颜色编码：🟢优秀(绿) / 🟡达标(黄) / 🟠预警(橙) / 🔴风险(红)
- 数据标注：关键数字必须标注（如同比/环比变化）

【输出格式】
## 周报生成方案

### 第1步：数据预处理
```python
import pandas as pd
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN

def prepare_weekly_data(file_path: str, week: str) -> dict:
    """
    预处理周报数据
    
    Args:
        file_path: 原始数据文件路径
        week: 统计周，如"2024-W50"
    
    Returns:
        结构化数据字典，包含：
        - kpi_grid: 4×4 KPI网格数据
        - loss_exposure: 损失暴露四象限数据
        - org_ranking: 机构排名数据
        - issues: 识别的问题清单
    """
    # 读取数据
    df = pd.read_csv(file_path)
    df_week = df[df['period'] == week]
    
    # 1. 计算KPI网格（16个指标）
    kpi_grid = {
        # 第1行：规模指标
        'premium_written': df_week['premium_written'].sum(),
        'premium_yoy': calculate_yoy(df_week, df_lastyear, 'premium_written'),
        'policy_count': df_week['policy_count'].sum(),
        'avg_premium': df_week['premium_written'].sum() / df_week['policy_count'].sum(),
        
        # 第2行：盈利指标
        'loss_ratio': df_week['claim_paid'].sum() / df_week['premium_earned'].sum(),
        'expense_ratio': df_week['expense'].sum() / df_week['premium_written'].sum(),
        'combined_ratio': loss_ratio + expense_ratio,
        'margin': df_week['premium_written'].sum() - df_week['claim_paid'].sum() - df_week['expense'].sum(),
        
        # 第3行：效率指标
        'time_progress': current_week / 52,
        'premium_progress': df_week['premium_written'].sum() / annual_target,
        'premium_gap': annual_target - df_week['premium_written'].sum(),
        'required_weekly_premium': premium_gap / remaining_weeks,
        
        # 第4行：质量指标
        'large_claim_ratio': (df_week['claim_paid'] > 50000).sum() / len(df_week),
        'new_biz_ratio': df_week[df_week['biz_type']=='新保']['policy_count'].sum() / df_week['policy_count'].sum(),
        'channel_diversity': df_week['channel'].nunique(),
        'org_coverage': df_week['org_code'].nunique() / total_orgs
    }
    
    # 2. 损失暴露分析（四象限）
    loss_exposure = df_week.groupby(['org_code', 'product']).agg({
        'premium_written': 'sum',
        'claim_paid': 'sum',
        'policy_count': 'sum'
    }).reset_index()
    loss_exposure['loss_ratio'] = loss_exposure['claim_paid'] / loss_exposure['premium_earned']
    loss_exposure['quadrant'] = assign_quadrant(loss_exposure)
    
    # 3. 识别问题
    issues = []
    # 问题1: 赔付率异常高的业务
    high_loss = loss_exposure[loss_exposure['loss_ratio'] > 1.5]
    if len(high_loss) > 0:
        issues.append({
            'type': '赔付异常',
            'severity': '高',
            'description': f"{len(high_loss)}个业务组合赔付率>150%",
            'affected': high_loss[['org_code', 'product', 'loss_ratio']].to_dict('records'),
            'action': '立即暂停高风险业务承保，调整费率'
        })
    
    # ... 更多问题识别逻辑
    
    return {
        'kpi_grid': kpi_grid,
        'loss_exposure': loss_exposure,
        'org_ranking': org_ranking,
        'issues': issues,
        'metadata': {
            'week': week,
            'generated_at': datetime.now(),
            'data_source': file_path
        }
    }
```

### 第2步：生成PPT（使用pptx技能）
```python
def create_weekly_report(data: dict, output_path: str):
    """
    创建周报PPT
    
    Args:
        data: 预处理后的数据（来自prepare_weekly_data）
        output_path: PPT输出路径
    """
    prs = Presentation()
    prs.slide_width = Inches(16)  # 16:9宽屏
    prs.slide_height = Inches(9)
    
    # 第1页：封面
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])  # 空白布局
    # ... 添加标题、周期、Logo等
    
    # 第2页：目录
    # ...
    
    # 第3页：经营概览（4×4 KPI网格）
    slide3 = prs.slides.add_slide(prs.slide_layouts[5])
    title = slide3.shapes.title
    title.text = "经营概览：核心指标一览"
    
    # 创建KPI表格
    rows, cols = 4, 4
    left, top = Inches(1), Inches(2)
    width, height = Inches(14), Inches(5)
    table = slide3.shapes.add_table(rows, cols, left, top, width, height).table
    
    # 填充数据（示例：第1行规模指标）
    kpis = data['kpi_grid']
    table.cell(0, 0).text = f"签单保费\n{kpis['premium_written']/1e8:.2f}亿"
    table.cell(0, 1).text = f"同比增长\n{kpis['premium_yoy']:.1f}%"
    # ... 填充所有16个单元格
    
    # 格式化表格
    for row in range(rows):
        for col in range(cols):
            cell = table.cell(row, col)
            cell.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
            cell.text_frame.paragraphs[0].font.size = Pt(18)
            # 根据指标值设置背景色（绿/黄/红）
            set_cell_color(cell, get_indicator_color(cell.text))
    
    # 第4页：损失暴露（嵌入ECharts图表为图片）
    # 先用ECharts生成图表，保存为PNG，再插入PPT
    chart_path = generate_loss_exposure_chart(data['loss_exposure'])
    slide4 = prs.slides.add_slide(prs.slide_layouts[5])
    slide4.shapes.title.text = "损失暴露：高风险业务识别"
    slide4.shapes.add_picture(chart_path, Inches(2), Inches(2), width=Inches(12))
    
    # ... 生成其余页面
    
    # 第10页：问题诊断
    slide10 = prs.slides.add_slide(prs.slide_layouts[1])
    slide10.shapes.title.text = "本周发现的核心问题"
    
    content = slide10.placeholders[1].text_frame
    for i, issue in enumerate(data['issues'], 1):
        p = content.add_paragraph()
        p.text = f"{i}. {issue['type']}（{issue['severity']}）"
        p.level = 0
        p.font.size = Pt(20)
        
        # 问题详情
        p_detail = content.add_paragraph()
        p_detail.text = f"   {issue['description']}"
        p_detail.level = 1
        p_detail.font.size = Pt(16)
        
        # 建议措施
        p_action = content.add_paragraph()
        p_action.text = f"   ➤ {issue['action']}"
        p_action.level = 1
        p_action.font.size = Pt(16)
        p_action.font.color.rgb = RGBColor(200, 16, 46)  # 华安红
    
    # 保存PPT
    prs.save(output_path)
    print(f"✅ 周报已生成: {output_path}")

# 完整流程
if __name__ == '__main__':
    # 1. 数据预处理
    data = prepare_weekly_data(
        file_path='{{数据文件路径}}',
        week='2024-W50'
    )
    
    # 2. 生成PPT
    create_weekly_report(
        data=data,
        output_path='华安车险周报_W50.pptx'
    )
```

### 第3步：质量检查清单
生成PPT后，检查以下要点：
- [ ] 封面信息是否正确（周期、日期）
- [ ] KPI数据是否与原始数据一致（抽查3个指标）
- [ ] 图表是否清晰可读（字号、颜色、标签）
- [ ] 问题诊断是否准确（逻辑自洽、数据支撑）
- [ ] 行动建议是否具体可执行
- [ ] 页面排版是否美观（对齐、字体、配色）

### 使用说明
1. 准备数据文件（CSV格式，包含必需字段）
2. 运行 `prepare_weekly_data` 进行数据预处理
3. 运行 `create_weekly_report` 生成PPT
4. 用PowerPoint打开检查，必要时手动调整
5. 导出PDF版本用于邮件发送

【质量标准】
- PPT必须符合麦肯锡咨询风格：简洁、数据驱动、结论先行
- 每页必须有明确的"So What"（这页想说什么）
- 数据可视化必须遵循"5秒法则"（5秒内能看懂核心信息）
- 问题诊断必须有数据支撑，不能主观臆断
- 行动建议必须SMART（具体、可衡量、可实现、相关、有时限）
```

---

## 5️⃣ 异常检测与预警类

### INS-ANOMALY-DETECTOR
**用途**: 自动检测车险数据异常

```markdown
【角色】你是车险风险预警专家，擅长从海量数据中识别异常模式。

【任务】对车险数据进行异常检测，生成预警报告。

【检测范围】
- 数据周期：{{周/月/季度}}
- 检测维度：{{机构/险种/渠道/业务类型}}
- 对比基准：{{历史均值/行业基准/设定阈值}}

【异常类型】
选择要检测的异常（可多选）：
- [ ] **突增突降**：指标相比上期变化>30%
- [ ] **异常值**：超出3σ范围
- [ ] **结构异常**：业务结构突变（如某险种占比从20%→5%）
- [ ] **趋势异常**：连续3期单调上升/下降
- [ ] **关联异常**：保费vs赔款、保费vs业务量等指标不匹配
- [ ] **零值异常**：应有数据的维度组合为0

【检测算法】
- 统计方法：3σ、IQR（四分位距）
- 时间序列：移动平均、季节性分解
- 机器学习（可选）：Isolation Forest、DBSCAN

【数据输入】
{{上传数据文件或提供查询SQL}}

【输出格式】
## 异常检测报告

### 执行概要
- 检测时间：{{YYYY-MM-DD HH:mm}}
- 数据范围：{{周期}}
- 检测记录数：{{X万条}}
- 发现异常数：{{Y个}}（占比{{Z%}}）
- 预警级别分布：🔴高{{A个}} / 🟠中{{B个}} / 🟡低{{C个}}

### 高优先级异常（Top 5）

#### 异常1: {{类型}} - {{描述}}
- **预警级别**: 🔴高危
- **影响范围**: {{机构A}}的{{险种B}}
- **异常详情**:
  - 当前值：{{X}}
  - 历史均值：{{Y}}
  - 偏离程度：{{+/-Z%}}（{{N个标准差}}）
- **时间趋势**:
  ```
  Week 48: 100
  Week 49: 105 (+5%)
  Week 50: 350 (+233%) ← 异常
  ```
- **可能原因**:
  1. {{假设1，如大案理赔}}
  2. {{假设2，如数据录入错误}}
  3. {{假设3，如业务规则变更}}
- **建议措施**:
  1. {{立即行动，如核查原始数据}}
  2. {{中期措施，如调整业务策略}}

#### 异常2: ...

---

### Python检测脚本
```python
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.ensemble import IsolationForest

class InsuranceAnomalyDetector:
    """车险异常检测器"""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.anomalies = []
    
    def detect_outliers_3sigma(self, column: str, group_by: list = None):
        """
        3σ异常检测
        
        Args:
            column: 检测字段，如'premium', 'loss_ratio'
            group_by: 分组字段，如['org_code']
        """
        if group_by:
            results = []
            for name, group in self.df.groupby(group_by):
                mean = group[column].mean()
                std = group[column].std()
                
                # 识别异常（|value - mean| > 3σ）
                group['z_score'] = (group[column] - mean) / std
                outliers = group[np.abs(group['z_score']) > 3]
                
                if len(outliers) > 0:
                    results.append({
                        'type': '统计异常(3σ)',
                        'group': name,
                        'column': column,
                        'count': len(outliers),
                        'details': outliers[[column, 'z_score']].to_dict('records')
                    })
            
            self.anomalies.extend(results)
            return results
        else:
            # 全局检测
            mean = self.df[column].mean()
            std = self.df[column].std()
            self.df['z_score'] = (self.df[column] - mean) / std
            outliers = self.df[np.abs(self.df['z_score']) > 3]
            return outliers
    
    def detect_sudden_change(self, column: str, threshold: float = 0.3):
        """
        检测突增突降（环比变化>threshold）
        
        Args:
            column: 检测字段
            threshold: 阈值，默认30%
        """
        # 确保数据按时间排序
        df_sorted = self.df.sort_values('period')
        
        # 计算环比变化
        df_sorted['prev_value'] = df_sorted.groupby('org_code')[column].shift(1)
        df_sorted['change_rate'] = (
            (df_sorted[column] - df_sorted['prev_value']) / 
            df_sorted['prev_value']
        )
        
        # 识别异常变化
        sudden_changes = df_sorted[
            np.abs(df_sorted['change_rate']) > threshold
        ].copy()
        
        if len(sudden_changes) > 0:
            for _, row in sudden_changes.iterrows():
                self.anomalies.append({
                    'type': '突增突降',
                    'severity': 'high' if abs(row['change_rate']) > 0.5 else 'medium',
                    'org': row['org_code'],
                    'period': row['period'],
                    'column': column,
                    'current': row[column],
                    'previous': row['prev_value'],
                    'change_rate': row['change_rate']
                })
        
        return sudden_changes
    
    def detect_relationship_anomaly(self):
        """检测关联异常（如保费vs赔款不匹配）"""
        # 计算赔付率
        self.df['loss_ratio'] = self.df['claim_paid'] / self.df['premium_earned']
        
        # 异常组合检测
        anomalies = []
        
        # 1. 零保费有赔款
        zero_prem_claim = self.df[
            (self.df['premium_written'] == 0) & 
            (self.df['claim_paid'] > 0)
        ]
        if len(zero_prem_claim) > 0:
            anomalies.append({
                'type': '关联异常',
                'pattern': '零保费有赔款',
                'count': len(zero_prem_claim),
                'affected': zero_prem_claim[['org_code', 'product', 'claim_paid']].to_dict('records')
            })
        
        # 2. 赔付率异常高（>200%）
        ultra_high_loss = self.df[self.df['loss_ratio'] > 2.0]
        if len(ultra_high_loss) > 0:
            anomalies.append({
                'type': '关联异常',
                'pattern': '赔付率>200%',
                'count': len(ultra_high_loss),
                'affected': ultra_high_loss[['org_code', 'product', 'loss_ratio']].to_dict('records')
            })
        
        # 3. 保费vs业务量不匹配（件均保费异常）
        self.df['avg_premium'] = self.df['premium_written'] / self.df['policy_count']
        avg_prem_outliers = self.detect_outliers_3sigma('avg_premium')
        if len(avg_prem_outliers) > 0:
            anomalies.append({
                'type': '关联异常',
                'pattern': '件均保费异常',
                'count': len(avg_prem_outliers),
                'affected': avg_prem_outliers[['org_code', 'avg_premium']].to_dict('records')
            })
        
        self.anomalies.extend(anomalies)
        return anomalies
    
    def detect_trend_anomaly(self, column: str, window: int = 3):
        """
        检测趋势异常（连续N期单调变化）
        
        Args:
            column: 检测字段
            window: 窗口大小，默认3期
        """
        trends = []
        
        for org, group in self.df.groupby('org_code'):
            group_sorted = group.sort_values('period')
            values = group_sorted[column].values
            
            if len(values) < window:
                continue
            
            # 检测连续上升/下降
            for i in range(len(values) - window + 1):
                window_values = values[i:i+window]
                
                # 连续上升
                if all(window_values[j] < window_values[j+1] for j in range(window-1)):
                    trends.append({
                        'type': '趋势异常',
                        'pattern': f'连续{window}期上升',
                        'org': org,
                        'column': column,
                        'periods': group_sorted['period'].iloc[i:i+window].tolist(),
                        'values': window_values.tolist(),
                        'total_change': (window_values[-1] - window_values[0]) / window_values[0]
                    })
                
                # 连续下降
                if all(window_values[j] > window_values[j+1] for j in range(window-1)):
                    trends.append({
                        'type': '趋势异常',
                        'pattern': f'连续{window}期下降',
                        'org': org,
                        'column': column,
                        'periods': group_sorted['period'].iloc[i:i+window].tolist(),
                        'values': window_values.tolist(),
                        'total_change': (window_values[-1] - window_values[0]) / window_values[0]
                    })
        
        self.anomalies.extend(trends)
        return trends
    
    def generate_report(self) -> dict:
        """生成异常检测报告"""
        # 按严重程度排序
        severity_order = {'high': 1, 'medium': 2, 'low': 3}
        sorted_anomalies = sorted(
            self.anomalies,
            key=lambda x: severity_order.get(x.get('severity', 'low'), 3)
        )
        
        # 生成摘要
        summary = {
            'total_anomalies': len(self.anomalies),
            'high_severity': len([a for a in self.anomalies if a.get('severity') == 'high']),
            'medium_severity': len([a for a in self.anomalies if a.get('severity') == 'medium']),
            'low_severity': len([a for a in self.anomalies if a.get('severity') == 'low']),
            'anomalies_by_type': pd.Series([a['type'] for a in self.anomalies]).value_counts().to_dict()
        }
        
        return {
            'summary': summary,
            'anomalies': sorted_anomalies[:10],  # Top 10
            'full_list': sorted_anomalies
        }

# 使用示例
if __name__ == '__main__':
    # 读取数据
    df = pd.read_csv('{{数据文件路径}}')
    
    # 初始化检测器
    detector = InsuranceAnomalyDetector(df)
    
    # 执行检测
    print("🔍 开始异常检测...")
    
    # 1. 3σ检测
    detector.detect_outliers_3sigma('premium_written', group_by=['org_code'])
    detector.detect_outliers_3sigma('loss_ratio', group_by=['org_code'])
    
    # 2. 突增突降检测
    detector.detect_sudden_change('premium_written', threshold=0.3)
    detector.detect_sudden_change('claim_paid', threshold=0.3)
    
    # 3. 关联异常检测
    detector.detect_relationship_anomaly()
    
    # 4. 趋势异常检测
    detector.detect_trend_anomaly('loss_ratio', window=3)
    
    # 生成报告
    report = detector.generate_report()
    
    print(f"\n✅ 检测完成！")
    print(f"发现异常：{report['summary']['total_anomalies']}个")
    print(f"  🔴高危：{report['summary']['high_severity']}个")
    print(f"  🟠中危：{report['summary']['medium_severity']}个")
    print(f"  🟡低危：{report['summary']['low_severity']}个")
    
    # 输出Top 5异常
    print("\n📊 Top 5异常：")
    for i, anomaly in enumerate(report['anomalies'][:5], 1):
        print(f"{i}. {anomaly['type']} - {anomaly.get('pattern', anomaly.get('column'))}")
    
    # 保存完整报告
    pd.DataFrame(report['full_list']).to_excel('anomaly_report.xlsx', index=False)
```

### 预警规则配置
可以根据业务需要调整以下阈值：
```python
ANOMALY_THRESHOLDS = {
    'sudden_change': 0.3,      # 环比变化>30%触发
    'loss_ratio_high': 1.5,    # 赔付率>150%预警
    'loss_ratio_ultra': 2.0,   # 赔付率>200%高危
    'expense_ratio_high': 0.35,# 费用率>35%（监管红线）
    'combined_ratio_high': 1.0,# 综合成本率>100%（亏损）
    'z_score': 3,              # 3σ标准
    'trend_window': 3          # 连续3期趋势
}
```

### 误报处理
异常检测可能存在误报，建议：
1. **人工复核**：高危异常必须人工确认
2. **白名单机制**：已知合理异常（如促销活动）加入白名单
3. **上下文分析**：结合业务背景判断（如节假日因素）
4. **反馈循环**：记录误报，优化算法参数

【质量标准】
- 检测算法必须有业务解释性（不能是黑盒模型）
- 每个异常必须标注严重程度和置信度
- 必须提供可能原因和建议措施
- 代码必须可复用（支持不同数据源和周期）
- 检测速度：100万条记录<30秒
```

---

## 6️⃣ 使用建议与最佳实践

### 提示词使用流程
```
1. 明确任务目标 → 选择合适提示词
2. 准备数据文件 → 确保格式正确
3. 填充占位符 → 替换{{...}}为实际内容
4. 复制到AI对话框 → 等待生成结果
5. 验证输出质量 → 对照质量标准检查
6. 迭代优化 → 根据结果调整提示词
```

### 常见问题处理

**Q1: AI生成的代码无法运行怎么办？**
A: 
1. 检查数据文件路径是否正确
2. 确认Python环境已安装必需库（pandas, duckdb等）
3. 查看报错信息，复制给AI让其修复
4. 分步执行代码，定位出错位置

**Q2: 生成的图表不符合预期？**
A:
1. 在提示词中明确图表类型和配色要求
2. 提供具体的视觉示例（截图或描述）
3. 调整数据格式，确保与图表要求匹配

**Q3: KPI计算结果与手工计算不一致？**
A:
1. 对比计算公式是否一致（特别是分母为0的处理）
2. 检查数据筛选条件（时间范围、机构范围等）
3. 查看insurance-kpi-standard技能定义的标准公式

**Q4: 数据清洗脚本处理大文件很慢？**
A:
1. 使用DuckDB代替Pandas（500MB以上数据）
2. 分批处理，每次处理10万行
3. 删除不必要的列，减少内存占用

### 性能优化建议

**数据处理**:
- <200MB: 使用Pandas
- 200MB-2GB: 使用DuckDB
- >2GB: 分片处理或使用Spark

**代码优化**:
```python
# ❌ 低效写法
for i in range(len(df)):
    df.loc[i, 'new_col'] = calculate(df.loc[i, 'old_col'])

# ✅ 高效写法
df['new_col'] = df['old_col'].apply(calculate)
# 或使用向量化
df['new_col'] = df['old_col'] * 1.2
```

**可视化优化**:
- 数据点<1000: 全部显示
- 数据点>1000: 采样或聚合显示
- 使用缓存避免重复生成图表

### 版本管理

建议将提示词和生成的代码纳入版本控制：
```
insurance-analysis/
├── prompts/               # 提示词库
│   ├── data-quality.md
│   ├── kpi-calculator.md
│   └── weekly-report.md
├── scripts/               # 生成的脚本
│   ├── clean_data.py
│   ├── calc_kpi.py
│   └── generate_report.py
├── configs/               # 配置文件
│   ├── kpi_thresholds.yaml
│   └── chart_styles.json
└── outputs/               # 输出结果
    ├── reports/
    ├── charts/
    └── logs/
```

---

## 7️⃣ 快速参考卡片

### 任务类型 → 提示词映射表

| 任务描述 | 推荐提示词 | 预计耗时 |
|---------|-----------|---------|
| 检查Excel数据质量 | INS-DATA-QUALITY-CHECK | 5分钟 |
| 生成数据清洗脚本 | INS-DATA-CLEAN-SCRIPT | 10分钟 |
| 计算周度KPI | INS-KPI-CALCULATOR | 5分钟 |
| 多维度交叉分析 | INS-MULTIDIM-ANALYSIS | 15分钟 |
| 生成ECharts图表 | VIZ-INSURANCE-DASHBOARD | 10分钟 |
| 自动生成周报PPT | RPT-WEEKLY-AUTO | 20分钟 |
| 异常检测与预警 | INS-ANOMALY-DETECTOR | 10分钟 |

### 数据格式速查

**必需字段** (所有分析都需要):
```
org_code, org_name, product, biz_type, 
premium_written, premium_earned, claim_paid, 
expense, policy_count, period
```

**可选字段** (增强分析):
```
channel, vehicle_type, region, salesperson,
claim_count, large_claim_count, 
settled_claim, outstanding_claim
```

**时间格式**:
- 周度: `2024-W50` (ISO周编号)
- 月度: `2024-12`
- 日期: `2024-12-20`

---

## 📌 维护与更新

**本提示词库版本**: v1.0  
**最后更新**: 2024-12-20  
**维护者**: Alongor  

**更新日志**:
- 2024-12-20: 初始版本发布，包含6大类27个提示词

**反馈与改进**:
如果你在使用中发现问题或有改进建议，请：
1. 记录问题场景和期望效果
2. 保存AI的实际输出
3. 整理成案例反馈
4. 定期review和优化提示词

**扩展方向**:
- [ ] 添加预测分析类提示词（ARIMA时间序列）
- [ ] 添加客户细分类提示词（RFM模型）
- [ ] 添加风险评分类提示词（信用评分卡）
- [ ] 添加自然语言报告生成（基于数据自动写分析结论）

---

## 🎯 总结

这套标准提示词库覆盖了车险数据分析的核心场景：

✅ **数据处理**: 质量检查 → 清洗脚本 → 格式转换  
✅ **KPI计算**: 标准公式 → 多维分析 → 趋势对比  
✅ **可视化**: ECharts图表 → PPT嵌入 → 交互仪表盘  
✅ **报告生成**: 自动周报 → 麦肯锡风格 → 问题导向  
✅ **异常检测**: 统计方法 → 趋势预警 → 关联分析  

**使用建议**:
1. 先用**INS-DATA-QUALITY-CHECK**检查数据
2. 再用**INS-KPI-CALCULATOR**计算指标
3. 然后用**VIZ-INSURANCE-DASHBOARD**可视化
4. 最后用**RPT-WEEKLY-AUTO**生成报告
5. 定期用**INS-ANOMALY-DETECTOR**预警风险

祝你的数据分析工作效率提升！🚀
