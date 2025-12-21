// Web Worker for processing CSV data off the main thread

importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');
importScripts('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js');

let rawCSVData = null;
let businessMapping = null;
let yearPlans = null;
let thresholds = null;

// Handle messages from the main thread
self.onmessage = function(e) {
    const { type, payload } = e.data;

    try {
        switch (type) {
            case 'init':
                businessMapping = payload.businessMapping;
                yearPlans = payload.yearPlans;
                thresholds = payload.thresholds;
                self.postMessage({ type: 'init_complete' });
                break;

            case 'parse_csv':
            case 'parse_file':
                parseFile(payload.file);
                break;

            case 'process_data':
                if (!rawCSVData) throw new Error('No CSV data loaded');
                const processedData = processData(rawCSVData);
                self.postMessage({ type: 'process_complete', payload: processedData });
                break;

            case 'filter_data':
                if (!rawCSVData) throw new Error('No CSV data loaded');
                const filteredResult = applyFiltersAndRecalc(rawCSVData, payload.filterState);
                self.postMessage({ type: 'filter_complete', payload: filteredResult });
                break;

            case 'get_dimension_values':
                if (!rawCSVData) throw new Error('No CSV data loaded');
                const { dimension, currentFilters } = payload;
                const values = getDimensionValues(rawCSVData, dimension, currentFilters);
                self.postMessage({ type: 'dimension_values_response', payload: values });
                break;

            case 'get_raw_data_slice':
                // For performance, we might want to avoid sending huge data
                // But for now, we keep the original logic flow if possible
                // However, sending 200MB data back to main thread is bad.
                // We should only send what's needed.
                // If the main thread needs raw data for download/preview, we can send it.
                // But preferably we keep it here.
                break;
        }
    } catch (error) {
        self.postMessage({ type: 'error', payload: error.message });
    }
};

function parseFile(file) {
    if (file.name.toLowerCase().endsWith('.csv')) {
        parseCSV(file);
    } else if (file.name.toLowerCase().match(/\.xlsx?$/)) {
        parseExcel(file);
    } else if (file.name.toLowerCase().endsWith('.json')) {
        parseJSON(file);
    } else {
        self.postMessage({ type: 'error', payload: '不支持的文件格式: ' + file.name });
    }
}

function parseJSON(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (Array.isArray(json)) {
                rawCSVData = json;
                self.postMessage({ type: 'parse_complete', payload: { rowCount: rawCSVData.length } });
            } else {
                self.postMessage({ type: 'error', payload: 'JSON格式错误: 根对象必须是数组' });
            }
        } catch (err) {
            self.postMessage({ type: 'error', payload: 'JSON 解析失败: ' + err.message });
        }
    };
    reader.onerror = function(err) {
        self.postMessage({ type: 'error', payload: '文件读取失败: ' + err.message });
    };
    reader.readAsText(file);
}

function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            // defval: "" 确保空单元格为空字符串
            const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            // 过滤空行
            rawCSVData = json.filter(row => Object.keys(row).length > 0);
            self.postMessage({ type: 'parse_complete', payload: { rowCount: rawCSVData.length } });
        } catch (err) {
            self.postMessage({ type: 'error', payload: 'Excel 解析失败: ' + err.message });
        }
    };
    reader.onerror = function(err) {
        self.postMessage({ type: 'error', payload: '文件读取失败: ' + err.message });
    };
    reader.readAsArrayBuffer(file);
}

