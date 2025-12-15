# 代码推送前检查清单 (Pre-Push Checklist)

> **版本**: v1.0.0
> **制定日期**: 2025-12-15
> **强制执行**: ✅ 通过 Git Pre-Push Hook 自动检查

---

## 🎯 目标

确保每次推送到远程仓库时，**代码与文档保持一致**，遵循 MANIFESTO 架构原则。

---

## 📋 必需检查项（自动化）

以下检查由 `.githooks/pre-push` 自动执行：

### ✅ 检查1: 知识库索引是否最新

**规则**: `KNOWLEDGE_INDEX.md` 必须在所有 `meta.json` 修改后重新生成。

**修复方法**:
```bash
python3 scripts/generate_docs_index.py 开发文档
git add 开发文档/KNOWLEDGE_INDEX.md
git commit --amend --no-edit
```

### ⚠️ 检查2: 核心文件是否注册

**规则**: 修改 `src/`, `static/js/`, `static/templates/` 下的核心文件时，应在相应功能单元的 `meta.json` 中注册。

**修复方法**:
```bash
# 1. 找到对应的功能单元目录
# 2. 编辑 meta.json，在 core_files 数组中添加文件路径
vim 开发文档/01_features/F00X_xxx/meta.json

# 示例
{
  "core_files": [
    "src/data_loader.py",
    "static/js/new-feature.js"  // 新增
  ]
}
```

### ⚠️ 检查3: 功能单元日期是否更新

**规则**: 修改了功能单元的核心文件时，必须更新 `meta.json` 中的 `updated_at` 字段为今天。

**修复方法**:
```bash
# 自动更新今天日期
sed -i '' 's/"updated_at": "[^"]*"/"updated_at": "'$(date +%Y-%m-%d)'"/' \
  开发文档/01_features/F00X_xxx/meta.json

git add 开发文档/01_features/F00X_xxx/meta.json
git commit --amend --no-edit
```

### ⚠️ 检查4: 重大变更是否记录

**规则**: 修改超过 100 行代码时，建议在 `开发文档/reports/DEVLOG.md` 中添加开发记录。

**修复方法**:
```bash
# 在 DEVLOG.md 中添加记录
vim 开发文档/reports/DEVLOG.md

# 格式示例
## 2025-12-15 - 功能描述

### 变更内容
- 修改了 xxx 功能
- 优化了 yyy 逻辑

### 影响文件
- src/xxx.py
- static/js/yyy.js

### 验证方式
- 测试用例通过
- 浏览器手动测试正常
```

---

## 🔧 安装 Git Hook

### 方法1: 配置 Git Hooks 路径（推荐）

```bash
# 一次性配置，所有 hooks 生效
git config core.hooksPath .githooks

# 赋予执行权限
chmod +x .githooks/pre-push
```

### 方法2: 复制到 .git/hooks

```bash
cp .githooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

---

## 📝 手动检查清单

对于自动化无法覆盖的检查项，请手动确认：

### A. 功能单元 README 更新

- [ ] 在 `开发文档/01_features/F00X_xxx/README.md` 中添加"最近更新"章节
- [ ] 描述本次修改的功能、技术实现、影响范围

**示例**:
```markdown
## 最近更新

### 2025-12-15 - 功能描述

**新增功能**:
1. xxx
2. yyy

**技术实现**:
- 使用了 zzz 技术
- 优化了 www 逻辑

**影响范围**:
- 修改了 aaa.py (50行)
- 新增了 bbb.js (100行)
```

### B. Git 提交信息规范

- [ ] 提交信息包含中文描述（简洁清晰）
- [ ] 使用约定式提交前缀（✨ ♻️ 🐛 📚 等）
- [ ] 列出影响的主要文件
- [ ] 包含 Claude Code 签名

**提交模板**:
```
✨ 简短描述功能（50字内）

详细说明：
1. 具体做了什么
2. 为什么这么做
3. 有什么影响

技术细节：
- 使用了 xxx 技术
- 优化了 yyy 算法

影响文件：
- src/aaa.py
- static/js/bbb.js

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### C. 技术决策记录（重大变更）

- [ ] 如果涉及架构变更、技术选型，在 `开发文档/decisions/` 添加 ADR
- [ ] 格式: `D00X_决策标题.md`

