#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文档索引生成器 - 自动化神经中枢
扫描项目中的功能单元，生成全景导航索引
"""

import os
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any


class DocsIndexGenerator:
    """文档索引生成器"""
    
    def __init__(self, docs_root: str):
        self.docs_root = Path(docs_root)
        self.features_dir = self.docs_root / "01_features"
        self.index_file = self.docs_root / "KNOWLEDGE_INDEX.md"
        
    def scan_features(self) -> List[Dict[str, Any]]:
        """扫描所有功能单元"""
        features = []
        
        if not self.features_dir.exists():
            print(f"⚠️  功能目录不存在: {self.features_dir}")
            return features
            
        for feature_dir in self.features_dir.iterdir():
            if feature_dir.is_dir():
                feature = self.parse_feature(feature_dir)
                if feature:
                    features.append(feature)
                    
        # 按ID排序
        features.sort(key=lambda x: x.get('id', ''))
        return features
    
    def parse_feature(self, feature_dir: Path) -> Dict[str, Any]:
        """解析单个功能单元"""
        meta_file = feature_dir / "meta.json"
        readme_file = feature_dir / "README.md"
        
        if not meta_file.exists():
            print(f"⚠️  缺少 meta.json: {feature_dir}")
            return None
            
        try:
            with open(meta_file, 'r', encoding='utf-8') as f:
                meta = json.load(f)
        except json.JSONDecodeError as e:
            print(f"❌ meta.json 格式错误 {meta_file}: {e}")
            return None
            
        # 读取README描述
        description = ""
        if readme_file.exists():
            try:
                with open(readme_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    # 提取第一段描述（在第一个标题之前）
                    for line in lines:
                        line = line.strip()
                        if line.startswith('#'):
                            break
                        if line and not line.startswith('```'):
                            description += line + " "
                    description = description.strip()
            except Exception as e:
                print(f"⚠️  读取README失败 {readme_file}: {e}")
        
        feature = {
            "id": meta.get("id", ""),
            "name": meta.get("name", ""),
            "status": meta.get("status", "unknown"),
            "tags": meta.get("tags", []),
            "core_files": meta.get("core_files", []),
            "description": description,
            "path": str(feature_dir.relative_to(self.docs_root.parent))
        }
        
        return feature
    
    def generate_index_content(self, features: List[Dict[str, Any]]) -> str:
        """生成索引内容"""
        content = []
        
        # 头部
        content.append("# 知识体系全景导航 (Knowledge System Panorama)")
        content.append("")
        content.append("> **自动生成**: 由 `scripts/generate_docs_index.py` 动态构建")
        content.append("> **更新时间**: " + self._get_current_time())
        content.append("")
        content.append("---")
        content.append("")
        
        # 快速导航
        content.append("## 🧭 快速导航")
        content.append("")
        content.append("| 功能ID | 功能名称 | 状态 | 标签 | 核心文件 |")
        content.append("|--------|----------|------|------|----------|")
        
        for feature in features:
            status_emoji = self._get_status_emoji(feature["status"])
            tags_str = ", ".join(feature["tags"]) if feature["tags"] else "-"
            files_str = ", ".join([f"`{f}`" for f in feature["core_files"][:3]])  # 最多显示3个文件
            if len(feature["core_files"]) > 3:
                files_str += f" ... (+{len(feature['core_files'])-3})"
                
            content.append(f"| [{feature['id']}](./{feature['path']}/README.md) | {feature['name']} | {status_emoji} {feature['status']} | {tags_str} | {files_str} |")
        
        content.append("")
        
        # 按状态分组
        content.append("## 📊 状态概览")
        content.append("")
        
        status_groups = {}
        for feature in features:
            status = feature["status"]
            if status not in status_groups:
                status_groups[status] = []
            status_groups[status].append(feature)
        
        for status, group_features in status_groups.items():
            status_emoji = self._get_status_emoji(status)
            content.append(f"### {status_emoji} {status.title()} ({len(group_features)})")
            content.append("")
            
            for feature in group_features:
                content.append(f"- **[{feature['id']}]({feature['path']}/README.md)**: {feature['name']}")
                if feature["description"]:
                    content.append(f"  - {feature['description']}")
                if feature["tags"]:
                    tags_str = ", ".join([f"`{tag}`" for tag in feature["tags"]])
                    content.append(f"  - 标签: {tags_str}")
                content.append("")
        
        # 按标签分组
        content.append("## 🏷️ 标签索引")
        content.append("")
        
        tag_groups = {}
        for feature in features:
            for tag in feature["tags"]:
                if tag not in tag_groups:
                    tag_groups[tag] = []
                tag_groups[tag].append(feature)
        
        for tag in sorted(tag_groups.keys()):
            tag_features = tag_groups[tag]
            content.append(f"### `{tag}` ({len(tag_features)})")
            content.append("")
            
            for feature in tag_features:
                content.append(f"- **[{feature['id']}]({feature['path']}/README.md)**: {feature['name']}")
            content.append("")
        
        # 使用指南
        content.append("---")
        content.append("")
        content.append("## 📖 使用指南")
        content.append("")
        content.append("### AI协作者导航路径")
        content.append("")
        content.append("1. **定位**: 在此页面搜索关键词或标签，找到目标功能ID")
        content.append("2. **锁定**: 进入功能目录，查看 `meta.json` 获取核心文件位置")
        content.append("3. **执行**: 直接修改代码，更新元数据，运行索引脚本")
        content.append("")
        content.append("### 维护者工作流")
        content.append("")
        content.append("```bash")
        content.append("# 1. 修改代码或文档")
        content.append("# 2. 更新功能元数据")
        content.append("vim 开发文档/01_features/F001/meta.json")
        content.append("# 3. 重新生成索引")
        content.append("python3 scripts/generate_docs_index.py 开发文档")
        content.append("```")
        content.append("")
        
        return "\n".join(content)
    
    def _get_status_emoji(self, status: str) -> str:
        """获取状态对应的emoji"""
        status_emojis = {
            "implemented": "✅",
            "in_progress": "🚧", 
            "planned": "📋",
            "to_be_implemented": "⏳",
            "deprecated": "🗑️",
            "unknown": "❓"
        }
        return status_emojis.get(status, "❓")
    
    def _get_current_time(self) -> str:
        """获取当前时间字符串"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    def generate(self) -> bool:
        """执行索引生成"""
        print("🔍 扫描功能单元...")
        features = self.scan_features()
        
        print(f"📋 发现 {len(features)} 个功能单元")
        
        print("📝 生成索引内容...")
        content = self.generate_index_content(features)
        
        print("💾 写入索引文件...")
        try:
            # 确保目录存在
            self.index_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.index_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ 索引已生成: {self.index_file}")
            return True
            
        except Exception as e:
            print(f"❌ 写入索引失败: {e}")
            return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="生成文档索引")
    parser.add_argument("docs_root", help="文档根目录路径")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.docs_root):
        print(f"❌ 文档目录不存在: {args.docs_root}")
        return 1
    
    generator = DocsIndexGenerator(args.docs_root)
    success = generator.generate()
    
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())