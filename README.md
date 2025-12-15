# utoweKPI-py

基于 CSV 数据生成车险经营分析周报（HTML）的工具集，提供：

- 命令行模式：`main.py` 从 CSV + 模板生成报告文件
- Web 模式：`app.py` 提供上传页面，上传 CSV 后生成并展示报告
- 静态站点（可选）：`static/` 目录下提供前端版页面与 GitHub Pages 部署流水线

核心计算逻辑位于 `src/`（数据加载、业务映射、KPI 计算、模板注入）。

## 快速开始

### 1) 安装依赖

Python 版本建议 `3.9 ~ 3.12`（以确保 `pandas/numpy` 兼容性）。

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) 命令行生成报告

仓库内提供示例数据（见 `data/`）。

```bash
python main.py \
  --csv data/test_2025保单第50周变动成本率明细表_四川分公司.csv \
  --template templates/四川分公司车险第49周经营分析模板.html \
  --output output/经营分析周报.html \
  --mapping reference/business_type_mapping.json \
  --year-plans reference/year-plans.json \
  --thresholds reference/thresholds.json
```

生成结果：`output/经营分析周报.html`（如目录不存在会自动创建）。

### 3) Web 上传生成报告

```bash
python app.py
```

- 访问 `http://localhost:5001`
- 上传 CSV 后会在 `output/经营分析周报_web.html` 生成报告
- `/report` 路由用于查看最新生成的报告
- `/asset/...` 路由用于在模板中引用本地静态资源（例如 `asset/echarts.min.js`）

## 数据要求（CSV）

`src/data_loader.py` 会校验必要字段，缺失会直接报错。当前必需列如下（字段名需与 CSV 表头一致）：

- `third_level_organization`：三级机构
- `business_type_category`：业务类型分类
- `customer_category_3`：客户类别
- `signed_premium_yuan`：签单保费（元）
- `matured_premium_yuan`：满期保费（元）
- `policy_count`：保单件数
- `claim_case_count`：赔案件数
- `reported_claim_payment_yuan`：已报告赔款（元）
- `expense_amount_yuan`：费用额（元）
- `premium_plan_yuan`：年度保费计划/预算（元）
- `week_number`：周次

可选列：

- `second_level_organization`：用于分公司模式标题/识别
- `policy_start_year`：用于报告年份与“时间进度达成率”开关

## 模板与配置

### 模板

- `templates/四川分公司车险第49周经营分析模板.html`

生成逻辑会把计算得到的 JSON 数据注入到模板中的 `const DATA = {...};` 段落，并自动更新 `<title>` / `<h1>` 以及日期信息。

### 配置文件（reference/）

- `reference/business_type_mapping.json`：业务类型映射与展示名称（`src/mapper.py` 使用）
- `reference/year-plans.json`：年度保费计划数据（用于达成率计算/展示）
- `reference/thresholds.json`：问题机构识别阈值与四象限基准线

## 目录结构

```text
.
├── app.py                    # Web 上传入口（Flask）
├── main.py                   # CLI 入口
├── src/                      # 核心逻辑：加载、映射、计算、生成
├── templates/                # 报告模板 + 上传页模板
├── reference/                # 映射/阈值/年度计划配置
├── asset/                    # 本地静态资源（如 echarts.min.js）
├── data/                     # 示例/测试数据
├── output/                   # 运行后生成（默认不存在，运行时创建）
└── static/                   # 静态站点（可选，用于 Pages 部署）
```

## 静态站点（可选）

仓库包含 `static/` 目录以及 `.github/workflows/deploy.yml`：CI 会将文档、模板与配置复制到 `static/` 并发布到 GitHub Pages。

本地预览：

```bash
cd static
python -m http.server 8000
```

## 常见问题

1) 提示“CSV 文件缺失必要列”

- 先对照“数据要求（CSV）”检查表头拼写是否一致（大小写、下划线）。

2) 中文乱码或读取失败

- 优先把 CSV 保存为 UTF-8 编码再导入；如你数据源是 GBK，可先在 Excel/编辑器中转码。

3) 报告打开后图表不显示

- Web 模式下请通过 `http://localhost:5001/report` 访问，确保模板里引用的 `/asset/echarts.min.js` 能被正确加载。

## 测试

当前测试位于 `tests/`，可用 pytest 运行：

```bash
python -m pytest -q
```