**示例**:
```markdown
# D002: 选择 ECharts 多源 CDN 加载方案

## 决策背景
GitHub Pages 部署在子目录导致本地资源路径 404

## 决策内容
使用多源 CDN（baomitu, bootcdn, jsdelivr）加载 ECharts

## 理由
1. 避免路径问题
2. 多源容错
3. 减小仓库体积

## 权衡
- 优势: 可靠性高、无需维护本地文件
- 劣势: 依赖外部CDN网络

## 影响范围
- F006_static_deployment
```

---

## 🚀 标准工作流程

### 场景1: 修改功能代码

```bash
# 1. 修改代码
vim src/data_loader.py

# 2. 更新功能单元元数据
vim 开发文档/01_features/F001_csv_parsing/meta.json
# 更新 updated_at 为今天

# 3. 更新功能单元 README
vim 开发文档/01_features/F001_csv_parsing/README.md
# 添加"最近更新"记录

# 4. 重新生成知识库索引
python3 scripts/generate_docs_index.py 开发文档

# 5. 提交变更
git add .
git commit -m "✨ 优化 CSV 解析逻辑
...
🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 6. 推送（会自动执行 pre-push 检查）
git push origin main
```

### 场景2: 修复Bug

```bash
# 1. 修改代码
vim src/kpi_calculator.py

# 2. 更新 meta.json 日期
vim 开发文档/01_features/F003_kpi_calculation/meta.json

# 3. 重新生成索引
python3 scripts/generate_docs_index.py 开发文档

# 4. 提交并推送
git add .
git commit -m "🐛 修复 KPI 计算中的除零错误
..."
git push
```

### 场景3: 重大架构变更

```bash
# 1. 修改代码（多个文件）
vim src/*.py
vim static/js/*.js

# 2. 添加技术决策记录
vim 开发文档/decisions/D003_xxx.md

# 3. 更新所有相关功能单元的 meta.json

# 4. 添加开发流水账
vim 开发文档/reports/DEVLOG.md

# 5. 重新生成索引
python3 scripts/generate_docs_index.py 开发文档

# 6. 提交并推送
git add .
git commit -m "♻️ 重构数据处理架构
..."
git push
```

---

## ⚙️ 配置选项

### 跳过检查（不推荐）

仅在紧急情况下使用：

```bash
git push --no-verify
```

### 自定义检查阈值

编辑 `.githooks/pre-push` 修改参数：

```bash
# 修改重大变更的行数阈值（默认100行）
LINES_CHANGED_THRESHOLD=100

# 修改日期宽容期（默认当天）
DATE_TOLERANCE_DAYS=0
```

---

## 📊 检查结果示例

### ✅ 通过示例

```
🔍 执行文档-代码一致性检查...

[检查1] 验证知识库索引是否最新...
✓ 知识库索引已最新

[检查2] 验证核心文件注册情况...
✓ 所有核心文件已注册

[检查3] 验证功能单元更新日期...
✓ 功能单元日期已更新

[检查4] 验证开发记录...
✓ 变更规模适中（85 行）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 所有检查通过！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### ❌ 失败示例

```
🔍 执行文档-代码一致性检查...

[检查1] 验证知识库索引是否最新...
✗ KNOWLEDGE_INDEX.md 未更新！
  请运行: python3 scripts/generate_docs_index.py 开发文档

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ 发现 1 个错误，阻止推送！
请修复上述错误后重试。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### ⚠️ 警告示例

```
🔍 执行文档-代码一致性检查...

[检查2] 验证核心文件注册情况...
⚠ 核心文件未注册: static/js/new-feature.js
  建议在相应功能单元的 meta.json 中添加此文件

[检查3] 验证功能单元更新日期...
⚠ 功能单元日期未更新: F006_static_deployment
  文件 static/js/new-feature.js 已修改，但 updated_at 仍为 2025-12-14

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  发现 2 个警告
建议修复后再推送，或使用 git push --no-verify 跳过检查

是否继续推送？(y/N)
```

---

## 🔄 持续改进

这套检查清单会随着项目演进持续优化。如果发现新的问题或有改进建议，请：

1. 在 GitHub Issues 提出
2. 更新本文档
3. 修改 `.githooks/pre-push` 脚本
4. 提交 Pull Request

---

## 📚 相关文档

- [00_conventions.md](./00_conventions.md) - 知识库协作规范
- [KNOWLEDGE_INDEX.md](./KNOWLEDGE_INDEX.md) - 知识体系全景导航
- [reports/DEVLOG.md](./reports/DEVLOG.md) - 开发流水账

---

> **原则**: 代码是唯一事实，文档是代码的地图。保持地图与领土的一致性是每位协作者的责任。
