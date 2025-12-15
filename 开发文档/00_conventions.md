# 知识库协作规范 (Knowledge Base Conventions)

> **版本**: v2.0.1 (MANIFESTO Edition)
> **更新时间**: 2025-12-15
> **架构理念**: 基于智能知识体系架构 MANIFESTO

---

## 核心理念

本项目知识库遵循 **MANIFESTO 架构**的三个元原则：

1. **代码是唯一事实 (Code is SSOT)** - 文档指向代码，不重复代码细节
2. **元数据驱动 (Metadata Driven)** - 每个知识单元必须有 `meta.json`
3. **原子化与链接 (Atomicity & Linking)** - 知识原子通过依赖关系编织成网

详见 `.claude/skills/project-knowledge-base/references/knowledge-system-manifesto.md`

---

## 目录结构规范

```
开发文档/
├── KNOWLEDGE_INDEX.md          # [地图] 自动生成的全景导航（不要手动编辑）
├── 00_conventions.md           # [法典] 本文件 - 协作规范与元数据定义
├── OPTIMIZATION_SUMMARY.md      # [报告] 知识库/结构优化总结（可选）
├── 01_features/                # [原子] 功能单元目录
│   └── F00X_功能名称/
│       ├── meta.json           # [DNA] 机器可读元数据（必需）
│       └── README.md           # [记忆] 人类可读业务逻辑（必需）
├── reports/                    # [日志] 开发记录/复盘/调研（可选）
│   └── DEVLOG.md               # [流水账] 变更记录（推荐）
├── decisions/                  # [决策] 技术决策记录（可选）
│   └── D00X_决策标题.md
├── patterns/                   # [模式] 可复用代码模式（可选）
│   └── P00X_模式名称.md
└── references/                 # [参考] 配置模板、领域知识（可选）
    └── 相关参考文档
```

---

## meta.json 元数据标准

每个功能单元的 `meta.json` 必须包含以下字段：

### 必需字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `id` | string | 唯一标识符，格式 F00X | "F001" |
| `name` | string | 功能名称（中文简短描述） | "CSV数据解析与处理" |
| `status` | string | 实现状态 | "implemented" / "in_progress" / "deprecated" |
| `core_files` | array | 核心代码文件路径列表 | ["src/data_loader.py"] |
| `tags` | array | 分类标签（用于检索） | ["数据处理", "CSV解析"] |

### 推荐字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `description` | string | 功能简述 | "负责CSV文件的上传、解析和数据清洗功能" |
| `updated_at` | string | 最后更新时间 | "2025-12-15" |
| `dependencies` | array | 依赖的其他功能单元ID | ["F002", "F003"] |
| `related_decisions` | array | 相关技术决策文档 | ["D001_选择Pandas.md"] |

### 完整示例

```json
{
  "id": "F001",
  "name": "CSV数据解析与处理",
  "status": "implemented",
  "core_files": [
    "src/data_loader.py",
    "static/js/static-report-generator.js"
  ],
  "tags": ["数据处理", "CSV解析", "前端"],
  "description": "负责CSV文件的上传、解析和数据清洗功能",
  "updated_at": "2025-12-15",
  "dependencies": ["F002"],
  "related_decisions": []
}
```

---

## 功能单元 README.md 编写规范

每个功能单元的 `README.md` 应包含：

1. **功能概述** - 一句话说明功能用途
2. **业务背景** - 为什么需要这个功能
3. **核心逻辑** - 关键业务规则和算法思路（不要复制代码）
4. **技术选型** - 使用的技术栈和工具
5. **使用示例** - 如何调用或使用这个功能
6. **已知问题** - 当前的技术债务或待优化点

---

## 技术决策记录规范

在代码中通过注释标记技术决策：

```python
# @decision: 选择 python-pptx 而非 ReportLab
# 理由: python-pptx 支持精确布局控制,满足麦肯锡风格要求
# 权衡: 性能略低但 12-13 页规模可接受
# 影响范围: F005_report_generation
# 决策日期: 2025-12-09
```

运行提取脚本后，会将 `@decision` 汇总输出到 `开发文档/decisions/decisions_YYYYMMDD.md`（按日期聚合）。

---

## 代码维护工作流

### 修改代码后的标准流程

```bash
# 1. 修改代码文件
vim src/data_loader.py

# 2. 检查是否影响功能边界
# - 新增核心文件？-> 更新 meta.json 的 core_files
# - 修改依赖关系？-> 更新 meta.json 的 dependencies
# - 改变实现状态？-> 更新 meta.json 的 status

# 3. 更新元数据
vim 开发文档/01_features/F001_csv_parsing/meta.json

# 4. 重新生成索引
python3 scripts/generate_docs_index.py 开发文档

# 5. 提交变更
git add .
git commit -m "更新F001功能及元数据"

# 6. 推送前自动检查（通过 Git Pre-Push Hook）
git push  # 会自动执行文档-代码一致性检查
```