function parseCSV(file) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: function(header) {
            // Remove BOM and clean up header names
            return header.replace(/^\uFEFF/, '').trim();
        },
        complete: function(results) {
            if (results.errors.length > 0) {
                self.postMessage({ type: 'error', payload: 'CSV Parsing Error: ' + results.errors[0].message });
            } else {
                // Filter empty rows and rows with empty first column
                rawCSVData = results.data.filter(row => {
                    const keys = Object.keys(row);
                    return keys.length > 0 && keys[0] !== '' && row[keys[0]];
                });
                console.log('CSV解析完成，数据行数:', rawCSVData.length);
                console.log('首行数据样例:', rawCSVData[0]);
                self.postMessage({ type: 'parse_complete', payload: { rowCount: rawCSVData.length } });
            }
        },
        error: function(error) {
            self.postMessage({ type: 'error', payload: 'CSV Parsing failed: ' + error.message });
        }
    });
}

// Reuse logic from StaticReportGenerator
// We need to copy the helper methods here or import them.
// Since we don't have modules setup easily without bundlers, we'll duplicate the logic for now
// or better, we can importScripts if we split the logic.
// For this task, I will include the core logic here.

function processData(csvData) {
    console.log('[Worker] 开始处理数据，行数:', csvData.length);

    // 1. Map business types
    const mappedData = mapBusinessTypes(csvData);
    console.log('[Worker] 业务类型映射完成');

    // 2. Global KPIs
    const globalKPIs = calculateKPIsForGroup(mappedData);
    console.log('[Worker] 全局KPI计算完成:', globalKPIs);
    const totalPremium = globalKPIs['签单保费'];
    const totalClaim = globalKPIs['已报告赔款'];
    
    // 7. Dynamic Info
    const dynamicInfo = extractDynamicInfo(csvData);

    // 计算时间进度
    const timeProgress = calculateTimeProgress(dynamicInfo.updateDate);
    console.log('[Worker] 时间进度:', timeProgress);

    // 2. Global KPIs (Recalculate with timeProgress if needed, but calculateKPIsForGroup handles it)
    // We need to pass timeProgress to KPI calculation functions
    
    // 3. Year Plans
    const planMap = loadYearPlans();
    
    // 计算总计划保费（用于计算整体保费进度达成率）
    // 修正逻辑：根据当前数据中的机构来动态汇总计划，而不是累加所有非本部机构
    // dynamicInfo.organizations 包含了当前数据中的所有三级机构
    let totalPlanPremium = 0;
    if (planMap.size > 0) {
        // 如果是单机构模式，只取该机构的计划
        if (dynamicInfo.analysisMode === 'single' && dynamicInfo.organizations.length > 0) {
            const org = dynamicInfo.organizations[0];
            const plan = getPlanForOrganization(planMap, org);
            if (plan) totalPlanPremium = plan.premium;
        } else {
            // 多机构模式，通常是全省或者多个机构
            // 如果是全省（包含四川分公司），应该直接取四川分公司的计划？
            // 或者：根据数据中出现的每一个机构，累加它们的计划？
            // 用户的 year-plans.json 里有 "四川分公司" 总数，也有各机构分项。
            // 安全的做法：累加当前数据中存在的所有三级机构的计划值。
            dynamicInfo.organizations.forEach(org => {
                const plan = getPlanForOrganization(planMap, org);
                if (plan) {
                    totalPlanPremium += plan.premium || 0;
                }
            });
            
            // 如果累加结果为0（可能是因为数据里只有二级机构名没三级机构？），尝试取"四川分公司"
            if (totalPlanPremium === 0 && planMap.has('四川分公司')) {
                totalPlanPremium = planMap.get('四川分公司').premium;
            }
        }
    }
    
    // 4. Aggregations (Pass timeProgress)
    const dataByOrg = aggregateByDimension(mappedData, 'third_level_organization', '机构', planMap, totalPremium, totalClaim, timeProgress);
    const dataByCategory = aggregateByDimension(mappedData, 'customer_category_3', '客户类别', null, totalPremium, totalClaim, timeProgress);
    const dataByBusinessType = aggregateByDimension(mappedData, 'ui_short_label', '业务类型简称', null, totalPremium, totalClaim, timeProgress);
    
    // 5. Global Ratios
    const globalClaimRate = globalKPIs['满期赔付率'];
    const globalExpenseRate = globalKPIs['费用率'];
    const globalCostRate = globalKPIs['变动成本率'];
    
    // 6. Problem detection
    const problems = detectProblems(dataByOrg);

    // 8. 计算整体保费时间进度达成率
    // 公式：(实际保费 / 年度计划) / 时间进度
    let globalProgressRate = null;
    if (totalPlanPremium > 0 && timeProgress > 0) {
        const rawAchievementRate = totalPremium / totalPlanPremium; // 实际完成比例
        globalProgressRate = (rawAchievementRate / timeProgress) * 100; // 时间进度达成率
    }

    console.log('[Worker] 保费进度计算:', {
        totalPremium,
        totalPlanPremium,
        timeProgress,
        progressRate: globalProgressRate
    });

    return {
        original: {
            // We do NOT send back the full raw data to avoid memory cloning issues on large files
            // unless strictly requested.
            // The template generation logic in main thread currently expects `data.original`.
            // We need to adjust this.
            // For now, we omit 'original' raw array and only send dynamic info.
            dynamicInfo: dynamicInfo
        },
        summary: {
            签单保费: totalPremium,
            满期赔付率: globalClaimRate,
            费用率: globalExpenseRate,
            变动成本率: globalCostRate,
            已报告赔款: totalClaim,
            保费时间进度达成率: globalProgressRate
        },
        problems: problems.slice(0, 5),
        dataByOrg: dataByOrg,
        dataByCategory: dataByCategory,
        dataByBusinessType: dataByBusinessType,
        thresholds: thresholds || {},
        dynamicInfo: dynamicInfo, // Explicitly pass dynamic info
        // 顶层暴露week和year字段，供页面标题使用
        week: dynamicInfo.week,
        year: dynamicInfo.year,
        organizations: dynamicInfo.organizations
    };
}

