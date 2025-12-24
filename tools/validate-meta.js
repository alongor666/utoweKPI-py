#!/usr/bin/env node

/**
 * 🔍 Meta.json 验证工具
 *
 * 功能:
 * 1. 验证 meta.json 是否符合 JSON Schema 规范
 * 2. 检查代码引用的文件是否存在
 * 3. 验证文档交叉引用的有效性
 * 4. 生成验证报告
 *
 * 使用方法:
 *   node tools/validate-meta.js                  # 验证所有 meta.json
 *   node tools/validate-meta.js F001             # 验证指定功能模块
 *   node tools/validate-meta.js --fix            # 自动修复部分问题
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 检查依赖
let Ajv;
try {
  Ajv = require('ajv');
} catch (e) {
  console.error('❌ 缺少依赖: ajv');
  console.error('请运行: npm install ajv ajv-formats');
  process.exit(1);
}

const addFormats = require('ajv-formats');

class MetaValidator {
  constructor(options = {}) {
    this.projectRoot = path.resolve(__dirname, '..');
    this.featuresRoot = path.join(this.projectRoot, '开发文档', '01_features');
    this.schemaPath = path.join(__dirname, 'schemas', 'meta-schema.json');
    this.autoFix = options.autoFix || false;

    // 初始化 JSON Schema 验证器
    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
    this.schema = JSON.parse(fs.readFileSync(this.schemaPath, 'utf8'));
    this.validate = ajv.compile(this.schema);

    // 统计信息
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  // 验证所有 meta.json
  validateAll() {
    console.log('🔍 开始验证所有功能模块元数据...\n');

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

    let allValid = true;
    featureDirs.forEach(dirName => {
      const result = this.validateOne(dirName);
      if (!result) allValid = false;
    });

    this.printSummary();
    return allValid;
  }

  // 验证单个功能模块
  validateOne(featureId) {
    this.stats.total++;

    const metaPath = path.join(this.featuresRoot, featureId, 'meta.json');

    if (!fs.existsSync(metaPath)) {
      console.error(`❌ [${featureId}] meta.json 不存在: ${metaPath}`);
      this.stats.failed++;
      return false;
    }

    console.log(`📄 验证 [${featureId}]...`);

    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

      // 1. JSON Schema 验证
      const schemaValid = this.validateSchema(meta, featureId);

      // 2. 代码引用验证
      const codeRefsValid = this.validateCodeReferences(meta, featureId);

      // 3. 文档引用验证
      const docRefsValid = this.validateDocReferences(meta, featureId);

      // 4. 哈希一致性验证
      const hashValid = this.validateCodeHashes(meta, featureId);

      const allValid = schemaValid && codeRefsValid && docRefsValid && hashValid;

      if (allValid) {
        console.log(`✅ [${featureId}] 验证通过\n`);
        this.stats.passed++;
      } else {
        console.log(`❌ [${featureId}] 验证失败\n`);
        this.stats.failed++;
      }

      return allValid;

    } catch (error) {
      console.error(`❌ [${featureId}] 解析错误: ${error.message}\n`);
      this.stats.failed++;
      return false;
    }
  }

  // 验证 JSON Schema
  validateSchema(meta, featureId) {
    const valid = this.validate(meta);

    if (!valid) {
      console.error(`  ❌ Schema 验证失败:`);
      this.validate.errors.forEach(error => {
        const path = error.instancePath || 'root';
        console.error(`     ${path}: ${error.message}`);
        if (error.params) {
          console.error(`     参数: ${JSON.stringify(error.params)}`);
        }
      });
      return false;
    }

    console.log(`  ✅ Schema 验证通过`);
    return true;
  }

  // 验证代码引用
  validateCodeReferences(meta, featureId) {
    if (!meta.code_references || meta.code_references.length === 0) {
      console.warn(`  ⚠️  缺少代码引用 (code_references)`);
      this.stats.warnings++;
      return true; // 不强制要求
    }

    let allValid = true;
    meta.code_references.forEach((ref, index) => {
      const filePath = path.join(this.projectRoot, ref.file);

      if (!fs.existsSync(filePath)) {
        console.error(`  ❌ 代码引用 #${index + 1}: 文件不存在 - ${ref.file}`);
        allValid = false;
      } else {
        console.log(`  ✅ 代码引用 #${index + 1}: ${ref.label} (${ref.file})`);
      }
    });

    return allValid;
  }

  // 验证文档引用
  validateDocReferences(meta, featureId) {
    if (!meta.doc_references || meta.doc_references.length === 0) {
      // 文档引用是可选的
      return true;
    }

    let allValid = true;
    meta.doc_references.forEach((ref, index) => {
      // 检查引用的文档是否存在
      const targetMetaPath = path.join(this.featuresRoot, ref.doc_id, 'meta.json');

      if (!fs.existsSync(targetMetaPath)) {
        console.error(`  ❌ 文档引用 #${index + 1}: 目标文档不存在 - ${ref.doc_id}`);
        allValid = false;
      } else {
        console.log(`  ✅ 文档引用 #${index + 1}: ${ref.type} → ${ref.doc_id}`);

        // 检查双向引用
        if (ref.bidirectional) {
          const targetMeta = JSON.parse(fs.readFileSync(targetMetaPath, 'utf8'));
          const hasBackRef = targetMeta.doc_references?.some(
            r => r.doc_id === meta.id
          );

          if (!hasBackRef) {
            console.warn(`  ⚠️  双向引用缺失: ${ref.doc_id} 未引用回 ${meta.id}`);
            this.stats.warnings++;
          }
        }
      }
    });

    return allValid;
  }

  // 验证代码哈希
  validateCodeHashes(meta, featureId) {
    if (!meta.code_references || meta.code_references.length === 0) {
      return true;
    }

    let allValid = true;
    meta.code_references.forEach((ref, index) => {
      if (!ref.hash) {
        console.warn(`  ⚠️  代码引用 #${index + 1} 缺少哈希值`);
        this.stats.warnings++;
        return;
      }

      const filePath = path.join(this.projectRoot, ref.file);
      if (!fs.existsSync(filePath)) {
        return; // 文件不存在已在前面检查
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      if (ref.lines) {
        const [start, end] = ref.lines.includes('-')
          ? ref.lines.split('-').map(Number)
          : [Number(ref.lines), Number(ref.lines)];

        const codeBlock = lines.slice(start - 1, end).join('\n');
        const currentHash = this.calculateHash(codeBlock);

        if (currentHash !== ref.hash) {
          console.error(`  ❌ 代码引用 #${index + 1}: 哈希不匹配 (代码已变更)`);
          console.error(`     预期: ${ref.hash}`);
          console.error(`     实际: ${currentHash}`);
          console.error(`     建议: 检查代码变更并更新文档`);
          allValid = false;
        } else {
          console.log(`  ✅ 代码引用 #${index + 1}: 哈希一致 (未变更)`);
        }
      }
    });

    return allValid;
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
    console.log('📊 验证汇总报告');
    console.log('='.repeat(60));
    console.log(`总计: ${this.stats.total} 个功能模块`);
    console.log(`✅ 通过: ${this.stats.passed}`);
    console.log(`❌ 失败: ${this.stats.failed}`);
    console.log(`⚠️  警告: ${this.stats.warnings}`);
    console.log('='.repeat(60) + '\n');

    if (this.stats.failed > 0) {
      console.log('💡 建议:');
      console.log('   1. 修复上述错误');
      console.log('   2. 运行 node tools/update-hashes.js 更新哈希值');
      console.log('   3. 重新验证: node tools/validate-meta.js\n');
    } else if (this.stats.warnings > 0) {
      console.log('💡 提示: 存在警告，建议完善元数据\n');
    } else {
      console.log('🎉 所有元数据验证通过！\n');
    }
  }
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const autoFix = args.includes('--fix');
  const featureId = args.find(arg => !arg.startsWith('--'));

  const validator = new MetaValidator({ autoFix });

  let success;
  if (featureId) {
    success = validator.validateOne(featureId);
  } else {
    success = validator.validateAll();
  }

  process.exit(success ? 0 : 1);
}

module.exports = MetaValidator;