### 推送前检查机制

为确保代码与文档始终一致，项目配置了 **Git Pre-Push Hook** 自动检查。

**安装方法**:
```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-push
```

**检查项目**:
1. ✅ **必需**: KNOWLEDGE_INDEX.md 是否最新
2. ⚠️ **建议**: 核心文件是否在 meta.json 中注册
3. ⚠️ **建议**: 功能单元 updated_at 是否为今天
4. ⚠️ **建议**: 重大变更是否记录到 DEVLOG.md

详见 [推送前检查清单](./00_push_checklist.md)。

---

## AI 协作者导航路径

未来的 AI 协作者应遵循以下路径：

### 1. 定位 (Locate)
- 入口: 读取 `开发文档/KNOWLEDGE_INDEX.md`
- 动作: 搜索标签或关键词，找到目标功能ID

### 2. 锁定 (Lock)
- 入口: 读取目标功能的 `meta.json`
- 动作: 获取 `core_files` 列表，建立代码上下文

### 3. 执行 (Execute)
- 动作: 修改代码 -> 更新元数据 -> 重新生成索引

---

## 标签分类体系

本项目使用的标签分类：

### 技术维度
- `数据处理`, `CSV解析`, `前端`, `后端`
- `KPI计算`, `业务指标`, `算法`
- `报告生成`, `模板引擎`, `HTML`
- `静态部署`, `GitHub Pages`, `CI/CD`

### 业务维度
- `数据映射`, `业务逻辑`, `配置化`
- `数据聚合`, `统计分析`, `多维分析`

### 功能维度
- `数据加载`, `数据验证`, `数据转换`
- `可视化`, `图表生成`, `交互`

---

## 项目特定约定

### 华安保险车险业务规范

1. **周次计算**: 基于保单年度（7月1日 - 次年6月30日），每周六截止
2. **KPI 指标**: 共 16 个核心指标，详见 `reference/thresholds.json`
3. **业务类型映射**: 使用 `reference/business_type_mapping.json` 配置化管理
4. **报告风格**: 麦肯锡风格，16:9 宽屏，深红配色 #a02724

### 代码规范

- Python 版本: 3.9 ~ 3.12（CI 使用 3.9）
- 代码风格: PEP 8
- 文档字符串: Google Style
- 类型提示: 推荐使用但不强制

---

## 开发记录规范

当你完成一次“可交付”的变更（功能、行为、入口、部署方式或对外文档）时，需要补齐可追溯记录：

1. **用户入口变更**：更新项目根 `README.md`
2. **功能边界变更**：更新对应功能单元的 `meta.json` / `README.md`
3. **决策与取舍**：写入 ADR（`开发文档/decisions/`）或用 `@decision` 标记后运行提取脚本
4. **开发流水账**：追加到 `开发文档/reports/DEVLOG.md`（日期 + 摘要 + 影响文件 + 验证方式/结果）

---

## 知识库维护职责

### 开发者职责
- ✅ 修改代码时同步更新 meta.json
- ✅ 重大技术决策添加 @decision 注释
- ✅ 完成功能后更新 status 字段

### AI 协作者职责
- ✅ 修改前先读取 KNOWLEDGE_INDEX.md 定位功能
- ✅ 修改后运行 `python3 scripts/generate_docs_index.py 开发文档` 更新索引
- ✅ 保持元数据与代码的一致性

---

## 常见问题

### Q: 如何添加新功能？
1. 创建 `01_features/F00X_功能名称/` 目录
2. 编写 `meta.json` 和 `README.md`
3. 实现代码功能
4. 运行 `python3 scripts/generate_docs_index.py 开发文档` 更新索引

### Q: meta.json 中的路径是相对还是绝对？
- 使用相对于项目根目录的路径
- 示例: `"src/data_loader.py"` 而不是 `"./src/data_loader.py"`

### Q: KNOWLEDGE_INDEX.md 可以手动编辑吗？
- ❌ 不要手动编辑，它是自动生成的
- ✅ 修改 meta.json 后运行脚本重新生成

---

## 版本历史

### v2.0.1 (2025-12-15)
- 对齐仓库实际脚本：索引生成以 `scripts/generate_docs_index.py` 为准
- 新增开发记录约定：推荐使用 `开发文档/reports/DEVLOG.md` 追踪变更
- 更新 Python 版本范围（匹配依赖与 CI 环境）

### v2.0.0 (2025-12-15)
- 整合 MANIFESTO 架构理念
- 标准化 meta.json 格式
- 添加 decisions/patterns/references 目录规范
- 完善 AI 协作者导航路径

### v1.0.0 (2025-12-14)
- 初始版本发布
- 定义基础元数据标准