function calculateTimeProgress(dateStr) {
    if (!dateStr) return 1; // Fallback to 100% if no date

    try {
        const snapshotDate = new Date(dateStr);
        if (isNaN(snapshotDate.getTime())) return 1;

        // 计算基准日：更新日期的前一日
        const baseDate = new Date(snapshotDate);
        baseDate.setDate(baseDate.getDate() - 1);
        
        const year = baseDate.getFullYear();
        
        // 判断闰年
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const daysInYear = isLeap ? 366 : 365;
        
        // 计算序数日 (Day of Year)
        const startOfYear = new Date(year, 0, 1);
        const diffTime = baseDate - startOfYear;
        const dayOfYear = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        // 计算已过天数 = 序数日 - 1
        const passedDays = dayOfYear - 1;
        
        if (passedDays <= 0) return 0.0001; // 避免分母为0
        
        return passedDays / daysInYear;
    } catch (e) {
        console.error('Time progress calculation failed:', e);
        return 1;
    }
}

function mapBusinessTypes(csvData) {
    return csvData.map(row => {
        // Optimization: Don't copy the whole row if not needed, but we need all fields for later.
        // For 200MB, we should be careful.
        // V8 engine handles string interning, so keys are fine.
        
        const businessType = row.business_type_category || row['业务类型分类'];
        let ui_short_label = businessType || '其他';
        let ui_category = '其他';

        if (businessType && businessMapping && businessMapping[businessType]) {
            ui_short_label = businessMapping[businessType].ui_short_label;
            ui_category = businessMapping[businessType].category;
        }

        // We modify the row in place to save memory, instead of creating a new object
        row.ui_short_label = ui_short_label;
        row.ui_category = ui_category;
        return row;
    });
}

function loadYearPlans() {
    if (!yearPlans || !yearPlans['年度保费计划']) {
        return new Map();
    }
    const planMap = new Map();
    const plans = yearPlans['年度保费计划'];
    for (const [orgName, premiumPlan] of Object.entries(plans)) {
        planMap.set(orgName, { premium: premiumPlan });
    }
    return planMap;
}

