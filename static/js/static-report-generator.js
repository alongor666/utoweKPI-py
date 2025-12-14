/**
 * 静态报告生成器 - 将原Flask后端逻辑转换为前端JavaScript处理
 * 保持所有业务逻辑和计算规则完全一致
 */
class StaticReportGenerator {
    constructor() {
        // 业务配置数据
        this.businessMapping = null;
        this.yearPlans = null;
        this.thresholds = null;
        this.template = null;
        
        // 初始化配置数据
        this.initConfigs();
    }

    /**
     * 初始化配置数据
     */
    async initConfigs() {
        try {
            // 加载业务类型映射
            const mappingResponse = await fetch('../reference/business_type_mapping.json');
            this.businessMapping = await mappingResponse.json();
            
            // 加载年度计划
            const plansResponse = await fetch('../reference/year-plans.json');
            this.yearPlans = await plansResponse.json();
            
            // 加载阈值配置
            const thresholdsResponse = await fetch('../reference/thresholds.json');
            this.thresholds = await thresholdsResponse.json();
            
            // 加载HTML模板
            const templateResponse = await fetch('../templates/四川分公司车险第49周经营分析模板.html');
            this.template = await templateResponse.text();
            
        } catch (error) {
            console.error('配置数据加载失败:', error);
            throw new Error('配置数据加载失败，请检查文件是否存在');
        }
    }

    /**
     * 生成报告主函数
     * @param {File} csvFile - 上传的CSV文件
     * @returns {Promise<string>} 生成的HTML报告
     */
    async generateReport(csvFile) {
        // 等待配置数据加载完成
        while (!this.businessMapping || !this.yearPlans || !this.thresholds || !this.template) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 解析CSV数据
        const csvData = await this.parseCSV(csvFile);
        
        // 处理数据（映射、计算、聚合）
        const processedData = this.processData(csvData);
        
        // 生成HTML报告
        const reportHtml = this.generateHTML(processedData);
        
        return reportHtml;
    }

