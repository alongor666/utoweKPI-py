# 智能知识体系架构 (Intelligent Knowledge System Architecture)

> **核心目标**: 构建一个"自我描述、自我索引"的最小化活体知识库，使 AI 协作者能通过精确的元数据导航，零延迟定位业务逻辑与代码实现。

---

## 1. 核心哲学 (Core Philosophy)

本项目的知识体系建立在三个元原则之上：

1.  **代码是唯一事实 (Code is the SSOT)**: 文档是代码的"地图"，而不是代码的"副本"。文档指向代码，但不重复代码细节。
2.  **元数据驱动 (Metadata Driven)**: 每一个知识单元（功能、决策）都必须携带结构化的元数据（`meta.json`），供机器读取和索引。
3.  **原子化与链接 (Atomicity & Linking)**: 知识被拆分为独立的原子单元，通过显式的依赖关系（Links）编织成网。

---

## 2. 最小化架构 (The Minimal Architecture)

一个功能完备的自描述知识库，必须包含以下 **4 个核心组件**：

```text
项目根目录/
├── scripts/
│   └── generate_docs_index.py    # [引擎] 自动化索引生成器 (神经中枢)
└── 开发文档/
    ├── KNOWLEDGE_INDEX.md        # [地图] 自动生成的全景导航 (单一入口)
    ├── 00_conventions.md         # [法典] 协作规范与元数据定义
    └── 01_features/              # [原子] 业务逻辑的物理载体
        └── F000_template/        #      -> 最小功能单元目录
            ├── meta.json         #      -> [DNA] 机器读：身份、状态、代码指针
            └── README.md         #      -> [记忆] 人类读：业务逻辑、设计思路
```

---

## 3. 有机结合机制 (Organic Integration)

各部分通过以下机制像生物体一样协同工作：

### 3.1 逻辑层：元数据桥梁 (`meta.json`)
`meta.json` 是连接"业务意图"与"代码实现"的关键桥梁。它告诉 AI：
- **"这是什么？"** (id, name, tags)
- **"代码在哪里？"** (core_files)
- **"为什么这么做？"** (related_decisions)

**最小化元数据标准**:
```json
{
  "id": "F000",
  "name": "功能名称",
  "status": "implemented",
  "core_files": [ "src/path/to/core_logic.ts" ],
  "tags": ["业务领域", "技术栈"]
}
```

### 3.2 索引层：自动化神经中枢 (`scripts/`)
我们不手动维护目录，而是依靠 `scripts/generate_docs_index.py` 作为"爬虫"：
1.  **扫描**: 遍历 `01_features/` 等目录下的所有原子单元。
2.  **提取**: 解析 `meta.json` 中的 DNA 信息。
3.  **生成**: 动态构建 `KNOWLEDGE_INDEX.md`，确保地图永远与领土一致。

---

## 4. AI 导航路径 (Navigation Paths)

未来的 AI 协作者应遵循以下闭环路径获取信息：

1.  **定位 (Locate)**:
    - 入口: 读取 `开发文档/KNOWLEDGE_INDEX.md`
    - 动作: 搜索标签或关键词，找到目标 Feature ID (如 `F001`)

2.  **锁定 (Lock)**:
    - 入口: 读取 `01_features/F001/meta.json`
    - 动作: 获取 `core_files` 列表，直接建立代码上下文

3.  **执行与维护 (Execute & Maintain)**:
    - 动作: 修改代码 -> 检查是否影响元数据 -> 更新 `meta.json` -> 运行索引脚本

---

## 5. 立即初始化 (Initialization)

如果尚未创建上述结构，请执行以下命令构建最小化内核：

```bash
# 1. 创建骨架
mkdir -p 开发文档/01_features/F000_template
mkdir -p scripts

# 2. 注入 DNA (创建模版元数据)
echo '{"id":"F000","name":"模板","status":"to_be_implemented","tags":["模板"],"core_files":[]}' > 开发文档/01_features/F000_template/meta.json

# 3. 激活神经系统 (生成索引)
# 确保 generate_docs_index.py 存在后运行:
python3 scripts/generate_docs_index.py 开发文档
```