/**
 * 根据机构名称从年度计划映射中查找匹配项（支持常见后缀与模糊匹配兜底）。
 * @param {Map<string, {premium: number}>} planMap 年度计划映射
 * @param {string} organizationName 机构名称（来自数据维度值）
 * @returns {{premium: number} | null} 匹配到的计划对象
 */
function getPlanForOrganization(planMap, organizationName) {
    if (!planMap || !organizationName) return null;

    const raw = String(organizationName).trim();
    if (!raw) return null;

    const candidates = [];
    const add = (v) => {
        const s = String(v || '').trim();
        if (!s) return;
        if (!candidates.includes(s)) candidates.push(s);
    };

    add(raw);
    add(raw.replace(/\s+/g, ''));

    const suffixStripped = raw.replace(/(中心支公司|支公司|分公司|营业部|营销服务部|本部)$/g, '').trim();
    add(suffixStripped);
    add(suffixStripped.replace(/\s+/g, ''));

    for (const key of candidates) {
        if (planMap.has(key)) return planMap.get(key);
    }

    let matchedKey = null;
    for (const key of planMap.keys()) {
        if (raw === key) return planMap.get(key);
        if (raw.includes(key) || key.includes(raw)) {
            if (matchedKey && matchedKey !== key) {
                matchedKey = null;
                break;
            }
            matchedKey = key;
        }
    }
    return matchedKey ? planMap.get(matchedKey) : null;
}

function calculateKPIsForGroup(groupData, plan = null, timeProgress = 1) {
    const fieldMap = {
        premium: ['signed_premium_yuan', '签单保费'],
        maturedPremium: ['matured_premium_yuan', '满期保费'],
        claim: ['reported_claim_payment_yuan', '已报告赔款'],
        expense: ['expense_amount_yuan', '费用额'],
        policyCount: ['policy_count', '保单件数'],
        claimCount: ['claim_case_count', '赔案件数']
    };

    const getField = (row, fieldNames) => {
        for (const name of fieldNames) {
            const val = row[name];
            if (val !== undefined && val !== null && val !== '') {
                return parseFloat(val) || 0;
            }
        }
        return 0;
    };

    let sum_signed_premium = 0;
    let sum_matured_premium = 0;
    let sum_reported_claim = 0;
    let sum_expense = 0;
    let sum_policy_count = 0;
    let sum_claim_case_count = 0;

    // Use for loop for better performance than forEach
    for (let i = 0; i < groupData.length; i++) {
        const row = groupData[i];
        sum_signed_premium += getField(row, fieldMap.premium);
        sum_matured_premium += getField(row, fieldMap.maturedPremium);
        sum_reported_claim += getField(row, fieldMap.claim);
        sum_expense += getField(row, fieldMap.expense);
        sum_policy_count += getField(row, fieldMap.policyCount);
        sum_claim_case_count += getField(row, fieldMap.claimCount);
    }

    const safeDivide = (n, d) => (d === 0 || isNaN(d)) ? 0 : n / d;

    const claim_rate = safeDivide(sum_reported_claim, sum_matured_premium) * 100;
    const expense_rate = safeDivide(sum_expense, sum_signed_premium) * 100;
    const cost_rate = claim_rate + expense_rate;
    const claim_frequency = safeDivide(sum_claim_case_count, sum_policy_count) * 100;
    const average_claim = safeDivide(sum_reported_claim, sum_claim_case_count);

    let achievement_rate = null;
    if (plan && plan.premium && plan.premium > 0 && timeProgress > 0) {
        // 公式：保费达成率 / 时间进度
        achievement_rate = (sum_signed_premium / plan.premium) / timeProgress * 100;
    }

    return {
        签单保费: sum_signed_premium,
        满期保费: sum_matured_premium,
        已报告赔款: sum_reported_claim,
        费用额: sum_expense,
        保单件数: sum_policy_count,
        赔案件数: sum_claim_case_count,
        满期赔付率: claim_rate,
        费用率: expense_rate,
        变动成本率: cost_rate,
        出险率: claim_frequency,
        案均赔款: average_claim,
        年计划达成率: achievement_rate
    };
}

