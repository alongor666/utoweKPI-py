#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
项目知识体系初始化脚本
创建符合智能知识体系架构的最小化结构
"""

import os
import json
from pathlib import Path


def create_template_feature():
    """创建模板功能单元"""
    template_dir = Path("开发文档/01_features/F000_template")
    template_dir.mkdir(parents=True, exist_ok=True)
    
    # 创建meta.json
    meta = {
        "id": "F000",
        "name": "模板",
        "status": "to_be_implemented",
        "core_files": [],
        "tags": ["模板"],
        "description": "功能单元模板，用于复制创建新功能"
    }
    
    with open(template_dir / "meta.json", 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    
    # 创建README.md
    readme = """# F000: 模板

## 功能描述

这是一个功能单元模板，用于快速创建新的功能文档。

## 使用方法

1. 复制整个目录：`cp -r F000_template F001_新功能名称`
2. 修改 `meta.json` 中的功能信息
3. 编写详细的 `README.md` 文档
4. 运行索引生成器更新导航

## 元数据说明

- `id`: 功能唯一标识符 (格式: F + 数字)
- `name`: 功能名称
- `status`: 实现状态 (implemented/in_progress/planned/to_be_implemented/deprecated)
- `core_files`: 核心代码文件列表
- `tags`: 功能标签，用于分类和搜索

---

> 此模板由智能知识体系自动维护
"""
    
    with open(template_dir / "README.md", 'w', encoding='utf-8') as f:
        f.write(readme)


def create_conventions():
    """创建协作规范文档"""
    conventions_dir = Path("开发文档")
    conventions_dir.mkdir(parents=True, exist_ok=True)
    
    conventions = """# 协作规范与元数据定义

## 元数据标准

所有功能单元必须包含 `meta.json` 文件，遵循以下标准：

```json
{
  "id": "F001",
  "name": "功能名称",
  "status": "implemented",
  "core_files": ["src/path/to/file.py"],
  "tags": ["业务领域", "技术栈"],
  "description": "功能简短描述"
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 功能唯一标识，格式 F + 数字 |
| name | string | ✅ | 功能名称，简洁明确 |
| status | string | ✅ | 实现状态 |
| core_files | array | ✅ | 核心代码文件路径列表 |
| tags | array | ✅ | 功能标签，用于分类 |
| description | string | ❌ | 功能简短描述 |

### 状态值规范

- `implemented`: ✅ 已实现
- `in_progress`: 🚧 开发中  
- `planned`: 📋 已规划
- `to_be_implemented`: ⏳ 待实现
- `deprecated`: 🗑️ 已废弃

## 文档规范

### README.md 结构

```markdown
# F001: 功能名称

## 功能描述
[详细描述功能目标和用户价值]

## 实现逻辑
[技术实现要点和关键算法]

## 依赖关系
[依赖的其他功能或外部系统]

## 测试要点
[关键测试场景和验收标准]

## 维护说明
[常见问题和维护注意事项]
```

## 协作流程

### 新功能开发
1. 复制模板创建新功能目录
2. 更新 `meta.json` 元数据
3. 编写详细设计文档
4. 实现核心功能代码
5. 更新 `core_files` 列表
6. 运行索引生成器

### 代码修改
1. 定位功能单元 (通过 KNOWLEDGE_INDEX.md)
2. 修改代码实现
3. 检查是否影响元数据
4. 更新相关文档
5. 重新生成索引

### 质量保障
- 所有功能必须有对应的测试
- 元数据必须与代码保持同步
- 文档必须清晰可读
- 遵循代码规范和最佳实践

---

> 此文档是智能知识体系的核心法典
"""
    
    with open(conventions_dir / "00_conventions.md", 'w', encoding='utf-8') as f:
        f.write(conventions)


def main():
    """主函数 - 初始化知识体系"""
    print("🚀 初始化智能知识体系架构...")
    
    # 创建目录结构
    print("📁 创建目录结构...")
    os.makedirs("scripts", exist_ok=True)
    os.makedirs("开发文档/01_features", exist_ok=True)
    
    # 创建模板功能单元
    print("📋 创建功能单元模板...")
    create_template_feature()
    
    # 创建协作规范
    print("📜 创建协作规范...")
    create_conventions()
    
    # 生成初始索引
    print("🔍 生成初始索引...")
    from generate_docs_index import DocsIndexGenerator
    generator = DocsIndexGenerator("开发文档")
    generator.generate()
    
    print("✅ 智能知识体系初始化完成！")
    print("")
    print("📖 下一步操作：")
    print("1. 查看 开发文档/KNOWLEDGE_INDEX.md 了解全景导航")
    print("2. 阅读 开发文档/00_conventions.md 了解协作规范")
    print("3. 复制 F000_template 开始创建新功能")
    print("4. 运行 python3 scripts/generate_docs_index.py 开发文档 更新索引")


if __name__ == "__main__":
    main()