    /**
     * 解析CSV文件
     * @param {File} file - CSV文件
     * @returns {Promise<Array>} 解析后的数据数组
     */
    parseCSV(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    if (results.errors.length > 0) {
                        reject(new Error('CSV解析错误: ' + results.errors[0].message));
                    } else {
                        resolve(results.data.filter(row => Object.keys(row).length > 0));
                    }
                },
                error: (error) => {
                    reject(new Error('CSV文件读取失败: ' + error.message));
                }
            });
        });
    }

    /**
     * 处理数据 - 核心业务逻辑
     * @param {Array} csvData - 原始CSV数据
     * @returns {Object} 处理后的数据对象
     */
    processData(csvData) {
        // 数据清洗和映射
        const mappedData = this.mapBusinessTypes(csvData);
        
        // KPI计算
        const kpiData = this.calculateKPIs(mappedData);
        
        // 数据聚合
        const aggregatedData = this.aggregateData(kpiData);
        
        return {
            original: csvData,
            mapped: mappedData,
            kpis: kpiData,
            aggregated: aggregatedData,
            summary: this.generateSummary(aggregatedData)
        };
    }

    /**
     * 业务类型映射
     * @param {Array} data - 原始数据
     * @returns {Array} 映射后的数据
     */
    mapBusinessTypes(data) {
        return data.map(row => {
            const mappedRow = { ...row };
            
            // 根据业务类型映射表进行映射
            if (row.业务类型 && this.businessMapping[row.业务类型]) {
                mappedRow.业务类型映射 = this.businessMapping[row.业务类型];
            }
            
            return mappedRow;
        });
    }

    /**
     * KPI计算
     * @param {Array} data - 映射后的数据
     * @returns {Array} 计算KPI后的数据
     */
    calculateKPIs(data) {
        return data.map(row => {
            const kpiRow = { ...row };
            
            // 计算基础KPI
            const premium = parseFloat(row.保费收入 || 0);
            const cost = parseFloat(row.变动成本 || 0);
            const claims = parseFloat(row.赔款支出 || 0);
            
            kpiRow.成本率 = cost / premium || 0;
            kpiRow.赔付率 = claims / premium || 0;
            kpiRow.综合成本率 = (cost + claims) / premium || 0;
            
            // 计算时间进度相关KPI
            const weekNum = parseInt(row.周次 || 1);
            kpiRow.时间进度 = weekNum / 52; // 假设52周一年
            
            return kpiRow;
        });
    }

    /**
     * 数据聚合
     * @param {Array} data - KPI数据
     * @returns {Object} 聚合结果
     */
    aggregateData(data) {
        const aggregated = {
            total: {
                保费收入: 0,
                变动成本: 0,
                赔款支出: 0,
                保单件数: 0
            },
            byBusinessType: {},
            byWeek: {}
        };

        data.forEach(row => {
            // 总量聚合
            aggregated.total.保费收入 += parseFloat(row.保费收入 || 0);
            aggregated.total.变动成本 += parseFloat(row.变动成本 || 0);
            aggregated.total.赔款支出 += parseFloat(row.赔款支出 || 0);
            aggregated.total.保单件数 += parseInt(row.保单件数 || 0);

            // 按业务类型聚合
            const businessType = row.业务类型映射 || row.业务类型 || '未知';
            if (!aggregated.byBusinessType[businessType]) {
                aggregated.byBusinessType[businessType] = {
                    保费收入: 0,
                    变动成本: 0,
                    赔款支出: 0,
                    保单件数: 0
                };
            }
            aggregated.byBusinessType[businessType].保费收入 += parseFloat(row.保费收入 || 0);
            aggregated.byBusinessType[businessType].变动成本 += parseFloat(row.变动成本 || 0);
            aggregated.byBusinessType[businessType].赔款支出 += parseFloat(row.赔款支出 || 0);
            aggregated.byBusinessType[businessType].保单件数 += parseInt(row.保单件数 || 0);

            // 按周聚合
            const week = row.周次 || '未知';
            if (!aggregated.byWeek[week]) {
                aggregated.byWeek[week] = {
                    保费收入: 0,
                    变动成本: 0,
                    赔款支出: 0,
                    保单件数: 0
                };
            }
            aggregated.byWeek[week].保费收入 += parseFloat(row.保费收入 || 0);
            aggregated.byWeek[week].变动成本 += parseFloat(row.变动成本 || 0);
            aggregated.byWeek[week].赔款支出 += parseFloat(row.赔款支出 || 0);
            aggregated.byWeek[week].保单件数 += parseInt(row.保单件数 || 0);
        });

        return aggregated;
    }

    /**
     * 生成汇总数据
     * @param {Object} aggregated - 聚合数据
     * @returns {Object} 汇总结果
     */
    generateSummary(aggregated) {
        const total = aggregated.total;
        
        return {
            总保费: total.保费收入,
            总成本: total.变动成本 + total.赔款支出,
            成本率: (total.变动成本 + total.赔款支出) / total.保费收入 || 0,
            保单件数: total.保单件数,
            平均保费: total.保费收入 / total.保单件数 || 0
        };
    }

    /**
     * 生成HTML报告
     * @param {Object} data - 处理后的数据
     * @returns {string} HTML报告
     */
    generateHTML(data) {
        let html = this.template;
        
        // 替换数据占位符
        html = html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const keys = key.trim().split('.');
            let value = data;
            
            for (const k of keys) {
                value = value && value[k] !== undefined ? value[k] : match;
            }
            
            // 格式化数值
            if (typeof value === 'number') {
                return value.toLocaleString('zh-CN', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
            }
            
            return value || match;
        });
        
        // 注入数据到JavaScript变量
        const dataScript = `
        <script>
            window.reportData = ${JSON.stringify(data, null, 2)};
            // 触发图表渲染
            if (typeof renderCharts === 'function') {
                setTimeout(renderCharts, 100);
            }
        </script>`;
        
        html = html.replace('</body>', dataScript + '</body>');
        
        return html;
    }
}