function aggregateByDimension(csvData, dimensionField, labelName, planMap, totalPremium, totalClaim, timeProgress) {
    const groups = {};
    for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        // Handle multiple possible field names for dimension
        let dimensionValue = row[dimensionField];
        
        // If dimensionField is actually an array of candidates (simple hack for now)
        // But here we pass specific key.
        // Exception: 'third_level_organization' might be '三级机构'
        if (!dimensionValue && dimensionField === 'third_level_organization') {
            dimensionValue = row['三级机构'] || row['机构'];
        }
        if (!dimensionValue && dimensionField === 'customer_category_3') {
            dimensionValue = row['客户类别'];
        }
        
        if (!dimensionValue) continue;

        if (!groups[dimensionValue]) {
            groups[dimensionValue] = [];
        }
        groups[dimensionValue].push(row);
    }

    const results = [];
    for (const [dimensionValue, groupData] of Object.entries(groups)) {
        const plan = planMap ? getPlanForOrganization(planMap, dimensionValue) : null;
        const kpis = calculateKPIsForGroup(groupData, plan, timeProgress);
        const premium_share = totalPremium > 0 ? (kpis['签单保费'] / totalPremium * 100) : 0;
        const claim_share = totalClaim > 0 ? (kpis['已报告赔款'] / totalClaim * 100) : 0;

        const progressRate = kpis['年计划达成率'];
        results.push({
            [labelName]: dimensionValue,
            ...kpis,
            保费占比: premium_share,
            已报告赔款占比: claim_share,
            保费时间进度达成率: progressRate
        });
    }

    // 计算总费用金额用于费用占比计算
    const totalExpense = results.reduce((sum, item) => sum + (item.费用额 || 0), 0);
    
    // 为每个项目添加费用占比
    results.forEach(item => {
        item.费用占比 = totalExpense > 0 ? ((item.费用额 || 0) / totalExpense * 100) : 0;
    });

    results.sort((a, b) => b.签单保费 - a.签单保费);
    return results;
}

function detectProblems(dataByOrg) {
    const th_cost = (thresholds?.['问题机构识别阈值']?.['变动成本率超标']) || 93;
    const th_premium = (thresholds?.['问题机构识别阈值']?.['年保费未达标']) || 95;
    const th_expense = (thresholds?.['问题机构识别阈值']?.['费用率超标']) || 18;

    const problems = [];
    dataByOrg.forEach(org => {
        if (org.变动成本率 > th_cost) {
            problems.push(`${org.机构}(成本超标)`);
        } else if (org.年计划达成率 > 0 && org.年计划达成率 < th_premium) {
            problems.push(`${org.机构}(保费未达标)`);
        }
        if (org.费用率 > th_expense) {
            problems.push(`${org.机构}(费用率高)`);
        }
    });
    return problems;
}

