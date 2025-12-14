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
            console.log('开始加载配置数据...');
            
            // 加载业务类型映射
            const mappingResponse = await fetch('./reference/simple_mapping.json');
            if (!mappingResponse.ok) {
                throw new Error(`业务映射文件加载失败: ${mappingResponse.status}`);
            }
            this.businessMapping = await mappingResponse.json();
            console.log('业务映射加载成功:', this.businessMapping);
            
            // 加载年度计划
            const plansResponse = await fetch('./reference/simple_plans.json');
            if (!plansResponse.ok) {
                throw new Error(`年度计划文件加载失败: ${plansResponse.status}`);
            }
            this.yearPlans = await plansResponse.json();
            console.log('年度计划加载成功:', this.yearPlans);
            
            // 加载阈值配置
            const thresholdsResponse = await fetch('./reference/simple_thresholds.json');
            if (!thresholdsResponse.ok) {
                throw new Error(`阈值配置文件加载失败: ${thresholdsResponse.status}`);
            }
            this.thresholds = await thresholdsResponse.json();
            console.log('阈值配置加载成功:', this.thresholds);
            
            // 加载HTML模板
            const templateResponse = await fetch('./templates/四川分公司车险第49周经营分析模板.html');
            if (!templateResponse.ok) {
                throw new Error(`HTML模板文件加载失败: ${templateResponse.status}`);
            }
            this.template = await templateResponse.text();
            console.log('HTML模板加载成功');
            
        } catch (error) {
            console.error('配置数据加载失败:', error);
            // 不抛出错误，而是使用默认配置
            this.initDefaultConfigs();
        }
    }

    /**
     * 初始化默认配置（当配置文件加载失败时使用）
     */
    initDefaultConfigs() {
        console.log('使用默认配置...');
        this.businessMapping = {
            "私家车": "个人车险",
            "企业用车": "商业车险",
            "摩托车": "个人车险",
            "货车": "商业车险"
        };
        
        this.yearPlans = {
            "2025": {
                "target_premium": 10000000,
                "target_growth": 0.1
            }
        };
        
        this.thresholds = {
            "成本率": {"warning": 0.15, "critical": 0.20},
            "赔付率": {"warning": 0.60, "critical": 0.70},
            "综合成本率": {"warning": 0.75, "critical": 0.85}
        };
        
        // 使用简单的默认模板
        this.template = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>经营分析报告</title>
            <script src="./assets/echarts.min.js"></script>
        </head>
        <body>
            <h1>经营分析报告</h1>
            <div id="main-content">
                <p>报告生成中...</p>
            </div>
            <script>
                window.reportData = {};
                console.log('报告数据已加载');
            </script>
        </body>
        </html>`;
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
     * 从CSV数据中提取动态信息
     * @param {Array} csvData - 原始CSV数据
     * @returns {Object} 提取的信息
     */
    extractDynamicInfo(csvData) {
        if (!csvData || csvData.length === 0) {
            return {
                year: '2025',
                week: '未知',
                company: '四川分公司',
                title: '经营分析报告'
            };
        }

        // 提取年份（从保单年度字段）
        let year = '2025';
        const yearField = csvData[0]['保单年度'] || csvData[0]['年度'] || csvData[0]['年份'];
        if (yearField) {
            year = String(yearField).trim();
        }

        // 提取周次（从周次字段）
        let week = '未知';
        const weekField = csvData[0]['周次'] || csvData[0]['周'] || csvData[0]['week'];
        if (weekField) {
            week = String(weekField).replace('第', '').replace('周', '').trim();
        }

        // 提取机构名称（从机构字段）
        let company = '四川分公司';
        const companyField = csvData[0]['机构'] || csvData[0]['分公司'] || csvData[0]['机构名称'];
        if (companyField) {
            company = String(companyField).trim();
        }

        return {
            year: year,
            week: week,
            company: company,
            title: `${company}车险第${week}周经营分析`
        };
    }

    /**
     * 生成HTML报告
     * @param {Object} data - 处理后的数据
     * @returns {string} HTML报告
     */
    generateHTML(data) {
        // 提取动态信息
        const dynamicInfo = this.extractDynamicInfo(data.original);
        
        let html = this.template;
        
        // 替换动态标题信息
        html = html.replace(/华安保险车险第49周经营分析 - 四川/g, dynamicInfo.title);
        html = html.replace(/第49周/g, `第${dynamicInfo.week}周`);
        html = html.replace(/2025/g, dynamicInfo.year);
        html = html.replace(/四川分公司/g, dynamicInfo.company);
        
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
            window.dynamicInfo = ${JSON.stringify(dynamicInfo, null, 2)};
            // 触发图表渲染
            if (typeof renderCharts === 'function') {
                setTimeout(renderCharts, 100);
            }
        </script>`;
        
        html = html.replace('</body>', dataScript + '</body>');
        
        return html;
    }
}