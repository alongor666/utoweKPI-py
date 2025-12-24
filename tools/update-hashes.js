#!/usr/bin/env node

/**
 * 🔐 代码哈希更新工具
 *
 * 功能:
 * 1. 读取 meta.json 中的 code_references
 * 2. 计算实际代码块的 SHA-256 哈希
 * 3. 更新 meta.json 中的 hash 字段
 * 4. 标记 last_verified 日期
 *
 * 使用方法:
 *   node tools/update-hashes.js F001            # 更新单个模块
 *   node tools/update-hashes.js --all           # 更新所有模块
 *   node tools/update-hashes.js F001 --dry-run  # 预览但不保存
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class HashUpdater {
  constructor(options = {}) {
    this.projectRoot = path.resolve(__dirname, '..');
    this.featuresRoot = path.join(this.projectRoot, '开发文档', '01_features');
    this.dryRun = options.dryRun || false;

    this.stats = {
      total: 0,
      updated: 0,
      unchanged: 0,
      errors: 0
    };
  }

  // 更新所有模块
  updateAll() {
    console.log('🔐 开始更新所有模块的代码哈希...\n');

    if (!fs.existsSync(this.featuresRoot)) {
      console.error(`❌ 功能目录不存在: ${this.featuresRoot}`);
      return false;
    }

    const featureDirs = fs.readdirSync(this.featuresRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    if (featureDirs.length === 0) {
      console.warn('⚠️  未找到任何功能模块目录');
      return true;
    }

    featureDirs.forEach(dirName => {
      this.updateOne(dirName);
    });

    this.printSummary();
    return this.stats.errors === 0;
  }

  // 更新单个模块
  updateOne(featureId) {
    const metaPath = path.join(this.featuresRoot, featureId, 'meta.json');

    if (!fs.existsSync(metaPath)) {
      console.error(`❌ [${featureId}] meta.json 不存在`);
      this.stats.errors++;
      return false;
    }

    console.log(`📄 处理 [${featureId}]...`);

    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

      if (!meta.code_references || meta.code_references.length === 0) {
        console.log(`  ⚠️  无代码引用，跳过\n`);
        return true;
      }

      let hasChanges = false;
      const today = new Date().toISOString().split('T')[0];

      meta.code_references.forEach((ref, index) => {
        this.stats.total++;

        const filePath = path.join(this.projectRoot, ref.file);

        if (!fs.existsSync(filePath)) {
          console.error(`  ❌ 代码引用 #${index + 1}: 文件不存在 - ${ref.file}`);
          this.stats.errors++;
          return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        if (!ref.lines) {
          console.warn(`  ⚠️  代码引用 #${index + 1}: 缺少 lines 字段，跳过`);
          return;
        }

        const [start, end] = ref.lines.includes('-')
          ? ref.lines.split('-').map(Number)
          : [Number(ref.lines), Number(ref.lines)];

        if (start < 1 || end > lines.length) {
          console.error(`  ❌ 代码引用 #${index + 1}: 行号超出范围 (${ref.lines})`);
          this.stats.errors++;
          return;
        }

        const codeBlock = lines.slice(start - 1, end).join('\n');
        const newHash = this.calculateHash(codeBlock);
        const oldHash = ref.hash || 'none';

        if (newHash !== oldHash) {
          console.log(`  🔄 代码引用 #${index + 1}: ${ref.label}`);
          console.log(`     旧哈希: ${oldHash}`);
          console.log(`     新哈希: ${newHash}`);

          ref.hash = newHash;
          ref.last_verified = today;
          hasChanges = true;
          this.stats.updated++;
        } else {
          console.log(`  ✅ 代码引用 #${index + 1}: ${ref.label} (未变更)`);
          ref.last_verified = today;
          this.stats.unchanged++;
        }
      });

      // 更新 change_tracking
      if (meta.change_tracking && hasChanges) {
        meta.change_tracking.last_doc_sync = today;
        meta.change_tracking.sync_status = 'synced';
      }

      // 保存文件
      if (hasChanges || true) { // 总是更新 last_verified
        if (this.dryRun) {
          console.log(`  🔍 [预览模式] 将更新 meta.json\n`);
        } else {
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
          console.log(`  💾 已更新 meta.json\n`);
        }
      } else {
        console.log(`  ℹ️  无需更新\n`);
      }

      return true;

    } catch (error) {
      console.error(`❌ [${featureId}] 处理错误: ${error.message}\n`);
      this.stats.errors++;
      return false;
    }
  }

  // 计算代码块哈希
  calculateHash(content) {
    return crypto
      .createHash('sha256')
      .update(content.trim())
      .digest('hex')
      .substring(0, 8);
  }

  // 打印汇总报告
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 哈希更新汇总报告');
    console.log('='.repeat(60));
    console.log(`总计: ${this.stats.total} 个代码引用`);
    console.log(`🔄 已更新: ${this.stats.updated}`);
    console.log(`✅ 未变更: ${this.stats.unchanged}`);
    console.log(`❌ 错误: ${this.stats.errors}`);
    console.log('='.repeat(60) + '\n');

    if (this.dryRun) {
      console.log('🔍 预览模式：未实际保存文件\n');
    }

    if (this.stats.updated > 0) {
      console.log('💡 建议: 运行 npm run validate-meta 验证更新结果\n');
    }
  }
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const featureId = args.find(arg => !arg.startsWith('--'));

  const updater = new HashUpdater({ dryRun });

  let success;
  if (all || !featureId) {
    success = updater.updateAll();
  } else {
    success = updater.updateOne(featureId);
  }

  process.exit(success ? 0 : 1);
}

module.exports = HashUpdater;