function extractDynamicInfo(csvData) {
    if (!csvData || csvData.length === 0) {
        console.warn('[Worker] extractDynamicInfo: 空数据，返回默认值');
        return {};
    }

    const firstRow = csvData[0];

    // 智能字段查找函数
    const findVal = (keys) => {
        for (const k of keys) {
            if (firstRow[k] !== undefined && firstRow[k] !== null && firstRow[k] !== '') {
                return firstRow[k];
            }
        }
        return null;
    };

    // 提取保单年度
    let year = findVal(['保单年度', 'policy_start_year', '年度', '年份']) || '2025';
    year = String(year).trim();

    // 提取周次
    let week = findVal(['周次', 'week_number', '周']) || '未知';
    week = String(week).replace(/第|周/g, '').trim();

    // 提取更新日期（新增）
    let updateDate = findVal(['snapshot_date', '快照日期', '更新日期', '统计日期']) || null;
    if (updateDate) {
        updateDate = String(updateDate).trim();
        // 简单验证日期格式（YYYY-MM-DD）
        if (!/^\d{4}-\d{2}-\d{2}/.test(updateDate)) {
            console.warn('[Worker] 更新日期格式不符合YYYY-MM-DD:', updateDate);
        }
    }

    // 提取二级机构（新增）
    let secondOrg = findVal(['二级机构', 'second_level_organization']) || null;

    // 统计三级机构
    const orgs = new Set();
    const orgKeys = ['机构', '三级机构', 'third_level_organization'];
    let orgKey = orgKeys.find(k => firstRow[k] !== undefined);

    if (orgKey) {
        for (let i = 0; i < csvData.length; i++) {
            const val = csvData[i][orgKey];
            if (val !== undefined && val !== null && val !== '') {
                orgs.add(String(val).trim());
            }
        }
    } else {
        console.warn('[Worker] 未找到机构字段，尝试过的字段:', orgKeys);
    }

    const orgList = Array.from(orgs).sort();
    const mode = orgList.length > 1 ? 'multi' : 'single';

    // 确定公司名称（优先使用二级机构字段）
    let company = secondOrg || '四川分公司';
    if (mode === 'single' && orgList.length > 0) {
        company = orgList[0];
    }

    // 生成标题
    const title = mode === 'multi'
        ? `${company}车险第${week}周经营分析（多机构对比）`
        : `${company}车险第${week}周经营分析`;

    const result = {
        year,
        week,
        updateDate,
        secondOrg,
        organizationCount: orgList.length,
        organizations: orgList,
        analysisMode: mode,
        title,
        company,
        dimensionValues: extractDimensionValues(csvData)
    };

    // 调试日志输出
    console.log('📊 [Worker] 提取的元数据:', {
        year: result.year,
        week: result.week,
        updateDate: result.updateDate,
        company: result.company,
        analysisMode: result.analysisMode,
        organizationCount: result.organizationCount
    });
    console.log(`📍 [Worker] 分析模式: ${mode === 'single' ? '单机构分析' : '多机构对比'}`);
    console.log(`🏢 [Worker] 机构数量: ${orgList.length}`);
    if (orgList.length <= 10) {
        console.log(`📋 [Worker] 机构列表:`, orgList);
    } else {
        console.log(`📋 [Worker] 机构列表(前10个):`, orgList.slice(0, 10), '...');
    }

    return result;
}

function extractDimensionValues(csvData) {
    const dimensions = [
        { key: 'third_level_organization', fields: ['third_level_organization', '三级机构', '机构'] },
        // { key: 'customer_category_3', fields: ['customer_category_3', '客户类别'] }, // Removed
        { key: 'ui_short_label', fields: ['ui_short_label', '业务类型简称', 'business_type_category'] },
        { key: 'policy_start_year', fields: ['policy_start_year', '保单年度', '年度'] },
        { key: 'week_number', fields: ['week_number', '周次'] },
        { key: 'energy_type', fields: ['energy_type', '能源类型', '燃料类型', '是否新能源', '是否新能源车', 'is_new_energy_vehicle'], isBoolean: true },
        { key: 'renewal_status', fields: ['renewal_status', '续保状态', '是否续保'] },
        { key: 'terminal_source', fields: ['terminal_source', '终端来源', '出单渠道'] },
        { key: 'coverage_type', fields: ['coverage_type', '险别组合'] },
        { key: 'is_transferred_vehicle', fields: ['is_transferred_vehicle', '是否过户', '是否过户车'], isBoolean: true },
        { key: 'vehicle_insurance_grade', fields: ['vehicle_insurance_grade', '车险分等级', '车险分'] },
        { key: 'small_truck_score', fields: ['small_truck_score', '小货车评分'] },
        { key: 'large_truck_score', fields: ['large_truck_score', '大货车评分', '营业货车评分'] }
    ];

    const values = {};
    dimensions.forEach(dim => {
        const set = new Set();
        csvData.forEach(row => {
            for (const field of dim.fields) {
                if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
                    set.add(String(row[field]).trim());
                    break;
                }
            }
        });
        values[dim.key] = Array.from(set).sort();
    });
    return values;
}

