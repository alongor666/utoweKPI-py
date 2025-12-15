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
            const mappingResponse = await fetch('./reference/business_type_mapping.json');
            if (!mappingResponse.ok) {
                throw new Error(`业务映射文件加载失败: ${mappingResponse.status}`);
            }
            const complexMapping = await mappingResponse.json();
            this.businessMapping = this.processBusinessMapping(complexMapping);
            console.log('业务映射加载成功:', this.businessMapping);
            
            // 加载年度计划
            const plansResponse = await fetch('./reference/year-plans.json');
            if (!plansResponse.ok) {
                throw new Error(`年度计划文件加载失败: ${plansResponse.status}`);
            }
            this.yearPlans = await plansResponse.json();
            console.log('年度计划加载成功:', this.yearPlans);
            
            // 加载阈值配置
            const thresholdsResponse = await fetch('./reference/thresholds.json');
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
     * 处理复杂的业务类型映射配置
     * @param {Object} complexMapping - 复杂的映射配置
     * @returns {Object} 简化的映射对象
     */
    processBusinessMapping(complexMapping) {
        const simpleMapping = {};
        
        // 处理主要业务类型
        if (complexMapping.business_types) {
            complexMapping.business_types.forEach(type => {
                simpleMapping[type.csv_raw_value] = type.category;
            });
        }
        
        // 处理兼容性映射
        if (complexMapping.compatibility_mappings) {
            complexMapping.compatibility_mappings.forEach(mapping => {
                simpleMapping[mapping.csv_raw_value] = 
                    complexMapping.business_types.find(t => t.ui_full_name === mapping.maps_to)?.category || "其他";
            });
        }
        
        console.log('业务映射处理完成:', simpleMapping);
        return simpleMapping;
    }

    /**
     * 初始化默认配置（当配置文件加载失败时使用）
     */
    initDefaultConfigs() {
        console.log('使用默认配置...');
        this.businessMapping = {
            "非营业客车新车": "非营业客车",
            "非营业客车旧车非过户": "非营业客车", 
            "非营业客车旧车过户": "非营业客车",
            "1吨以下非营业货车": "非营业货车",
            "1–2吨非营业货车": "非营业货车",
            "2吨以下营业货车": "营业货车",
            "2–9吨营业货车": "营业货车",
            "9–10吨营业货车": "营业货车",
            "10吨以上营业货车（普货）": "营业货车",
            "10吨以上营业货车（牵引）": "营业货车",
            "自卸车": "营业货车",
            "特种车": "营业货车",
            "其他营业货车": "营业货车",
            "摩托车": "其他",
            "出租车": "营业客车",
            "网约车": "营业客车"
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
            <script src="https://lib.baomitu.com/echarts/5.4.3/echarts.min.js" onerror="this.remove()"></script>
            <script src="https://cdn.bootcdn.net/ajax/libs/echarts/5.4.3/echarts.min.js" onerror="this.remove()"></script>
            <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
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
     * 从CSV数据中智能提取动态信息（支持中英文字段）
     * @param {Array} csvData - 原始CSV数据
     * @returns {Object} 提取的信息
     */
    extractDynamicInfo(csvData) {
        if (!csvData || csvData.length === 0) {
            return {
                year: '2025',
                week: '未知',
                updateDate: null,
                company: '四川分公司',
                analysisMode: 'single',
                organizationCount: 0,
                organizations: [],
                title: '经营分析报告'
            };
        }

        const firstRow = csvData[0];

        // 字段映射表（中英文）
        const fieldMapping = {
            year: ['保单年度', 'policy_start_year', '年度', '年份'],
            week: ['周次', 'week_number', '周'],
            date: ['snapshot_date', '快照日期', '更新日期', '统计日期'],
            organization: ['机构', '三级机构', 'third_level_organization', '分公司', '机构名称'],
            secondOrg: ['二级机构', 'second_level_organization']
        };

        // 智能字段查找函数
        const findFieldValue = (possibleFields) => {
            for (const field of possibleFields) {
                if (firstRow[field] !== undefined && firstRow[field] !== null && firstRow[field] !== '') {
                    return firstRow[field];
                }
            }
            return null;
        };

        // 提取保单年度
        let year = '2025';
        const yearValue = findFieldValue(fieldMapping.year);
        if (yearValue) {
            year = String(yearValue).trim();
        }

        // 提取周次
        let week = '未知';
        const weekValue = findFieldValue(fieldMapping.week);
        if (weekValue) {
            week = String(weekValue).replace('第', '').replace('周', '').trim();
        }

        // 提取更新日期
        let updateDate = null;
        const dateValue = findFieldValue(fieldMapping.date);
        if (dateValue) {
            updateDate = String(dateValue).trim();
            // 格式化日期为 YYYY-MM-DD
            if (updateDate.includes('T')) {
                updateDate = updateDate.split('T')[0];
            }
        }

        // 提取并分析三级机构
        const orgField = fieldMapping.organization.find(f => firstRow[f] !== undefined);
        const organizations = new Set();

        csvData.forEach(row => {
            const org = row[orgField];
            if (org && org !== '' && org !== null && org !== undefined) {
                organizations.add(String(org).trim());
            }
        });

        const organizationList = Array.from(organizations);
        const organizationCount = organizationList.length;

        // 判断分析模式
        let analysisMode = 'single';  // single: 单机构分析, multi: 多机构对比
        let company = '四川分公司';

        if (organizationCount === 1) {
            analysisMode = 'single';
            company = organizationList[0];
        } else if (organizationCount > 1) {
            analysisMode = 'multi';
            // 多机构时，尝试使用二级机构名称
            const secondOrgValue = findFieldValue(fieldMapping.secondOrg);
            company = secondOrgValue ? String(secondOrgValue).trim() + '分公司' : '四川分公司';
        }

        // 生成标题
        const modeText = analysisMode === 'single' ? '' : '（多机构对比）';
        const title = `${company}车险第${week}周经营分析${modeText}`;

        return {
            year: year,
            week: week,
            updateDate: updateDate,
            company: company,
            analysisMode: analysisMode,
            organizationCount: organizationCount,
            organizations: organizationList,
            title: title,
            // 添加详细信息用于调试
            detectedFields: {
                yearField: fieldMapping.year.find(f => firstRow[f] !== undefined),
                weekField: fieldMapping.week.find(f => firstRow[f] !== undefined),
                dateField: fieldMapping.date.find(f => firstRow[f] !== undefined),
                orgField: orgField
            }
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

        // 输出元数据到控制台，方便调试
        console.log('📊 提取的元数据:', dynamicInfo);
        console.log(`分析模式: ${dynamicInfo.analysisMode === 'single' ? '单机构分析' : '多机构对比'}`);
        console.log(`机构数量: ${dynamicInfo.organizationCount}`);
        console.log(`机构列表:`, dynamicInfo.organizations);

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