function getDimensionValues(data, dimensionKey, currentFilters) {
    let filtered = data;
    
    // Apply filters if provided (except for the current dimension itself, usually)
    // But for hierarchical filtering, we might want to apply all other filters.
    // For now, let's just apply time filters if present.
    if (currentFilters && currentFilters.time) {
        const { year, weekStart, weekEnd } = currentFilters.time;
        filtered = filtered.filter(row => {
            if (year) {
                const rowYear = row['policy_start_year'] || row['保单年度'] || row['年度'];
                if (String(rowYear) !== String(year)) return false;
            }
            const rowWeek = parseInt(row['week_number'] || row['周次'] || 0);
            if (rowWeek < weekStart || rowWeek > weekEnd) return false;
            return true;
        });
    }

    const dimensionConfigMap = {
        'third_level_organization': { fields: ['third_level_organization', '三级机构', '机构'] },
        'customer_category_3': { fields: ['customer_category_3', '客户类别'] },
        'ui_short_label': { fields: ['ui_short_label', '业务类型简称', 'business_type_category'] },
        'policy_start_year': { fields: ['policy_start_year', '保单年度', '年度'] },
        'week_number': { fields: ['week_number', '周次'] },
        'insurance_type': { fields: ['insurance_type', '险种'] },
        'energy_type': { fields: ['energy_type', '能源类型', '燃料类型', '是否新能源', '是否新能源车', 'is_new_energy_vehicle'], isBoolean: true },
        'renewal_status': { fields: ['renewal_status', '续保状态', '是否续保'] },
        'terminal_source': { fields: ['terminal_source', '终端来源', '出单渠道'] },
        'coverage_type': { fields: ['coverage_type', '险别组合'] },
        'is_transferred_vehicle': { fields: ['is_transferred_vehicle', '是否过户', '是否过户车'], isBoolean: true },
        'vehicle_insurance_grade': { fields: ['vehicle_insurance_grade', '车险分等级', '车险分'] },
        'small_truck_score': { fields: ['small_truck_score', '小货车评分'] },
        'large_truck_score': { fields: ['large_truck_score', '大货车评分', '营业货车评分'] }
    };

    const config = dimensionConfigMap[dimensionKey];
    if (!config) return [];
    
    // 虚拟维度直接返回预定义选项
    if (config.isVirtual && config.options) {
        return [...config.options];
    }
    
    const fields = config.fields;

    const values = new Set();
    for (let i = 0; i < filtered.length; i++) {
        const row = filtered[i];
        for (const field of fields) {
            if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
                values.add(String(row[field]).trim());
                break;
            }
        }
    }

    return Array.from(values).sort();
}

function applyFiltersAndRecalc(data, filterState) {
    let filtered = data;

    // 1. Time Filter
    if (filterState.time && filterState.time.applied) {
        const { year, weekStart, weekEnd } = filterState.time.applied;
        
        filtered = filtered.filter(row => {
            // Year check
            if (year) {
                const rowYear = row['policy_start_year'] || row['保单年度'] || row['年度'];
                if (String(rowYear) !== String(year)) return false;
            }
            // Week range check
            const rowWeek = parseInt(row['week_number'] || row['周次'] || 0);
            if (rowWeek < weekStart || rowWeek > weekEnd) return false;
            return true;
        });
    }

    // 2. Motorcycle Filter (基于业务类型自动判断)

    // 3. Drill Filter
    if (filterState.drill && filterState.drill.applied && filterState.drill.applied.length > 0) {
        const dimensionConfigMap = {
            'motorcycle_mode': ['motorcycle_mode'], // 虚拟维度，不需要映射到具体字段
            'third_level_organization': ['third_level_organization', '三级机构', '机构'],
            'customer_category_3': ['customer_category_3', '客户类别'],
            'ui_short_label': ['ui_short_label', '业务类型简称', 'business_type_category'],
            'policy_start_year': ['policy_start_year', '保单年度', '年度'],
            'week_number': ['week_number', '周次'],
            'energy_type': ['energy_type', '能源类型', '燃料类型', '是否新能源', '是否新能源车', 'is_new_energy_vehicle'],
            'renewal_status': ['renewal_status', '续保状态', '是否续保'],
            'terminal_source': ['terminal_source', '终端来源', '出单渠道'],
            'coverage_type': ['coverage_type', '险别组合'],
            'is_transferred_vehicle': ['is_transferred_vehicle', '是否过户', '是否过户车'],
            'vehicle_insurance_grade': ['vehicle_insurance_grade', '车险分等级', '车险分'],
            'small_truck_score': ['small_truck_score', '小货车评分'],
            'large_truck_score': ['large_truck_score', '大货车评分', '营业货车评分']
        };

        filtered = filtered.filter(row => {
            for (const condition of filterState.drill.applied) {
                const fields = dimensionConfigMap[condition.dimension];
                if (!fields) continue;

                let matched = false;
                for (const field of fields) {
                    const rowValue = String(row[field] || '').trim();
                    if (condition.values.includes(rowValue)) {
                        matched = true;
                        break;
                    }
                }
                if (!matched) return false;
            }
            return true;
        });
    }

    // 3. Recalculate Template Data
    // We reuse processData logic but we don't need to re-map business types if they are already mapped in rawCSVData
    // Actually, rawCSVData in memory is already mapped by `processData` -> `mapBusinessTypes`.
    // Wait, `processData` calls `mapBusinessTypes` which modifies rows in place (added ui_short_label).
    // So `rawCSVData` has these fields.
    // We can call `processData` again, but `mapBusinessTypes` is idempotent-ish (it overwrites).
    // But `processData` does `mapBusinessTypes(csvData)`.
    // Let's optimize: `processData` assumes raw input.
    // We should split `processData` into `prepareData` (once) and `aggregateData` (on filter).
    // But for now, calling `processData` on filtered subset is fine, just slightly redundant on mapping.
    
    return processData(filtered);
}

// 摩托车业务筛选函数 (Placeholder, not implemented yet or removed)

function calculateTimeProgress(dateStr) {
    if (!dateStr) return 1; // Fallback to 100% if no date

    try {
        const snapshotDate = new Date(dateStr);
        if (isNaN(snapshotDate.getTime())) return 1;

        // 计算基准日：更新日期的前一日
        const baseDate = new Date(snapshotDate);
        baseDate.setDate(baseDate.getDate() - 1);
        
        const year = baseDate.getFullYear();
        
        // 判断闰年
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const daysInYear = isLeap ? 366 : 365;
        
        // 计算序数日 (Day of Year)
        const startOfYear = new Date(year, 0, 1);
        const diffTime = baseDate - startOfYear;
        // diffTime in ms. +1 because Jan 1st is day 1.
        const dayOfYear = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        // 计算已过天数 = 序数日 - 1 (根据用户需求)
        // 用户规则：“当年第一天不计算”。如果 passedDays <= 0，返回 0.0001 避免分母为0
        const userPassedDays = dayOfYear - 1;
        
        if (userPassedDays <= 0) return 0.0001; 
        
        return userPassedDays / daysInYear;
    } catch (e) {
        console.error('Time progress calculation failed:', e);
        return 1;
    }
}
