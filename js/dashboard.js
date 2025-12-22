/**
 * Dashboard Logic for Visual Data Analysis System
 * Handles chart rendering, interactions, and drill-down logic.
 */

const Dashboard = {
    data: {},
    worker: null,
    currentDimensions: {
        overview: 'kpi',
        premium: 'category',
        cost: 'org',
        loss: 'org',
        expense: 'org'
    },
    currentSubTab: {
        loss: 'bubble'
    },
    filterState: {
        time: {
            applied: { year: null, weekStart: 1, weekEnd: 52 }
        },
        drill: {
            applied: [],  // 已应用的筛选条件 [{dimension, values}]
            draft: {}     // 草稿状态 {dimensionKey: [selectedValues]}
        }
    },

    // 当前打开的下拉面板
    activeDropdown: null,

    // 指标名称映射表（原始名称 → 显示名称）
    displayNameMap: {
        '已报告赔款占比': '赔款贡献度',
        '保费占比': '保费贡献度',
        '赔付率VS占比': '满期赔付率VS赔款贡献度'
    },

    // 组织模式配置（2025-12-21新增）
    organizationModes: {
        // 分公司模式：显示所有三级机构（默认）
        branch: {
            name: '分公司',
            titlePrefix: '四川分公司',
            description: '显示所有三级机构数据',
            defaultSelection: 'all'
        },
        
        // 同城模式：仅显示同城5个机构
        local: {
            name: '同城',
            titlePrefix: '四川同城机构',
            description: '仅显示同城机构数据',
            defaultSelection: ['天府', '高新', '新都', '青羊', '武侯']
        },
        
        // 异地模式：仅显示异地7个机构
        remote: {
            name: '异地',
            titlePrefix: '四川异地机构',
            description: '仅显示异地机构数据',
            defaultSelection: ['宜宾', '泸州', '德阳', '资阳', '乐山', '自贡', '达州']
        },
        
        // 单机构模式：仅显示单个机构
        single: {
            name: '单机构',
            titlePrefix: (selectedOrg) => `${selectedOrg}机构`,
            description: '仅显示单个机构数据',
            requiresUserSelection: true
        },
        
        // 多机构模式：自定义多机构选择
        multi: {
            name: '多机构',
            titlePrefix: '四川多机构',
            description: '用户自定义多机构选择',
            isDerived: true
        }
    },

    init(initialData, workerInstance) {
        console.log('Initializing Dashboard...');
        this.data = initialData;
        this.worker = workerInstance;

        // Setup Worker Bridge for direct communication if needed
        this.setupWorkerBridge();

        // 性能优化：创建防抖版本的renderChart
        this.debouncedRenderChart = this.debounce((tab) => {
            this._renderChartInternal(tab);
        }, 100);

        // Initialize UI components
        this.initTabs();
        this.initKeyboardNavigation();  // 初始化键盘导航
        this.initFilters();
        this.initDrillSelectors();  // 初始化电商式下拉选择器
        this.initYearSelector();
        this.renderMetadata();  // 渲染元数据预览卡片
        this.renderDrillTags();  // 渲染下钻条件标签
        this.renderKPI();
        
        // 更新页面标题（基于组织模式）
        this.updatePageTitle();
        
        this.renderChart('overview');

        if (!this._resizeHandlerInstalled) {
            this._resizeHandlerInstalled = true;
            window.addEventListener('resize', this.debounce(() => {
                const activeTab = document.querySelector('.tab.active')?.dataset?.tab;
                if (activeTab) this.renderChart(activeTab);
            }, 200));
        }

        // Initialize keyboard navigation
        this.initKeyboardNavigation();

        // Show Dashboard
        document.getElementById('uploadContainer').style.display = 'none';
        document.getElementById('dashboardContainer').style.display = 'block';
    },

    /**
     * 初始化键盘导航功能
     * 支持方向键切换标签页，空格键和回车键激活
     */
    initKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Tab标签页键盘导航
            if (!e.target.closest('.drill-dropdown-panel') && !e.target.closest('input')) {
                const activeTab = document.querySelector('.tab.active');
                const allTabs = Array.from(document.querySelectorAll('.tab'));
                const currentIndex = allTabs.indexOf(activeTab);
                
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        // 左右键只移动一格
                        this.switchTabByIndex(Math.max(0, currentIndex - 1));
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        // 左右键只移动一格
                        this.switchTabByIndex(Math.min(allTabs.length - 1, currentIndex + 1));
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        // 向下键移动到维度按钮
                        this.navigateToDimensionButtons();
                        break;
                    case ' ':
                    case 'Enter':
                        e.preventDefault();
                        // 空格键和回车键重新激活当前tab（刷新数据）
                        const currentTab = activeTab?.dataset?.tab;
                        if (currentTab) {
                            this.renderChart(currentTab);
                        }
                        break;
                }
            }

            // 维度按钮键盘导航
            if (e.target.classList.contains('dimension-btn') || e.target.closest('.dimension-btn')) {
                const dimensionButton = e.target.classList.contains('dimension-btn') ? e.target : e.target.closest('.dimension-btn');
                const dimensionSwitch = dimensionButton.closest('.dimension-switch');
                const allButtons = Array.from(dimensionSwitch.querySelectorAll('.dimension-btn'));
                const currentIndex = allButtons.indexOf(dimensionButton);
                
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        const prevIndex = Math.max(0, currentIndex - 1);
                        allButtons[prevIndex].click();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        const nextIndex = Math.min(allButtons.length - 1, currentIndex + 1);
                        allButtons[nextIndex].click();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        // 向上键移回到Tab标签
                        this.navigateToTabFromDimension();
                        break;
                }
            }

            // 子标签页键盘导航（损失暴露板块）
            if (e.target.closest('.sub-tabs') || document.activeElement?.closest('.sub-tabs')) {
                const activeSubTab = document.querySelector('.sub-tab.active');
                const allSubTabs = Array.from(document.querySelectorAll('.sub-tab'));
                const currentIndex = allSubTabs.indexOf(activeSubTab);
                
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.switchSubTabByIndex('loss', Math.max(0, currentIndex - 1));
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.switchSubTabByIndex('loss', Math.min(allSubTabs.length - 1, currentIndex + 1));
                        break;
                }
            }
        });
    },

    /**
     * 从维度按钮导航回Tab标签
     */
    navigateToTabFromDimension() {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            activeTab.focus();
        }
    },

    /**
     * 从Tab标签导航到维度按钮
     */
    navigateToDimensionButtons() {
        const activeTab = document.querySelector('.tab.active')?.dataset?.tab;
        
        // 只有经营概览和损失暴露板块有维度按钮
        if (activeTab === 'overview' || activeTab === 'loss') {
            const dimensionButtons = document.querySelector(`#tab-${activeTab} .dimension-switch`);
            if (dimensionButtons) {
                const firstButton = dimensionButtons.querySelector('.dimension-btn');
                if (firstButton) {
                    firstButton.focus();
                    // 重新聚焦时移除所有active类，然后添加到第一个按钮
                    dimensionButtons.querySelectorAll('.dimension-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    firstButton.classList.add('active');
                }
            }
        }
    },

    /**
     * 根据索引切换标签页
     * @param {number} index - 标签页索引
     */
    switchTabByIndex(index) {
        const allTabs = Array.from(document.querySelectorAll('.tab'));
        if (index < 0 || index >= allTabs.length) return;
        
        const targetTab = allTabs[index];
        const tabName = targetTab.dataset.tab;
        
        // 移除所有激活状态
        allTabs.forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // 激活目标标签页
        targetTab.classList.add('active');
        const targetContent = document.getElementById(`tab-${tabName}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
        
        // 重新渲染图表
        this.renderChart(tabName);
    },

    /**
     * 根据索引切换子标签页
     * @param {string} parentTab - 父标签页名称
     * @param {number} index - 子标签页索引
     */
    switchSubTabByIndex(parentTab, index) {
        const allSubTabs = Array.from(document.querySelectorAll('.sub-tab'));
        if (index < 0 || index >= allSubTabs.length) return;
        
        const targetSubTab = allSubTabs[index];
        const subTabName = targetSubTab.dataset.subtab;
        
        // 移除所有激活状态
        allSubTabs.forEach(tab => tab.classList.remove('active'));
        
        // 激活目标子标签页
        targetSubTab.classList.add('active');
        
        // 重新渲染图表
        this.currentSubTab[parentTab] = subTabName;
        this.renderChart(parentTab);
    },

    /**
     * 赔款贡献度特殊颜色规则
     * 当赔款贡献度 > 保费贡献度时显示红色，否则显示灰色
     * @param {Object} dataItem - 数据项
     * @param {number} index - 索引
     * @returns {string} 颜色值
     */
    getSpecialClaimContributionColor(dataItem, index) {
        const claimContribution = dataItem.已报告赔款占比 || 0;
        const premiumContribution = dataItem.保费占比 || 0;
        
        // 赔款贡献度 > 保费贡献度时显示红色
        if (claimContribution > premiumContribution) {
            return '#c00000';  // 危险红色
        }
        
        return '#808080';  // 默认灰色
    },

    formatRate(value, digits = 2) {
        if (value === undefined || value === null) return '--';
        const num = Number(value);
        if (Number.isNaN(num)) return '--';
        return num.toFixed(digits).replace(/\.00$/, '');
    },

    formatInteger(value) {
        if (value === undefined || value === null) return '--';
        const num = Number(value);
        if (Number.isNaN(num)) return '--';
        return Math.round(num).toLocaleString();
    },

    formatWanYuanFromYuan(valueInYuan) {
        if (valueInYuan === undefined || valueInYuan === null) return '--';
        const num = Number(valueInYuan);
        if (Number.isNaN(num)) return '--';
        return Math.round(num / 10000).toLocaleString();
    },

    /**
     * 获取指标的显示名称
     * @param {string} originalName - 原始名称
     * @returns {string} 显示名称
     */
    getDisplayName(originalName) {
        return this.displayNameMap[originalName] || originalName;
    },

    /**
     * 计算堆积图最佳标签字体大小
     * 根据数据项数量和标签长度智能调整文字大小
     * @param {Array} data - 数据数组
     * @param {number} containerWidth - 容器宽度（可选）
     * @returns {number} 字体大小（px）
     */
    calculateOptimalLabelSize(data, containerWidth = null) {
        if (!data || data.length === 0) return 12;

        // 获取最长标签的字符数
        const maxLength = Math.max(...data.map(d => {
            const name = d.name || d.三级机构 || d.客户类别 || d.ui_short_label || '';
            return String(name).length;
        }));

        // 数据项数量
        const itemCount = data.length;

        // 基础字体大小
        let baseSize = 12;

        // 根据数据项数量调整
        if (itemCount > 20) {
            baseSize = 10;
        } else if (itemCount > 15) {
            baseSize = 11;
        } else if (itemCount > 10) {
            baseSize = 12;
        } else {
            baseSize = 13;
        }

        // 根据标签长度微调
        if (maxLength > 8) {
            baseSize = Math.max(10, baseSize - 1);
        } else if (maxLength > 6) {
            baseSize = Math.max(11, baseSize);
        }

        return baseSize;
    },

    setupWorkerBridge() {
        // Simplified bridge since we are in the same context as the worker creation (mostly) - v2.0
        // But if we want to use the request/response pattern:
        this.workerBridge = {
            messageIdCounter: 0,
            pendingRequests: new Map(),
            
            request: (type, payload) => {
                return new Promise((resolve, reject) => {
                    const messageId = ++this.workerBridge.messageIdCounter;
                    this.workerBridge.pendingRequests.set(messageId, { resolve, reject });
                    
                    this.worker.postMessage({
                        type: type,
                        payload: payload,
                        // We need to wrap payload or handle messageId in worker?
                        // The worker currently doesn't echo messageId.
                        // We need to modify worker or handle it here.
                        // Actually, let's use the listener in the main controller to dispatch.
                    });
                    
                    // The main controller (StaticReportGenerator) listens to worker messages.
                    // We need a way to hook into that or let Dashboard handle its own worker messages.
                    // Let's assume Dashboard takes over worker message handling for dashboard-specific events.
                });
            }
        };
    },

    // ... (Porting helper functions from template) ...
    
    // KPI状态颜色函数（符合规范要求）
    getKPIStatusColor(type, value) {
        switch(type) {
            case 'progress': // 保费时间进度达成率
                if (value < 95) return 'status-danger';
                else if (value < 100) return 'status-warning';
                else return 'status-good';

            case 'loss': // 满期赔付率
                if (value > 75) return 'status-danger';
                else if (value > 70) return 'status-warning';
                else return 'status-good';

            case 'expense': // 费用率
                if (value > 17) return 'status-danger';
                else if (value > 14) return 'status-warning';
                else return 'status-good';

            case 'variable_cost': // 变动成本率
                if (value > 94) return 'status-danger';
                else if (value > 91) return 'status-warning';
                else return 'status-good';

            default:
                return 'status-good';
        }
    },

    getStatusColor(variableCostRate) {
        if (variableCostRate < 85) return '#00b050';
        else if (variableCostRate < 88) return '#92d050';
        else if (variableCostRate < 91) return '#0070c0';
        else if (variableCostRate < 94) return '#ffc000';
        else return '#c00000';
    },

    /**
     * 获取统一预警线配置
     * @param {number} value - 预警线值
     * @param {string} name - 预警线名称
     * @param {string} orientation - 'horizontal' 或 'vertical'
     * @returns {object} - ECharts markLine配置
     */
    getWarningLineConfig(value, name, orientation = 'horizontal') {
        const isHorizontal = orientation === 'horizontal';
        return {
            [isHorizontal ? 'yAxisIndex' : 'xAxisIndex']: 0,
            type: 'line',
            markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: {
                    color: '#ffc000',  // 黄色
                    type: 'dashed',    // 虚线
                    width: 1
                },
                label: {
                    show: true,
                    position: 'end',
                    formatter: `${name}预警线 ${value}`,
                    color: '#ffc000',
                    fontSize: 12,
                    rotate: 0  // 确保文字横向
                },
                data: [isHorizontal ? { yAxis: value } : { xAxis: value }]
            }
        };
    },

    /**
     * 获取统一状态颜色
     * 规则1：正向指标和负向指标统一：值越大颜色越深
     * 规则2：超过危险线显示红色，超过预警线显示橙色
     * @param {string} kpiName - KPI名称
     * @param {number} kpiValue - KPI值
     * @param {boolean} isPositive - 是否正向指标（默认false负向）
     * @returns {string} - 颜色值
     */
    getUnifiedStatusColor(kpiName, kpiValue, isPositive = false) {
        const thresholds = {
            '满期赔付率': { danger: 75, warning: 70, positive: false },
            '费用率': { danger: 17, warning: 14, positive: false },
            '变动成本率': { danger: 94, warning: 91, positive: false },
            '保费进度达成率': { danger: 90, warning: 95, positive: true },
            '边际贡献率': { danger: 10, warning: 15, positive: true }
        };

        const threshold = thresholds[kpiName];
        if (!threshold) return '#888888'; // 默认灰色
        
        // 负向指标：值越大越差（赔付率、费用率等）
        if (!threshold.positive) {
            if (kpiValue >= threshold.danger) return '#dc3545';    // 红色-危险
            if (kpiValue >= threshold.warning) return '#fd7e14'; // 橙色-预警
            return '#28a745'; // 绿色-正常
        }
        // 正向指标：值越小越差（达成率等）
        else {
            if (kpiValue <= threshold.danger) return '#dc3545';    // 红色-危险
            if (kpiValue <= threshold.warning) return '#fd7e14';  // 橙色-预警
            return '#28a745'; // 绿色-正常
        }
    },

    /**
     * 获取堆积柱状图颜色（兼容旧接口）
     * @param {string} kpiName - KPI名称
     * @param {number} kpiValue - KPI值
     * @returns {string} - 颜色值
     */
    getStackedBarColor(kpiName, kpiValue) {
        // 使用新的统一颜色函数
        return this.getUnifiedStatusColor(kpiName, kpiValue, false);
    },

    calculateBubbleSize(values, dataIndex) {
        // 性能优化：缓存计算结果
        if (!this._bubbleSizeCache || this._bubbleSizeCache.values !== values) {
            this._bubbleSizeCache = this._calculateBubbleSizes(values);
        }
        return this._bubbleSizeCache.sizes[dataIndex];
    },

    _calculateBubbleSizes(values) {
        const allValues = values.map(v => v || 0);
        const nonZeroValues = allValues.filter(v => v > 0);
        
        if (nonZeroValues.length === 0) {
            return { values, sizes: allValues.map(() => 20) };
        }

        const maxValue = Math.max(...nonZeroValues);
        const minValue = Math.min(...nonZeroValues);
        
        // 限制最大气泡直径不超过最小气泡的2倍
        const maxDiameter = 40;  // 最大直径
        const minDiameter = maxDiameter / 2;  // 最小直径为最大直径的一半
        
        const sizes = allValues.map(value => {
            if (value <= 0) return minDiameter;
            
            if (maxValue === minValue) {
                return minDiameter;
            }
            
            // 使用对数缩放减少极端值影响
            const logMax = Math.log(maxValue + 1);
            const logMin = Math.log(minValue + 1);
            const logValue = Math.log(value + 1);
            
            const normalizedValue = (logValue - logMin) / (logMax - logMin);
            const diameter = minDiameter + (maxDiameter - minDiameter) * normalizedValue;
            
            return diameter;
        });

        return { values, sizes };
    },

// 限制柱状图极端值的函数
    normalizeBarHeights(values) {
        if (!values || values.length === 0) return values;
        
        const sortedValues = [...values].sort((a, b) => b - a);
        const maxValue = sortedValues[0];
        const secondMaxValue = sortedValues[1] || maxValue;
        
        // 如果只有一个值或最大值不超过第二值的2倍，返回原值
        if (values.length <= 1 || maxValue <= secondMaxValue * 2) {
            return values;
        }
        
        // 限制最大值不超过第二值的2倍
        const limitMax = secondMaxValue * 2;
        return values.map(value => value > limitMax ? limitMax : value);
    },

// 性能优化：防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 清空缓存
    clearChartCache() {
        this._bubbleSizeCache = null;
        this._chartDataCache = {};
    },

    wrapTextByCharCount(text, maxCharsPerLine) {
        const value = String(text ?? '');
        const limit = Math.max(1, Math.floor(maxCharsPerLine || 1));
        if (value.length <= limit) return value;
        const lines = [];
        for (let i = 0; i < value.length; i += limit) {
            lines.push(value.slice(i, i + limit));
        }
        return lines.join('\n');
    },

    _toPx(value, total) {
        if (value === undefined || value === null) return 0;
        if (typeof value === 'number') return value;
        const s = String(value).trim();
        if (s.endsWith('%')) {
            const ratio = Number.parseFloat(s.slice(0, -1));
            if (Number.isNaN(ratio)) return 0;
            return total * ratio / 100;
        }
        const num = Number.parseFloat(s);
        return Number.isNaN(num) ? 0 : num;
    },

    _applyResponsiveCategoryXAxis(option, chart) {
        if (!option || !chart) return option;

        const xAxis = option.xAxis && !Array.isArray(option.xAxis) ? option.xAxis : null;
        if (!xAxis || xAxis.type !== 'category') return option;
        const categories = Array.isArray(xAxis.data) ? xAxis.data : [];
        if (categories.length === 0) return option;

        const grid = option.grid && !Array.isArray(option.grid) ? option.grid : {};
        const chartWidth = chart.getWidth();
        const chartHeight = chart.getHeight();

        const leftPx = this._toPx(grid.left ?? '10%', chartWidth);
        const rightPx = this._toPx(grid.right ?? '8%', chartWidth);
        const baseBottomPx = this._toPx(grid.bottom ?? '15%', chartHeight);
        const plotWidth = Math.max(10, chartWidth - leftPx - rightPx);

        const labelCount = categories.length;
        const perLabelWidth = Math.max(18, Math.floor(plotWidth / labelCount));

        let chosenFontSize = 12;
        let chosenCharsPerLine = 8;
        let chosenMaxLines = 1;
        const maxBottomPx = Math.floor(chartHeight * 0.45);

        let best = null;
        let foundFit = false;
        for (let fontSize = 12; fontSize >= 8; fontSize -= 1) {
            const approxCharWidth = fontSize * 0.6;
            const charsPerLine = Math.max(2, Math.floor(perLabelWidth / approxCharWidth));
            let maxLines = 1;
            for (const raw of categories) {
                const s = String(raw ?? '');
                maxLines = Math.max(maxLines, Math.ceil(s.length / charsPerLine));
            }

            const lineHeight = fontSize + 2;
            const neededBottom = 18 + maxLines * lineHeight + 10;
            if (!best || neededBottom < best.neededBottom) {
                best = { fontSize, charsPerLine, maxLines, neededBottom };
            }
            if (neededBottom <= maxBottomPx) {
                chosenFontSize = fontSize;
                chosenCharsPerLine = charsPerLine;
                chosenMaxLines = maxLines;
                foundFit = true;
                break;
            }
        }

        if (!foundFit && best) {
            chosenFontSize = best.fontSize;
            chosenCharsPerLine = best.charsPerLine;
            chosenMaxLines = best.maxLines;
        }

        const finalLineHeight = chosenFontSize + 2;
        const dynamicBottomPx = Math.max(baseBottomPx, 18 + chosenMaxLines * finalLineHeight + 10);

        option.grid = {
            ...grid,
            bottom: Math.min(dynamicBottomPx, maxBottomPx),
            containLabel: true
        };

        const baseAxisLabel = xAxis.axisLabel && typeof xAxis.axisLabel === 'object' ? xAxis.axisLabel : {};
        option.xAxis = {
            ...xAxis,
            axisLabel: {
                ...baseAxisLabel,
                fontWeight: 'bold',
                rotate: 0,
                interval: 0,
                hideOverlap: false,
                fontSize: chosenFontSize,
                lineHeight: finalLineHeight,
                width: perLabelWidth,
                overflow: 'break',
                formatter: (value) => this.wrapTextByCharCount(value, chosenCharsPerLine)
            }
        };

        const needsZoom = !foundFit || (labelCount >= 16 && perLabelWidth <= 28);
        if (needsZoom) {
            const existingZoom = Array.isArray(option.dataZoom) ? option.dataZoom : (option.dataZoom ? [option.dataZoom] : []);
            const hasInsideZoom = existingZoom.some(z => z && z.type === 'inside');
            if (!hasInsideZoom) {
                option.dataZoom = [
                    ...existingZoom,
                    {
                        type: 'inside',
                        xAxisIndex: 0,
                        filterMode: 'none',
                        zoomOnMouseWheel: true,
                        moveOnMouseWheel: true,
                        moveOnMouseMove: true
                    }
                ];
            }
        }

        return option;
    },

// 全局图表样式配置函数
    getGlobalChartOptions() {
        return {
            // 网格线设置
            grid: {
                left: '10%',
                right: '8%',
                bottom: '15%',
                top: '10%',
                containLabel: true,
                show: false  // 不显示网格线
            },
            // 移除所有网格线，统一线条宽度
            xAxis: {
                splitLine: { show: false },  // 不显示网格线
                axisLine: {
                    lineStyle: { color: '#333', width: 1 }
                },
                axisTick: { show: false },
                axisLabel: {
                    fontWeight: 'bold',
                    color: '#333',
                    interval: 0,
                    rotate: 0,
                    fontSize: 12,
                    overflow: 'break'
                },
                nameTextStyle: {
                    fontWeight: 'bold',
                    fontSize: 14,
                    color: '#333',
                    padding: [20, 0, 0, 0]
                }
            },
            yAxis: {
                splitLine: { show: false },  // 不显示网格线
                axisLine: {
                    lineStyle: { color: '#333', width: 1 }
                },
                axisTick: { show: false },
                axisLabel: {
                    fontWeight: 'bold',
                    color: '#333',
                    fontSize: 12
                },
                nameTextStyle: {
                    fontWeight: 'bold',
                    fontSize: 14,
                    color: '#333',
                    padding: [0, 0, 20, 0]
                }
            },
            // 图例样式
            legend: {
                textStyle: {
                    fontWeight: 'bold',
                    color: '#333'
                }
            },
            // 提示框样式
            tooltip: {
                textStyle: {
                    fontWeight: 'bold'
                }
            },
            // 全局线条配置：折线宽度统一为1px
            lineStyle: {
                width: 1
            }
        };
    },

    // 通用的ECharts样式配置
    getCommonChartStyle() {
        return {
            // 通用grid配置：去除网格线
            grid: {
                left: '12%',
                right: '6%',
                bottom: '18%',
                top: '15%',
                containLabel: true
            },
            // 通用文字样式：粗体
            textStyle: {
                fontWeight: 'bold'
            }
        };
    },

    // 通用的坐标轴配置
    getCommonAxisConfig(axisType = 'category', name = '', data = null, isXAxis = true) {
        const config = {
            name: name,
            nameTextStyle: {
                fontWeight: 'bold',
                fontSize: 14,
                padding: isXAxis ? [10, 0, 0, 0] : [0, 0, 0, 10]  // X轴名称向下偏移，Y轴名称向左偏移
            },
            nameGap: isXAxis ? 30 : 35,  // 坐标轴名称与轴线的距离，增加以避免遮挡
            nameLocation: isXAxis ? 'center' : 'middle',  // 名称位置居中
            axisLabel: {
                fontWeight: 'bold',
                fontSize: 10,  // 稍微减小字体
                interval: 0,  // 显示所有标签
                rotate: 45,   // 倾斜45度避免重叠
                overflow: 'truncate',  // 超出部分截断
                hideOverlap: false,  // 不隐藏重叠标签
                formatter: function(value) {
                    // 超长文本截断并添加省略号
                    if (value && value.length > 8) {
                        return value.substr(0, 8) + '...';
                    }
                    return value;
                }
            },
            axisLine: {
                lineStyle: {
                    width: 1
                }
            },
            axisTick: {
                show: true
            },
            splitLine: {
                show: false  // 不显示网格线
            }
        };

        if (axisType === 'category' && data) {
            config.type = 'category';
            config.data = data;
            // X轴类别轴需要计算标签宽度
            const labelCount = data.length;
            const maxLabelWidth = Math.max(60, Math.floor(800 / labelCount) - 10);
            config.axisLabel.width = maxLabelWidth;
        } else if (axisType === 'value') {
            config.type = 'value';
        }

        return config;
    },

    // 通用的标注线配置
    getCommonMarkLineStyle() {
        return {
            silent: true,
            symbol: 'none',
            lineStyle: {
                type: 'solid',  // 使用实线而不是虚线，更清晰
                width: 3        // 增加线宽，确保清晰可见
            },
            label: {
                show: true,
                position: 'end',
                fontWeight: 'bold',
                fontSize: 13
            }
        };
    },

    getIndicatorColor(indicatorName, value, allValues) {
        if (indicatorName === '变动成本率') return this.getStatusColor(value);
        
        const positiveIndicators = ['边际贡献率', '年计划达成率'];
        const isPositive = positiveIndicators.includes(indicatorName);
        
        if (!allValues || allValues.length === 0) return '#333';
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues);
        
        if (maxValue === minValue) return '#0070c0';
        
        let normalizedPosition = (value - minValue) / (maxValue - minValue);
        if (!isPositive) normalizedPosition = 1 - normalizedPosition;

        if (normalizedPosition < 0.2) return '#c00000';
        else if (normalizedPosition < 0.4) return '#ffc000';
        else if (normalizedPosition < 0.6) return '#0070c0';
        else if (normalizedPosition < 0.8) return '#92d050';
        else return '#00b050';
    },

    generateIndicatorTable(data, dimField, indicators) {
        if (!data || data.length === 0) return '';
        let html = '<div class="indicator-table-container" style="margin-top: 20px; overflow-x: auto;">';
        html += '<table class="indicator-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        html += '<thead><tr style="background-color: #f5f5f5;">';
        html += `<th style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${dimField}</th>`;
        indicators.forEach(indicator => {
            let label = this.getDisplayName(indicator);
            if (indicator === '签单保费') label = '签单保费(万元)';
            html += `<th style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${label}</th>`;
        });
        html += '</tr></thead><tbody>';
        data.forEach(d => {
            html += '<tr>';
            html += `<td style="padding: 8px; border: 1px solid #ddd;">${d[dimField]}</td>`;
            indicators.forEach(indicator => {
                const value = d[indicator];
                const allValues = data.map(item => item[indicator]);
                const color = this.getIndicatorColor(indicator, value, allValues);
                const isPercentage = [
                    '变动成本率',
                    '费用率',
                    '满期赔付率',
                    '出险率',
                    '年计划达成率',
                    '边际贡献率',
                    '保费占比',
                    '已报告赔款占比'
                ].includes(indicator);
                
                let displayValue;
                if (isPercentage) {
                    displayValue = `${this.formatRate(value)}%`;
                } else if (indicator === '签单保费') {
                    displayValue = this.formatWanYuanFromYuan(value);
                } else {
                    displayValue = this.formatInteger(value);
                }
                
                html += `<td style="padding: 8px; border: 1px solid #ddd; color: ${color}; font-weight: bold;">${displayValue}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    },

    initTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`tab-${tabName}`).classList.add('active');
                this.renderChart(tabName);
            });
        });
    },

    /**
     * 初始化键盘导航功能
     * 支持主标签页和二级标签页的方向键切换
     */
    initKeyboardNavigation() {
        // 主标签页键盘导航
        document.addEventListener('keydown', (e) => {
            // 如果焦点在输入框或文本域中，不响应键盘导航
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const activeTab = document.querySelector('.tab.active');
            const allTabs = Array.from(document.querySelectorAll('.tab'));
            const currentIndex = allTabs.indexOf(activeTab);

            if (currentIndex === -1) return;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    const prevIndex = Math.max(0, currentIndex - 1);
                    if (prevIndex !== currentIndex) {
                        allTabs[prevIndex].click();
                        allTabs[prevIndex].focus();
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    const nextIndex = Math.min(allTabs.length - 1, currentIndex + 1);
                    if (nextIndex !== currentIndex) {
                        allTabs[nextIndex].click();
                        allTabs[nextIndex].focus();
                    }
                    break;
            }
        });

        // 二级标签页键盘导航（维度切换按钮）
        document.addEventListener('keydown', (e) => {
            // 如果焦点在输入框或文本域中，不响应键盘导航
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 检查是否在维度切换区域
            const dimensionContainer = document.querySelector('.dimension-switch');
            if (!dimensionContainer) return;

            const activeDimensionBtn = dimensionContainer.querySelector('.dimension-btn.active');
            const allDimensionBtns = Array.from(dimensionContainer.querySelectorAll('.dimension-btn'));
            const currentDimIndex = allDimensionBtns.indexOf(activeDimensionBtn);

            if (currentDimIndex === -1) return;

            // 使用上下方向键切换维度（避免与主标签页冲突）
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    const prevDimIndex = Math.max(0, currentDimIndex - 1);
                    if (prevDimIndex !== currentDimIndex) {
                        allDimensionBtns[prevDimIndex].click();
                        allDimensionBtns[prevDimIndex].focus();
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    const nextDimIndex = Math.min(allDimensionBtns.length - 1, currentDimIndex + 1);
                    if (nextDimIndex !== currentDimIndex) {
                        allDimensionBtns[nextDimIndex].click();
                        allDimensionBtns[nextDimIndex].focus();
                    }
                    break;
            }
        });

        // 子标签页键盘导航（损失暴露的bubble/freq切换）
        document.addEventListener('keydown', (e) => {
            // 如果焦点在输入框或文本域中，不响应键盘导航
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 检查是否在子标签页区域
            const subTabContainer = document.querySelector('.sub-tabs');
            if (!subTabContainer) return;

            const activeSubTab = subTabContainer.querySelector('.sub-tab.active');
            const allSubTabs = Array.from(subTabContainer.querySelectorAll('.sub-tab'));
            const currentSubIndex = allSubTabs.indexOf(activeSubTab);

            if (currentSubIndex === -1) return;

            // 使用Tab键切换子标签页
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                const prevSubIndex = Math.max(0, currentSubIndex - 1);
                if (prevSubIndex !== currentSubIndex) {
                    allSubTabs[prevSubIndex].click();
                    allSubTabs[prevSubIndex].focus();
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const nextSubIndex = Math.min(allSubTabs.length - 1, currentSubIndex + 1);
                if (nextSubIndex !== currentSubIndex) {
                    allSubTabs[nextSubIndex].click();
                    allSubTabs[nextSubIndex].focus();
                }
            }
        });

        console.log('✅ 键盘导航已初始化：左右方向键切换主标签，上下方向键切换维度，Tab切换子标签');
    },

    switchDimension(tab, dimension) {
        this.currentDimensions[tab] = dimension;
        const container = document.querySelector(`#tab-${tab} .dimension-switch`);
        const clickedButton = arguments.length >= 3 ? arguments[2] : null;
        if (container) {
            container.querySelectorAll('.dimension-btn').forEach(btn => btn.classList.remove('active'));
            if (clickedButton) clickedButton.classList.add('active');
        }

        // Special case for overview
        if (tab === 'overview') {
            const kpiContent = document.getElementById('overview-kpi-content');
            const chartContent = document.getElementById('overview-chart-content');
            if (dimension === 'kpi') {
                if (kpiContent) kpiContent.style.display = 'block';
                if (chartContent) chartContent.style.display = 'none';
                // 隐藏经营概览的主题提示（KPI标签页有自己的提示）
                const overviewAlert = document.getElementById('overview-alert-title');
                if (overviewAlert) overviewAlert.style.display = 'none';
                return;
            } else {
                if (kpiContent) kpiContent.style.display = 'none';
                if (chartContent) chartContent.style.display = 'block';
            }
        }
        this.renderChart(tab);
    },

    switchSubTab(tab, subTab) {
        this.currentSubTab[tab] = subTab;
        const clickedButton = arguments.length >= 3 ? arguments[2] : null;
        const container = document.querySelector(`#tab-${tab} .sub-tabs`);
        if (container) {
            container.querySelectorAll('.sub-tab').forEach(btn => btn.classList.remove('active'));
            if (clickedButton) {
                clickedButton.classList.add('active');
            } else {
                const target = container.querySelector(`.sub-tab[data-subtab="${subTab}"]`);
                if (target) target.classList.add('active');
            }
        }
        this.renderChart(tab);
    },



    // 应用筛选
    applyFilters() {
        console.log('Applying filters...');
        
        // 1. 同步时间筛选控件的值
        const yearSelect = document.getElementById('filter-year');
        const weekStartInput = document.getElementById('filter-week-start');
        const weekEndInput = document.getElementById('filter-week-end');
        
        if (yearSelect) this.filterState.time.applied.year = yearSelect.value || null;
        if (weekStartInput) this.filterState.time.applied.weekStart = parseInt(weekStartInput.value) || 1;
        if (weekEndInput) this.filterState.time.applied.weekEnd = parseInt(weekEndInput.value) || 52;

        // 2. 发送请求给 Worker
        const handler = (e) => {
            const { type, payload } = e.data;
            if (type === 'filter_complete') {
                console.log('Filter complete, updating dashboard...');
                
                // 更新数据
                // 保留 dynamicInfo
                const dynamicInfo = this.data.dynamicInfo;
                this.data = payload;
                if (dynamicInfo && !this.data.dynamicInfo) {
                    this.data.dynamicInfo = dynamicInfo;
                }
                
                // 重新渲染
                this.renderKPI();

                // 更新页面标题（基于组织模式）
                this.updatePageTitle();

                // 获取当前活动的 Tab
                const activeTab = document.querySelector('.tab.active')?.dataset?.tab || 'overview';
                this.renderChart(activeTab);

                // 移除监听器
                this.worker.removeEventListener('message', handler);
            }
        };

        this.worker.addEventListener('message', handler);
        this.worker.postMessage({ 
            type: 'filter_data', 
            payload: { filterState: this.filterState } 
        });
    },

    // 获取业务类型预警线配置（基于业务类型选择判断）
    getMotorcycleModeWarningLines() {
        const businessTypes = this.filterState.drill.applied.find(c => c.dimension === 'ui_short_label')?.values || 
                           this.filterState.drill.draft['ui_short_label'] || [];
        
        // 判断是否为仅摩托车模式
        const isMotorcycleOnly = businessTypes.length === 1 && businessTypes[0] === '摩托车';
        // 判断是否为不含摩托车模式（摩托车不在选择中）
        const excludeMotorcycle = businessTypes.length > 0 && !businessTypes.includes('摩托车');
        
        let mode = '全部业务';
        if (isMotorcycleOnly) {
            mode = '仅摩托车';
        } else if (excludeMotorcycle) {
            mode = '不含摩托车';
        }
        
        console.log(`[Dashboard] 获取预警线配置，业务类型: [${businessTypes.join(', ')}], 判断模式: ${mode}`);

        const configs = {
            '不含摩托车': [
                {
                    xAxis: 15,
                    name: '出险频度预警线',
                    lineStyle: { color: '#ffc000', type: 'dashed', width: 1 },
                    label: {
                        formatter: '预警线: 15%',
                        fontWeight: 'bold',
                        color: '#ffc000',
                        fontSize: 12,
                        position: 'insideEndTop'
                    }
                },
                {
                    yAxis: 4500,
                    name: '案均赔款预警线',
                    lineStyle: { color: '#ffc000', type: 'dashed', width: 1 },
                    label: {
                        formatter: '预警线: 4500元',
                        fontWeight: 'bold',
                        color: '#ffc000',
                        fontSize: 12,
                        position: 'insideEndTop'
                    }
                }
            ],
            '含摩托车': [
                {
                    xAxis: 12,
                    name: '出险频度预警线',
                    lineStyle: { color: '#ffc000', type: 'dashed', width: 1 },
                    label: {
                        formatter: '预警线: 12%',
                        fontWeight: 'bold',
                        color: '#ffc000',
                        fontSize: 12,
                        position: 'insideEndTop'
                    }
                },
                {
                    yAxis: 4900,
                    name: '案均赔款预警线',
                    lineStyle: { color: '#ffc000', type: 'dashed', width: 1 },
                    label: {
                        formatter: '预警线: 4900元',
                        fontWeight: 'bold',
                        color: '#ffc000',
                        fontSize: 12,
                        position: 'insideEndTop'
                    }
                }
            ],
            '仅摩托车': [
                {
                    xAxis: 12,
                    name: '出险频度预警线',
                    lineStyle: { color: '#ffc000', type: 'dashed', width: 1 },
                    label: {
                        formatter: '预警线: 12%',
                        fontWeight: 'bold',
                        color: '#ffc000',
                        fontSize: 12,
                        position: 'insideEndTop'
                    }
                },
                {
                    yAxis: 4900,
                    name: '案均赔款预警线',
                    lineStyle: { color: '#ffc000', type: 'dashed', width: 1 },
                    label: {
                        formatter: '预警线: 4900元',
                        fontWeight: 'bold',
                        color: '#ffc000',
                        fontSize: 12,
                        position: 'insideEndTop'
                    }
                }
            ]
        };

        const config = configs[mode] || configs['含摩托车'];
        console.log(`[Dashboard] 预警线配置:`, config);
        return config;
    },

    initYearSelector() {
        const yearSelect = document.getElementById('filter-year');
        if (!yearSelect) return;

        // Clear existing options except "All"
        yearSelect.innerHTML = '<option value="">全部</option>';

        // Get years from dynamicInfo if available, otherwise calculate
        let years = [];
        if (this.data.dynamicInfo && this.data.dynamicInfo.dimensionValues && this.data.dynamicInfo.dimensionValues.policy_start_year) {
            years = this.data.dynamicInfo.dimensionValues.policy_start_year;
        }

        if (years && years.length > 0) {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        }
    },

    // 区间模式切换器（当前无容器时保持安全空实现）
    addIntervalModeToggle(reportDateEl) {
        if (!reportDateEl) return;
        const toggleEl = document.getElementById('interval-mode-toggle');
        if (!toggleEl) return;
        if (!toggleEl.textContent) {
            toggleEl.textContent = '周次累计';
        }
    },

    // 渲染元数据预览卡片
    renderMetadata() {
        const info = this.data.dynamicInfo;
        if (!info) {
            console.warn('元数据信息不存在，跳过渲染');
            return;
        }

        console.log('渲染元数据信息:', info);

        // 更新页面标题
        const mainTitle = document.getElementById('mainTitle');
        if (mainTitle && info.title) {
            mainTitle.textContent = info.title;
        }

        // 更新报告日期
        const reportDate = document.getElementById('reportDate');
        if (reportDate) {
            if (info.updateDate) {
                reportDate.textContent = `数据截止日期：${info.updateDate}`;
            } else {
                reportDate.textContent = `保单年度：${info.year} | 周次：第${info.week}周`;
            }
        }

        // 添加区间模式切换器（2025-12-21更新）
        this.addIntervalModeToggle(reportDate);

        // 更新简洁元数据信息条
        const metaOrgMode = document.getElementById('meta-org-mode');
        const metaIntervalMode = document.getElementById('meta-interval-mode');
        const metaAnalysisMode = document.getElementById('meta-analysis-mode');
        const metaUpdateDateSimple = document.getElementById('meta-update-date-simple');

        if (metaOrgMode) {
            const orgModeText = info.analysisMode === 'single' ? '单机构' : '全机构';
            metaOrgMode.textContent = `组织模式: ${orgModeText}`;
        }

        if (metaIntervalMode) {
            metaIntervalMode.textContent = `区间模式: 周次累计`;
        }

        if (metaAnalysisMode) {
            metaAnalysisMode.textContent = `分析模式: 完整版`;
        }

        if (metaUpdateDateSimple) {
            metaUpdateDateSimple.textContent = `更新日期: ${info.updateDate || '未提供'}`;
        }

        // 保留原有的元数据卡片更新逻辑（隐藏状态）
        const metaYear = document.getElementById('meta-year');
        const metaWeek = document.getElementById('meta-week');
        const metaUpdateDate = document.getElementById('meta-update-date');
        const metaMode = document.getElementById('meta-mode');
        const metaOrgCount = document.getElementById('meta-org-count');
        const metaOrgList = document.getElementById('meta-org-list');
        const metaOrgListContainer = document.getElementById('meta-org-list-container');

        if (metaYear) metaYear.textContent = info.year || '-';
        if (metaWeek) metaWeek.textContent = `第${info.week}周`;
        if (metaUpdateDate) metaUpdateDate.textContent = info.updateDate || '未提供';

        // 分析模式徽章
        if (metaMode) {
            if (info.analysisMode === 'single') {
                metaMode.textContent = '单机构分析';
                metaMode.className = 'metadata-badge badge-single';
            } else {
                metaMode.textContent = '多机构对比';
                metaMode.className = 'metadata-badge badge-multi';
            }
        }

        // 机构数量
        if (metaOrgCount) {
            metaOrgCount.textContent = `${info.organizationCount} 个`;
        }

        // 机构列表（仅在机构数量 <= 10 时显示）
        if (info.organizations && info.organizations.length > 0) {
            if (info.organizations.length <= 10) {
                if (metaOrgList) {
                    metaOrgList.textContent = info.organizations.join('、');
                }
                if (metaOrgListContainer) {
                    metaOrgListContainer.style.display = 'flex';
                }
            } else {
                if (metaOrgListContainer) {
                    metaOrgListContainer.style.display = 'none';
                }
            }
        }
    },

    renderKPI() {
        const summary = this.data.summary || {};
        
        const setStatus = (id, val, badThr, warnThr, isHighBad = true) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = `${this.formatRate(val)}<span class="metric-unit">%</span>`;
            let cls = 'status-good';
            if (isHighBad) {
                if (val > badThr) cls = 'status-danger';
                else if (val > warnThr) cls = 'status-warning';
            } else {
                if (val < badThr) cls = 'status-danger';
                else if (val < warnThr) cls = 'status-warning';
            }
            el.className = `metric-value ${cls}`;
        };

        // 使用规范要求的阈值设置KPI状态
        setStatus('metric-cost-rate', summary.变动成本率, 94, 91, true);  // 变动成本率：>94%危险，>91%警告
        setStatus('metric-claim-rate', summary.满期赔付率, 75, 70, true);   // 满期赔付率：>75%危险，>70%警告
        setStatus('metric-expense-rate', summary.费用率, 17, 14, true);     // 费用率：>17%危险，>14%警告
        
        // 设置保费时间进度达成率状态（规范要求：<95%危险，95-100%警告，≥100%良好）
        if (summary.保费时间进度达成率 !== undefined) {
            const progressEl = document.getElementById('metric-progress');
            if (progressEl) {
                progressEl.innerHTML = `${this.formatRate(summary.保费时间进度达成率)}<span class="metric-unit">%</span>`;
                const progressCls = this.getKPIStatusColor('progress', summary.保费时间进度达成率);
                progressEl.className = `metric-value ${progressCls}`;
            }
        }
        
        const elPrem = document.getElementById('metric-premium');
        if (elPrem) elPrem.innerHTML = `${this.formatWanYuanFromYuan(summary.签单保费)}<span class="metric-unit">万元</span>`;
        
        const elClaim = document.getElementById('metric-claim');
        if (elClaim) elClaim.innerHTML = `${this.formatWanYuanFromYuan(summary.已报告赔款)}<span class="metric-unit">万元</span>`;

        const elExpense = document.getElementById('metric-expense');
        if (elExpense) elExpense.innerHTML = `${this.formatWanYuanFromYuan(summary.签单保费 * (summary.费用率 / 100))}<span class="metric-unit">万元</span>`;
        
        const elMargin = document.getElementById('metric-margin');
        if (elMargin) elMargin.innerHTML = `${this.formatWanYuanFromYuan(summary.签单保费 * ((100 - summary.变动成本率) / 100))}<span class="metric-unit">万元</span>`;

        // 生成KPI重点提示标题
        this.generateKPIAlertTitle(summary);
    },

    // 生成KPI重点提示标题
    generateKPIAlertTitle(summary) {
        const alerts = [];

        // 检查各项KPI是否异常
        if (summary.保费时间进度达成率 < 95) {
            alerts.push('保费达成进度落后');
        }

        if (summary.变动成本率 > 94) {
            alerts.push('变动成本率异常');
        }

        if (summary.满期赔付率 > 75) {
            alerts.push('赔付率偏高');
        }

        if (summary.费用率 > 17) {
            alerts.push('费用率超标');
        }

        // 显示KPI重点提示标题
        const alertTitleEl = document.getElementById('kpi-alert-title');
        if (alertTitleEl) {
            if (alerts.length > 0) {
                alertTitleEl.textContent = alerts.join('、');
                alertTitleEl.style.display = 'block';
            } else {
                alertTitleEl.style.display = 'none';
            }
        }
    },

    // 生成板块主题提示标题（通用函数）
    generateSectionAlertTitle(tab, dimension) {
        const alertId = tab === 'overview' ? 'overview-alert-title' : `${tab}-alert-title`;
        const alertEl = document.getElementById(alertId);
        const textEl = alertEl ? alertEl.querySelector('.alert-text') : null;

        if (!alertEl || !textEl || !this.aggregatedData) return;

        const data = this.aggregatedData;
        const alerts = {
            premium: [],  // 保费进度落后的维度值
            cost: [],     // 变动成本率超标的维度值
            lossRate: [], // 赔付率超标的维度值
            lossFreq: [], // 赔付频度偏高的维度值
            lossContribution: [], // 赔款贡献度高于保费贡献度的维度值
            expense: []   // 费用率超标的维度值
        };

        // 遍历数据识别问题维度
        data.forEach(item => {
            const name = item.name;
            const progress = item.保费时间进度达成率;
            const costRate = item.变动成本率 || 0;
            const lossRate = item.满期赔付率 || 0;
            const claimFreq = item.出险率 || 0;
            const expenseRate = item.费用率 || 0;
            const premiumContribution = item.保费占比 || 0;
            const claimContribution = item.已报告赔款占比 || 0;

            // 保费进度异常判断
            if (typeof progress === 'number' && progress < 95) {
                alerts.premium.push(name);
            }

            // 变动成本率异常判断
            if (costRate > 94) {
                alerts.cost.push(name);
            }

            // 赔付率异常判断（统一为70%）
            if (lossRate > 70) {
                alerts.lossRate.push(name);
            }

            // 赔款贡献度判断（赔款贡献度 > 保费贡献度）
            if (claimContribution > premiumContribution) {
                alerts.lossContribution.push(name);
            }

            // 出险率异常判断（假设阈值为30%）
            if (claimFreq > 30) {
                alerts.lossFreq.push(name);
            }

            // 费用率异常判断
            if (expenseRate > 17) {
                alerts.expense.push(name);
            }
        });

        // 根据板块类型生成主题提示文字
        let alertText = '';

        switch(tab) {
            case 'overview':
                // 经营概览 - 三级机构/客户类别/业务类型
                const premiumList = alerts.premium.slice(0, 5).join('、');
                const costList = alerts.cost.slice(0, 5).join('、');
                const parts = [];
                if (premiumList) parts.push(`${premiumList}保费进度落后`);
                if (costList) parts.push(`${costList}变动成本率超标`);
                alertText = parts.length > 0 ? parts.join('；') : '';
                break;

            case 'premium':
                // 保费进度板块
                const premiumAlerts = alerts.premium.slice(0, 8).join('、');
                alertText = premiumAlerts ? `${premiumAlerts}保费进度落后` : '';
                break;

            case 'cost':
                // 变动成本板块
                const costAlerts = alerts.cost.slice(0, 8).join('、');
                alertText = costAlerts ? `${costAlerts}变动成本率超标` : '';
                break;

            case 'loss':
                // 损失暴露板块（2025-12-21更新）
                const lossContributionList = alerts.lossContribution.slice(0, 5).join('、');
                const lossRateList = alerts.lossRate.slice(0, 5).join('、');
                const lossParts = [];
                if (lossContributionList) lossParts.push(`${lossContributionList}的赔款贡献度高于保费贡献度`);
                if (lossRateList) lossParts.push(`${lossRateList}的满期赔付率超70%`);
                alertText = lossParts.length > 0 ? lossParts.join('，') : '';
                break;

            case 'expense':
                // 费用支出板块
                const expenseAlerts = alerts.expense.slice(0, 8).join('、');
                alertText = expenseAlerts ? `${expenseAlerts}费用率超标` : '';
                break;
        }

        // 显示或隐藏主题提示
        if (alertText) {
            textEl.textContent = alertText;
            alertEl.style.display = 'flex';
        } else {
            alertEl.style.display = 'none';
        }
    },

    // 生成动态标题
    generateDynamicTitle(tab, dimension, data) {
        const titleId = `${tab}-dynamic-title`;
        const titleEl = document.getElementById(titleId);

        if (!titleEl) return;

        let title = '';

        switch(tab) {
            case 'overview':
                if (dimension === 'org') {
                    title = '进度落后且亏损机构';
                } else if (dimension === 'category') {
                    title = '变动成本率超预警线的客户类别';
                } else if (dimension === 'businessType') {
                    title = '变动成本率超预警线的业务类型';
                }
                break;
            // 其他模块的标题生成将在后续添加
        }

        if (title) {
            titleEl.textContent = title;
            titleEl.style.display = 'block';
        } else {
            titleEl.style.display = 'none';
        }
    },

    // 生成正文分析
    generateAnalysisContent(tab, dimension, data) {
        const contentId = `${tab}-analysis-content`;
        const listId = `${tab}-analysis-list`;
        const contentEl = document.getElementById(contentId);
        const listEl = document.getElementById(listId);

        if (!contentEl || !listEl) return;

        let analysisItems = [];

        switch(tab) {
            case 'overview':
                if (dimension === 'org') {
                    analysisItems = this.generateOrgProgressAnalysis(data);
                }
                // 其他维度的分析将在后续添加
                break;
            // 其他模块的分析将在后续添加
        }

        if (analysisItems.length > 0) {
            listEl.innerHTML = analysisItems.map((item, index) =>
                `<li data-number="${index + 1}.">${item}</li>`
            ).join('');
            contentEl.style.display = 'block';
        } else {
            contentEl.style.display = 'none';
        }
    },

    // 生成三级机构进度分析
    generateOrgProgressAnalysis(data) {
        if (!data || !Array.isArray(data)) return [];

        const items = [];
        const goodOrgs = [];
        const badProgressOrgs = [];
        const lossOrgs = [];

        data.forEach(item => {
            const progress = item.保费时间进度达成率;
            const profit = item.边际贡献额 || 0;

            if (typeof progress !== 'number') {
                return;
            }

            if (progress >= 100 && profit > 0) {
                goodOrgs.push(item.机构);
            } else if (progress >= 100 && profit <= 0) {
                badProgressOrgs.push(item.机构);
            } else if (progress < 100 && profit > 0) {
                lossOrgs.push(item.机构);
            }
        });

        if (goodOrgs.length > 0) {
            items.push(`超进度且盈利机构：${goodOrgs.join('、')}`);
        }
        if (badProgressOrgs.length > 0) {
            items.push(`超进度但亏损机构：${badProgressOrgs.join('、')}`);
        }
        if (lossOrgs.length > 0) {
            items.push(`盈利但进度落后机构：${lossOrgs.join('、')}`);
        }

        return items;
    },

    renderChart(tab) {
        // 性能优化：使用防抖版本（除非是首次渲染）
        if (this._chartDataCache && this._chartDataCache[tab]) {
            return this.debouncedRenderChart(tab);
        } else {
            return this._renderChartInternal(tab);
        }
    },

    _renderChartInternal(tab) {
        const dimension = this.currentDimensions[tab];
        if (tab === 'overview' && dimension === 'kpi') return;

        let data, dimField;
        if (dimension === 'org') {
            data = this.data.dataByOrg;
            dimField = '机构';
        } else if (dimension === 'category') {
            data = this.data.dataByCategory;
            dimField = '客户类别';
        } else if (dimension === 'businessType') {
            data = this.data.dataByBusinessType;
            dimField = '业务类型简称';
        } else {
            data = this.data.dataByOrg;
            dimField = '机构';
        }
        
        if (!data) return;
        data = [...data]; // Clone
        if (dimension === 'org') data = data.filter(d => d[dimField] !== '本部').slice(0, 12);

        // Sorting
        if (tab === 'overview' || tab === 'cost') data.sort((a, b) => (b.变动成本率 || 0) - (a.变动成本率 || 0));
        else if (tab === 'premium') data.sort((a, b) => (b.签单保费 || 0) - (a.签单保费 || 0));
        else if (tab === 'loss') {
            // 根据子标签选择排序字段
            const subTab = this.currentSubTab.loss || 'bubble';
            if (subTab === 'bubble') {
                // 赔付率VS占比：按赔款占比降序排列
                data.sort((a, b) => (b.已报告赔款占比 || 0) - (a.已报告赔款占比 || 0));
            } else {
                // 频度VS额度：按满期赔付率降序排列
                data.sort((a, b) => (b.满期赔付率 || 0) - (a.满期赔付率 || 0));
            }
        }
        else if (tab === 'expense') data.sort((a, b) => (b.费用额 || 0) - (a.费用额 || 0));

        // 保存聚合数据供主题提示使用
        this.aggregatedData = data.map(d => ({
            name: d[dimField],
            保费时间进度达成率: d.保费时间进度达成率 ?? d.年计划达成率 ?? null,
            变动成本率: d.变动成本率 || 0,
            满期赔付率: d.满期赔付率 || 0,
            出险率: d.出险率 || 0,
            费用率: d.费用率 || 0,
            保费占比: d.保费占比 || 0,
            已报告赔款占比: d.已报告赔款占比 || 0
        }));

        const chartDom = document.getElementById(`chart-${tab}`);
        if (!chartDom) return;
        
        if (echarts.getInstanceByDom(chartDom)) echarts.dispose(chartDom);
        const chart = echarts.init(chartDom);
        
        let option = {};
        // ... (Chart Options Logic - Simplified/Ported) ...
        
        // Remove any existing indicator table before rendering new chart
        const oldTable = chartDom.parentElement.querySelector('.indicator-table-container');
        if (oldTable) oldTable.remove();
        
        if (tab === 'overview') {
            const globalOptions = this.getGlobalChartOptions();

            // 准备图表数据
            const claimRates = data.map(d => d.满期赔付率 || 0);  // 满期赔付率
            const expenseRates = data.map(d => d.费用率 || 0);   // 费用率

            // 根据维度决定折线图数据系列
            let lineSeriesData, lineSeriesName, lineSeriesColor;
            if (dimension === 'org') {
                // 三级机构维度：使用保费时间进度达成率折线图
                lineSeriesData = data.map(d => d.保费时间进度达成率 ?? d.年计划达成率 ?? null);
                lineSeriesName = '保费时间进度达成率';
                lineSeriesColor = '#0066cc';  // 深蓝色
            } else {
                // 客户类别/业务类型维度：使用保费贡献度折线图
                lineSeriesData = data.map(d => d.保费占比 || 0);
                lineSeriesName = '保费贡献度';
                lineSeriesColor = '#0066cc';  // 深蓝色
            }

            // 构建双Y轴配置：左轴堆积图（满期赔付率+费用率），右轴折线图
            option = {
                tooltip: {
                    trigger: 'axis',
                    textStyle: { fontWeight: 'bold' },
                    formatter: (params) => {
                        let result = `${params[0].axisValue}<br/>`;

                        params.forEach(param => {
                            if (param.seriesName === '满期赔付率') {
                                result += `${param.marker}满期赔付率: ${this.formatRate(param.value, 1)}%<br/>`;
                            } else if (param.seriesName === '费用率') {
                                result += `${param.marker}费用率: ${this.formatRate(param.value, 1)}%<br/>`;
                            } else if (param.seriesName === lineSeriesName) {
                                result += `${param.marker}${lineSeriesName}: ${this.formatRate(param.value, 1)}%<br/>`;
                            }
                        });

                        return result;
                    }
                },
                legend: {
                    data: ['满期赔付率', '费用率', lineSeriesName],
                    ...globalOptions.legend
                },
                grid: globalOptions.grid,
                xAxis: {
                    type: 'category',
                    data: data.map(d => d[dimField]),
                    ...globalOptions.xAxis
                },
                yAxis: [
                    {
                        ...globalOptions.yAxis,
                        type: 'value',
                        name: '占比(%)',
                        min: 0,
                        max: dimension === 'org' ? 150 : 100,  // 与右轴保持一致，避免视觉误导
                        position: 'left',
                        splitLine: { show: false }  // 确保不显示网格线
                    },
                    {
                        ...globalOptions.yAxis,
                        type: 'value',
                        name: lineSeriesName + '(%)',
                        min: 0,
                        max: dimension === 'org' ? 150 : 100,  // 保费时间进度达成率最高150%，保费贡献度最高100%
                        position: 'right',
                        splitLine: { show: false }  // 确保不显示网格线
                    }
                ],
                series: [
                    {
                        name: '满期赔付率',
                        type: 'bar',
                        yAxisIndex: 0,
                        data: claimRates,
                        itemStyle: { color: '#87ceeb' },  // 浅蓝色
                        label: {
                            show: true,
                            position: 'inside',  // 在柱内显示
                            formatter: (p) => `${this.formatRate(p.value, 1)}%`,
                            fontSize: this.calculateOptimalLabelSize(data),
                            color: '#333333'  // 深色字体便于阅读
                        },
                        stack: 'rates'  // 启用堆积
                    },
                    {
                        name: '费用率',
                        type: 'bar',
                        yAxisIndex: 0,
                        data: expenseRates,
                        itemStyle: { color: '#d3d3d3' },  // 浅灰色
                        label: {
                            show: true,
                            position: 'inside',  // 在柱内显示
                            formatter: (p) => `${this.formatRate(p.value, 1)}%`,
                            fontSize: this.calculateOptimalLabelSize(data),
                            color: '#333333'  // 深色字体便于阅读
                        },
                        stack: 'rates',  // 启用堆积
                        markLine: {
                            silent: false,
                            symbol: 'none',
                            data: [
                                {
                                    yAxis: 91,
                                    name: '变动成本率预警线',
                                    lineStyle: {
                                        color: '#ffc000',
                                        type: 'dashed',
                                        width: 1,
                                        opacity: 0.8
                                    },
                                    label: {
                                        formatter: '变动成本率: {c}%',
                                        fontWeight: 'bold',
                                        color: '#ffc000',
                                        fontSize: 12,
                                        position: 'end'
                                    }
                                },
                                {
                                    yAxis: 72,
                                    name: '满期赔付率预警线',
                                    lineStyle: {
                                        color: '#ffc000',
                                        type: 'dashed',
                                        width: 1,
                                        opacity: 0.8
                                    },
                                    label: {
                                        formatter: '满期赔付率: {c}%',
                                        fontWeight: 'bold',
                                        color: '#ffc000',
                                        fontSize: 12,
                                        position: 'end'
                                    }
                                }
                            ]
                        }
                    },
                    {
                        name: lineSeriesName,
                        type: 'line',
                        yAxisIndex: 1,
                        data: lineSeriesData,
                        lineStyle: {
                            color: lineSeriesColor,  // 深蓝色连线
                            width: 1
                        },
                        itemStyle: {
                            color: lineSeriesColor,
                            borderWidth: 2
                        },
                        label: {
                            show: true,
                            position: 'top',  // 在数据点上方显示
                            formatter: (p) => {
                                // 确保百分比格式正确
                                if (p.value === null || p.value === undefined) return '';
                                return `${this.formatRate(p.value, 1)}%`;
                            },
                            color: lineSeriesColor,  // 深蓝色字体
                            fontSize: this.calculateOptimalLabelSize(data),
                            fontWeight: 'bold'  // 加粗突出显示
                        },
                        symbolSize: 6,  // 数据点大小
                        smooth: false
                    }
                ]
            };
        } else if (tab === 'cost') {
            const thresholds = this.data.thresholds || {};
            const globalOptions = this.getGlobalChartOptions();

            option = {
                tooltip: {
                    trigger: 'item',
                    textStyle: { fontWeight: 'bold' },
                    formatter: (params) => {
                        const d = data[params.dataIndex];
                        return `${d[dimField]}<br/>` +
                               `满期赔付率: ${this.formatRate(d.满期赔付率, 1)}%<br/>` +
                               `费用率: ${this.formatRate(d.费用率, 1)}%<br/>` +
                               `变动成本率: ${this.formatRate(d.变动成本率, 1)}%<br/>` +
                               `保费占比: ${this.formatRate(d.保费占比, 1)}%`;
                    }
                },
                grid: globalOptions.grid,
                xAxis: {
                    name: '满期赔付率(%)',
                    min: 0,
                    max: 130,
                    ...globalOptions.xAxis
                },
                yAxis: {
                    ...globalOptions.yAxis,
                    name: '费用率(%)',
                    min: 0,
                    max: 30,
                    splitLine: { show: false }  // 确保不显示网格线
                },
                series: [{
                    type: 'scatter',
                    symbolSize: (val, params) => this.calculateBubbleSize(data.map(d => d.签单保费), params.dataIndex),
                    data: data.map(d => ({
                        name: d[dimField],
                        value: [d.满期赔付率, d.费用率, d.变动成本率, d.保费占比],
                        itemStyle: { color: this.getStatusColor(d.变动成本率) },
                        满期赔付率: d.满期赔付率,
                        费用率: d.费用率,
                        变动成本率: d.变动成本率,
                        保费占比: d.保费占比
                    })),
                    label: {
                        show: true,
                        position: 'top',
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: '#000000',
                        formatter: (p) => {
                            // 单行显示：名称 值%
                            const name = p.data.name;
                            const rate = this.formatRate(p.data.value[2], 1);
                            return `${name} ${rate}%`;
                        }
                    },
                    labelLayout: { moveOverlap: 'shiftY' },
                    markLine: {
                        silent: false,
                        symbol: 'none',
                        lineStyle: { type: 'dashed', width: 1, opacity: 0.8 },
                        data: [
                            {
                                xAxis: 70,  // 统一为70%
                                name: '满期赔付率预警线',
                                lineStyle: { color: '#ffc000' },  // 统一黄色
                                label: {
                                    formatter: '满期赔付率预警线 70%',
                                    fontWeight: 'bold',
                                    color: '#ffc000',
                                    fontSize: 12,
                                    rotate: 0  // 确保文字横向
                                }
                            },
                            {
                                yAxis: thresholds['费用率'] || 17,
                                name: '费用率预警线',
                                lineStyle: { color: '#ffc000' },  // 统一黄色
                                label: {
                                    formatter: '费用率预警线 17%',
                                    fontWeight: 'bold',
                                    color: '#ffc000',
                                    fontSize: 12,
                                    rotate: 0  // 确保文字横向
                                }
                            }
                        ]
                    }
                }]
            };
        } else if (tab === 'premium') {
            const premiums = data.map(d => Math.round(d.签单保费/10000) || 0);
            const normalizedPremiums = this.normalizeBarHeights(premiums);
            const globalOptions = this.getGlobalChartOptions();

            option = {
                tooltip: {
                    trigger: 'axis',
                    textStyle: { fontWeight: 'bold' },
                    formatter: (params) => {
                        const p = params?.[0];
                        const point = p?.data;
                        if (!point) return '';
                        return `${p.axisValue}<br/>签单保费: ${this.formatInteger(point.actual)}万元`;
                    }
                },
                grid: globalOptions.grid,
                xAxis: {
                    type: 'category',
                    data: data.map(d => d[dimField]),
                    ...globalOptions.xAxis
                },
                yAxis: {
                    ...globalOptions.yAxis,
                    type: 'value',
                    name: '签单保费(万元)',
                    splitLine: { show: false }  // 确保不显示网格线
                },
                series: [{
                    type: 'bar',
                    data: data.map((d, index) => ({
                        value: normalizedPremiums[index],
                        actual: premiums[index],
                        itemStyle: { color: this.getStatusColor(d.变动成本率) }
                    })),
                    label: {
                        show: true,
                        position: 'top',
                        formatter: (p) => `${this.formatInteger(p.data.actual)}`
                    },
                    labelLayout: { moveOverlap: 'shiftY' }
                }]
            };
        } else if (tab === 'loss') {
            const subTab = this.currentSubTab.loss || 'bubble';
            if (subTab === 'bubble') {
                // 赔付率V占比：双Y轴组合图（Y1=占比柱状，Y2=满期赔付率折线）
                const globalOptions = this.getGlobalChartOptions();
                const thresholds = this.data.thresholds || {};
                option = {
                    tooltip: {
                        trigger: 'axis',
                        textStyle: { fontWeight: 'bold' },
                        formatter: (params) => {
                            if (!params || params.length === 0) return '';
                            const title = params[0].axisValue;
                            const lines = params.map(p => `${p.marker}${p.seriesName}: ${this.formatRate(p.value, 1)}%`);
                            return `${title}<br/>${lines.join('<br/>')}`;
                        }
                    },
                    grid: globalOptions.grid,
                    xAxis: {
                        type: 'category',
                        data: data.map(d => d[dimField]),
                        ...globalOptions.xAxis
                    },
                    yAxis: [
                        {
                            ...globalOptions.yAxis,
                            type: 'value',
                            name: '占比(%)',
                            min: 0,
                            max: 100,
                            splitLine: { show: false }  // 确保不显示网格线
                        },
                        {
                            ...globalOptions.yAxis,
                            type: 'value',
                            name: '满期赔付率(%)',
                            min: 0,
                            max: 130,
                            splitLine: { show: false }  // 确保不显示网格线
                        }
                    ],
                    legend: {
                        data: [this.getDisplayName('保费占比'), this.getDisplayName('已报告赔款占比'), '满期赔付率'],
                        top: 0,
                        textStyle: { fontWeight: 'bold' }
                    },
                    series: [
                        {
                            name: this.getDisplayName('保费占比'),
                            type: 'bar',
                            yAxisIndex: 0,
                            data: data.map(d => d.保费占比 || 0),
                            itemStyle: { color: '#e0e0e0' },  // 浅灰色
                            label: { show: true, position: 'top', formatter: (p) => `${this.formatRate(p.value, 1)}%` },
                            labelLayout: { moveOverlap: 'shiftY' }
                        },
                        {
                            name: this.getDisplayName('已报告赔款占比'),
                            type: 'bar',
                            yAxisIndex: 0,
                            data: data.map(d => d.已报告赔款占比 || 0),
                            itemStyle: { color: '#a6a6a6' },  // 灰色
                            label: { show: true, position: 'top', formatter: (p) => `${this.formatRate(p.value, 1)}%` },
                            labelLayout: { moveOverlap: 'shiftY' }
                        },
                        {
                            name: '满期赔付率',
                            type: 'line',
                            yAxisIndex: 1,
                            data: data.map(d => d.满期赔付率 || 0),
                            itemStyle: { color: '#0070c0' },  // 蓝色
                            lineStyle: { color: '#0070c0', width: 1 },  // 蓝色，细线
                            label: { show: true, position: 'top', formatter: (p) => `${this.formatRate(p.value, 1)}%` },
                            labelLayout: { moveOverlap: 'shiftY' },
                            markLine: {
                                silent: false,
                                symbol: 'none',
                                lineStyle: { type: 'dashed', width: 1, opacity: 0.8, color: '#ffc000' },
                                data: [
                                    {
                                        yAxis: 70,  // 统一为70%
                                        name: '预警线',
                                        label: {
                                            formatter: '预警线: {c}%',
                                            fontWeight: 'bold',
                                            color: '#ffc000',
                                            fontSize: 12,
                                            position: 'end'
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                };
            } else {
                // 频度VS额度象限图
                const globalOptions = this.getGlobalChartOptions();
                option = {
                    tooltip: {
                        trigger: 'item',
                        textStyle: { fontWeight: 'bold' },
                        formatter: (params) => {
                            const d = data[params.dataIndex];
                            return `${d[dimField]}<br/>` +
                                   `出险率: ${this.formatRate(d.出险率, 1)}%<br/>` +
                                   `案均赔款: ${this.formatInteger(d.案均赔款)}元<br/>` +
                                   `签单保费: ${this.formatWanYuanFromYuan(d.签单保费)}万元`;
                        }
                    },
                    grid: globalOptions.grid,
                    xAxis: {
                        name: '出险率(%)',
                        min: 0,
                        ...globalOptions.xAxis
                    },
                    yAxis: {
                        ...globalOptions.yAxis,
                        name: '案均赔款(元)',
                        min: 0,
                        axisLabel: {
                            formatter: (value) => this.formatInteger(value)
                        },
                        splitLine: { show: false }  // 确保不显示网格线
                    },
                    series: [{
                        type: 'scatter',
                        symbolSize: (val, params) => this.calculateBubbleSize(data.map(d => d.签单保费), params.dataIndex),
                        data: data.map(d => ({
                            name: d[dimField],
                            value: [d.出险率, d.案均赔款 || 0],
                            itemStyle: { color: this.getStatusColor(d.变动成本率) },
                            出险率: d.出险率,
                            案均赔款: d.案均赔款
                        })),
                    label: {
                        show: true,
                        position: 'top',
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: '#000000',
                        formatter: (p) => {
                            // 单行显示：名称 值%
                            const name = p.data.name;
                            const rate = this.formatRate(p.data.value[0], 1);
                            return `${name} ${rate}%`;
                        }
                    },
                    labelLayout: { moveOverlap: 'shiftY' },
                    markLine: {
                        silent: false,
                        symbol: 'none',
                        lineStyle: { opacity: 0.8 },
                        data: this.getMotorcycleModeWarningLines()
                        }
                    }]
                };
                
                // Add indicator table for quadrant chart
                const indicators = ['出险率', '案均赔款', '变动成本率', '签单保费'];
                const tableHtml = this.generateIndicatorTable(data, dimField, indicators);
                const tableContainer = document.createElement('div');
                tableContainer.innerHTML = tableHtml;
                chartDom.parentElement.appendChild(tableContainer.firstChild);
            }
        } else if (tab === 'expense') {
            // 费用支出板块（2025-12-21修改：去掉费用金额占比，调整颜色）
            const expenseAmounts = data.map(d => d.费用额 || 0);  // 费用金额（左轴柱状图）
            const expenseRates = data.map(d => d.费用率 || 0);     // 费用率（右轴折线图）
            const globalOptions = this.getGlobalChartOptions();

            option = {
                tooltip: {
                    trigger: 'axis',
                    textStyle: { fontWeight: 'bold' },
                    formatter: (params) => {
                        let result = `${params[0].axisValue}<br/>`;
                        
                        params.forEach(param => {
                            if (param.seriesName === '费用金额') {
                                result += `${param.marker}费用金额: ${this.formatWanYuanFromYuan(param.value)}<br/>`;
                            } else if (param.seriesName === '费用率') {
                                result += `${param.marker}费用率: ${this.formatRate(param.value, 1)}%<br/>`;
                            }
                        });
                        
                        return result;
                    }
                },
                legend: {
                    data: ['费用金额', '费用率'],
                    ...globalOptions.legend
                },
                grid: globalOptions.grid,
                xAxis: {
                    type: 'category',
                    data: data.map(d => d[dimField]),
                    ...globalOptions.xAxis
                },
                yAxis: [
                    {
                        ...globalOptions.yAxis,
                        type: 'value',
                        name: '费用金额(万元)',
                        position: 'left',
                        splitLine: { show: false }  // 确保不显示网格线
                    },
                    {
                        ...globalOptions.yAxis,
                        type: 'value',
                        name: '比率(%)',
                        position: 'right',
                        splitLine: { show: false }  // 确保不显示网格线
                    }
                ],
                series: [
                    {
                        name: '费用金额',
                        type: 'bar',
                        yAxisIndex: 0,
                        data: expenseAmounts,
                        itemStyle: { color: '#e0e0e0' },  // 浅灰色
                        label: {
                            show: true,
                            position: 'top',
                            formatter: (p) => `${this.formatWanYuanFromYuan(p.value)}万`,
                            color: '#000000',  // 黑色字体
                            fontSize: this.calculateOptimalLabelSize(data),
                            fontWeight: 'bold'
                        }
                    },
                    {
                        name: '费用率',
                        type: 'line',
                        yAxisIndex: 1,
                        data: expenseRates,
                        lineStyle: {
                            color: '#0066cc',  // 深蓝色
                            width: 1
                        },
                        itemStyle: {
                            color: '#0066cc'
                        },
                        label: {
                            show: true,
                            position: 'top',
                            formatter: (p) => `${this.formatRate(p.value, 1)}%`,
                            color: '#0066cc',  // 深蓝色字体
                            fontSize: this.calculateOptimalLabelSize(data),
                            fontWeight: 'bold'
                        },
                        symbolSize: 6,
                        smooth: false
                    }
                ]
            };

            // 为费用率添加预警线（14%）
            option.series[1].markLine = {
                silent: false,
                symbol: 'none',
                data: [
                    {
                        yAxis: 14,
                        name: '费用率预警线',
                        lineStyle: {
                            color: '#ffc000',
                            type: 'dashed',
                            width: 1,
                            opacity: 0.8
                        },
                        label: {
                            formatter: '费用率预警线: {c}%',
                            fontWeight: 'bold',
                            color: '#ffc000',
                            fontSize: 12,
                            position: 'end'
                        }
                    }
                ]
            };
        }

        option = this._applyResponsiveCategoryXAxis(option, chart);
        chart.setOption(option);

        // 如果是费用支出板块，同时渲染费用超支图表
        if (tab === 'expense') {
            this.renderExpenseSurplusChart(data, dimField);
        }

        // 生成动态标题和正文分析
        this.generateDynamicTitle(tab, dimension, data);
        this.generateAnalysisContent(tab, dimension, data);
        this.generateSectionAlertTitle(tab, dimension);

        // Add indicator table if bubble chart (cost tab)
        // Note: Loss tab logic handled separately above
        if (tab === 'cost') {
             let indicators = ['满期赔付率', '费用率', '变动成本率', '签单保费'];
             
             if (indicators.length > 0) {
                 const tableHtml = this.generateIndicatorTable(data, dimField, indicators);
                 const tableContainer = document.createElement('div');
                 tableContainer.innerHTML = tableHtml;
                 chartDom.parentElement.appendChild(tableContainer.firstChild);
             }
        }

        // 性能优化：缓存渲染结果
        if (!this._chartDataCache) this._chartDataCache = {};
        this._chartDataCache[tab] = {
            data: data.length,
            timestamp: Date.now()
        };
    },

    // 渲染费用超支分析图表
    renderExpenseSurplusChart(data, dimField) {
        const chartDom = document.getElementById('chart-expense-surplus');
        if (!chartDom) return;

        // 获取费用率阈值配置
        const expenseThreshold = this.data.thresholds?.['费用率阈值']?.['预算阈值'] || 14;

        if (echarts.getInstanceByDom(chartDom)) echarts.dispose(chartDom);
        const chart = echarts.init(chartDom);

        // 准备数据
        const surplusAmounts = data.map(d => (d.费用结余额 || 0) / 10000); // 转换为万元
        const rateDeviations = data.map(d => d.费用率超支 || 0);

        const globalOptions = this.getGlobalChartOptions();

        const option = {
            tooltip: {
                trigger: 'axis',
                textStyle: { fontWeight: 'bold' },
                formatter: (params) => {
                    const item = data[params[0].dataIndex];
                    const surplus = item.费用结余额 || 0;
                    const rateDeviation = item.费用率超支 || 0;
                    const actualRate = item.费用率 || 0;

                    let result = `${params[0].axisValue}<br/>`;
                    result += `费用超支额: ${surplus >= 0 ? '+' : ''}${this.formatWanYuanFromYuan(surplus)}`;
                    result += surplus >= 0 ? '（超支）' : '（节约）';
                    result += '<br/>';
                    result += `费用率超支: ${rateDeviation >= 0 ? '+' : ''}${this.formatRate(Math.abs(rateDeviation), 1)}%<br/>`;
                    result += `实际费用率: ${this.formatRate(actualRate, 1)}%<br/>`;
                    result += `费用率阈值: ${expenseThreshold}%`;

                    return result;
                }
            },
            legend: {
                data: ['费用超支额', '费用率超支'],
                ...globalOptions.legend
            },
            grid: globalOptions.grid,
            xAxis: {
                type: 'category',
                data: data.map(d => d[dimField]),
                ...globalOptions.xAxis
            },
            yAxis: [
                {
                    type: 'value',
                    name: '费用超支额(万元)',
                    position: 'left',
                    splitLine: { show: false },  // 不显示网格线
                    axisLabel: {
                        color: '#333333',
                        formatter: '{value}'
                    },
                    axisLine: {
                        lineStyle: { color: '#333333' }
                    }
                },
                {
                    type: 'value',
                    name: '费用率超支(%)',
                    position: 'right',
                    splitLine: { show: false },  // 不显示网格线
                    axisLabel: {
                        color: '#0070c0',
                        formatter: '{value}%'
                    },
                    axisLine: {
                        lineStyle: { color: '#0070c0' }
                    }
                }
            ],
            series: [
                {
                    name: '费用超支额',
                    type: 'bar',
                    yAxisIndex: 0,
                    data: surplusAmounts.map((value, index) => ({
                        value: value,
                        itemStyle: {
                            color: '#d0d0d0' // 浅灰色柱子（统一颜色）
                        }
                    })),
                    label: {
                        show: true,
                        position: 'top', // 数值标签统一在柱子上方
                        formatter: (params) => {
                            const value = params.value;
                            const sign = value >= 0 ? '+' : '';
                            const formattedValue = `${sign}${this.formatWanYuanFromYuan(value * 10000)}`;
                            // 使用富文本格式设置颜色
                            const style = value >= 0 ? 'positive' : 'negative';
                            return `{${style}|${formattedValue}}`;
                        },
                        rich: {
                            positive: {
                                color: '#ff0000',  // 正值红色
                                fontWeight: 'bold',
                                fontSize: this.calculateOptimalLabelSize(data)
                            },
                            negative: {
                                color: '#00b050',  // 负值绿色
                                fontWeight: 'bold',
                                fontSize: this.calculateOptimalLabelSize(data)
                            }
                        }
                    },
                    markLine: {
                        silent: false,
                        symbol: 'none',
                        data: [
                            {
                                yAxis: 0,
                                name: '预算线',
                                lineStyle: {
                                    color: '#333333',
                                    type: 'solid',
                                    width: 1
                                },
                                label: {
                                    formatter: '预算基准线',
                                    fontWeight: 'bold',
                                    color: '#333333',
                                    fontSize: 12,
                                    position: 'insideEndTop'
                                }
                            }
                        ]
                    }
                },
                {
                    name: '费用率超支',
                    type: 'line',
                    yAxisIndex: 1,
                    data: rateDeviations,
                    lineStyle: {
                        color: '#0070c0',
                        width: 1
                    },
                    itemStyle: {
                        color: '#0070c0'
                    },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: (params) => {
                            const sign = params.value >= 0 ? '+' : '';
                            return `${sign}${this.formatRate(Math.abs(params.value), 1)}%`;
                        },
                        color: '#0070c0',
                        fontSize: this.calculateOptimalLabelSize(data),
                        fontWeight: 'bold'
                    },
                    symbolSize: 6,
                    smooth: false,
                    markLine: {
                        silent: false,
                        symbol: 'none',
                        data: [
                            {
                                yAxis: 0,
                                name: '费用率阈值线',
                                lineStyle: {
                                    color: '#ffc000',
                                    type: 'dashed',
                                    width: 1,
                                    opacity: 0.8
                                },
                                label: {
                                    formatter: `${expenseThreshold}%阈值线`,
                                    fontWeight: 'bold',
                                    color: '#ffc000',
                                    fontSize: 12,
                                    position: 'insideEndTop'
                                }
                            }
                        ]
                    }
                }
            ]
        };

        const responsiveOption = this._applyResponsiveCategoryXAxis(option, chart);
        chart.setOption(responsiveOption);
    },

    getDrillDownDimensions() {
        return [
            // Group 1: Core Organization (Rank 1) - 支持同城/异地分组
            {
                key: 'third_level_organization',
                label: '三级机构',
                group: 1,
                hasGrouping: true,  // 启用分组功能
                groupOptions: [
                    {
                        value: 'local',
                        label: '同城',
                        children: ['天府', '新都', '高新', '武侯', '青羊']
                    },
                    {
                        value: 'remote',
                        label: '异地',
                        children: ['宜宾', '泸州', '自贡', '乐山', '德阳', '资阳', '达州']
                    }
                ]
            },
            
            // Group 2: Time Dimension
            { key: 'policy_start_year', label: '保单年度', group: 2 },
            { key: 'week_number', label: '周次', group: 2 },
            
            // Group 3: Business Core
            { key: 'insurance_type', label: '险种', group: 3 },
            { key: 'ui_short_label', label: '业务类型', group: 3 },
            { key: 'coverage_type', label: '险别组合', group: 3 },
            
            // Group 4: Vehicle Attributes
            { key: 'energy_type', label: '是否新能源', group: 4 },
            { key: 'is_transferred_vehicle', label: '是否过户', group: 4 },
            { key: 'renewal_status', label: '续保状态', group: 4 },
            { key: 'vehicle_insurance_grade', label: '车险分等级', group: 4 },
            { key: 'small_truck_score', label: '小货车评分', group: 4 },
            { key: 'large_truck_score', label: '大货车评分', group: 4 },
            
            // Group 5: Channel
            { key: 'terminal_source', label: '终端来源', group: 5 }
        ];
    },

    // 检查动态筛选器的可见性及级联锁定
    checkDynamicVisibility() {
        const businessTypes = this.filterState.drill.applied.find(c => c.dimension === 'ui_short_label')?.values || [];
        const draftBusinessTypes = this.filterState.drill.draft['ui_short_label'] || [];
        
        let currentBusinessTypes = draftBusinessTypes.length > 0 ? draftBusinessTypes : businessTypes;
        if (this.filterState.drill.draft['ui_short_label']) {
            currentBusinessTypes = this.filterState.drill.draft['ui_short_label'];
        }

        // 1. 动态可见性 (已移除隐藏逻辑，所有筛选器始终显示)
        // const showVehicleGrade = currentBusinessTypes.some(t => t.includes('非营客-旧') || t.includes('家自-旧'));
        // const showSmallTruck = currentBusinessTypes.some(t => t.includes('非营货') || t.includes('营货-<2t'));
        // const showLargeTruck = currentBusinessTypes.some(t => t.includes('营货') && !t.includes('营货-<2t'));

        // this.toggleSelectorVisibility('vehicle_insurance_grade', showVehicleGrade);
        // this.toggleSelectorVisibility('small_truck_score', showSmallTruck);
        // this.toggleSelectorVisibility('large_truck_score', showLargeTruck);
        
        // 确保所有 selector 可见
        this.getDrillDownDimensions().forEach(dim => {
            this.toggleSelectorVisibility(dim.key, true);
        });

        // 2. 级联锁定逻辑
        this.applyCascadingLocks(currentBusinessTypes);
    },

    // 应用级联锁定规则
    applyCascadingLocks(businessTypes) {
        // 解锁所有
        this.unlockSelector('renewal_status');
        this.unlockSelector('is_transferred_vehicle');

        if (!businessTypes || businessTypes.length === 0) {
            return;
        }

        // 规则 A: 续保状态
        const allNew = businessTypes.every(t => t.includes('新') && !t.includes('旧') && !t.includes('过户'));
        const hasOld = businessTypes.some(t => t.includes('非营客-旧'));

        if (allNew) {
            this.lockSelector('renewal_status', ['新保']);
        } else if (hasOld) {
            // 如果包含“非营客-旧”，排除“新保”
            // 检查当前是否已选“新保”，如果是则移除
            let currentRenewal = this.filterState.drill.draft['renewal_status'] || [];
            if (currentRenewal.includes('新保')) {
                currentRenewal = currentRenewal.filter(v => v !== '新保');
                this.filterState.drill.draft['renewal_status'] = currentRenewal;
                this.updateSelectorButtonUI('renewal_status');
            }
            // 标记特殊状态，用于 loadDropdownValues 过滤
            this._excludeNewRenewal = true;
        } else {
            this._excludeNewRenewal = false;
        }

        // 规则 B: 是否过户
        // 业务类型选择非营客-过户，是否过户就默认选过户，不能选非过户
        const hasTransfer = businessTypes.some(t => t.includes('非营客-过户'));
        
        if (hasTransfer) {
            this.lockSelector('is_transferred_vehicle', ['true']); // true 表示过户
        }
    },

    // 锁定选择器为特定值
    lockSelector(dimensionKey, values) {
        // 1. 更新 draft
        this.filterState.drill.draft[dimensionKey] = values;
        
        // 2. 更新 UI
        this.updateSelectorButtonUI(dimensionKey);
        
        // 3. 禁用按钮交互 (添加 locked 样式)
        const btn = document.querySelector(`.drill-selector-btn[data-dimension="${dimensionKey}"]`);
        if (btn) {
            btn.classList.add('locked');
            // 禁用点击事件的最简单方法是 CSS pointer-events: none
            // 或者在 click handler 中检查
        }
    },

    // 解锁选择器
    unlockSelector(dimensionKey) {
        const btn = document.querySelector(`.drill-selector-btn[data-dimension="${dimensionKey}"]`);
        if (btn) {
            btn.classList.remove('locked');
        }
        // 注意：解锁不代表清空值，保持当前状态即可
    },

    toggleSelectorVisibility(dimensionKey, visible) {
        const btn = document.querySelector(`.drill-selector-btn[data-dimension="${dimensionKey}"]`);
        if (btn) {
            btn.style.display = visible ? 'flex' : 'none';
            if (!visible) {
                // 如果隐藏，需要清空已选值
                if (this.filterState.drill.draft[dimensionKey]) {
                    this.filterState.drill.draft[dimensionKey] = [];
                }
                // 也要从 applied 中移除，但这需要 apply 才能生效。
                // 暂时只清空 draft，并在 UI 上重置。
                // 实际应用时，如果不可见，是否应该自动剔除？
                // 简单起见，隐藏时仅仅隐藏 UI，用户下次 Apply 时如果没动，还是会带着旧值？
                // 应该在隐藏时自动清理 Applied 吗？
                // 既然是动态依赖，依赖消失，子条件也应失效。
                const appliedIndex = this.filterState.drill.applied.findIndex(c => c.dimension === dimensionKey);
                if (appliedIndex !== -1) {
                    this.filterState.drill.applied.splice(appliedIndex, 1);
                    // 这里直接修改了 applied，可能需要 trigger update? 
                    // 只有当用户点击 Apply 时才会重新计算，所以这里修改 applied 没问题，
                    // 只是下次 Apply 时不会包含它。
                }
                this.updateSelectorButtonUI(dimensionKey);
            }
        }
    },

    initFilters() {
        // Init Analysis Mode Toggles
        this.initAnalysisModeToggles();

        // 移除全局应用按钮监听，改用下拉框内部的确定按钮
        document.getElementById('btn-reset-filters').addEventListener('click', () => this.resetFilters());

        // 点击页面其他地方关闭下拉面板
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.drill-selector-btn') && !e.target.closest('.drill-dropdown-panel')) {
                this.closeDropdown();
            }
        });
    },

    initAnalysisModeToggles() {
        // 创建筛选控制行容器（如果不存在）
        let controlsRow = document.querySelector('.filter-controls-row');
        if (!controlsRow) {
            const filterControlBar = document.querySelector('.filter-control-bar');
            controlsRow = document.createElement('div');
            controlsRow.className = 'filter-controls-row';
            
            // 将所有现有的filter-section移动到这个容器中
            const filterSections = filterControlBar.querySelectorAll('.filter-section, .drill-selector-section');
            filterSections.forEach(section => {
                controlsRow.appendChild(section);
            });
            
            filterControlBar.appendChild(controlsRow);
        }

        // Create Toggle Container if not exists - 移动到header区域
        let toggleContainer = document.getElementById('analysis-mode-toggles');
        if (!toggleContainer) {
            const header = document.querySelector('.header');
            toggleContainer = document.createElement('div');
            toggleContainer.id = 'analysis-mode-toggles';
            toggleContainer.className = 'analysis-mode-toggles';
            
            // 在reportDate后面插入
            const reportDate = document.getElementById('reportDate');
            if (reportDate) {
                reportDate.parentNode.insertBefore(toggleContainer, reportDate.nextSibling);
            } else {
                header.appendChild(toggleContainer);
            }
        }

        // 区间模式切换器（2025-12-21修改：移除组织模式，只保留区间模式）
        const intervalModeHtml = `
            <div class="mode-toggle-group">
                <span class="mode-label">区间模式:</span>
                <label><input type="radio" name="mode-interval" value="single" checked> 单周</label>
                <label><input type="radio" name="mode-interval" value="multi"> 多周</label>
            </div>
        `;

        toggleContainer.innerHTML = intervalModeHtml;

        // Add Listeners
        toggleContainer.querySelectorAll('input[name="mode-interval"]').forEach(input => {
            input.addEventListener('change', (e) => this.setAnalysisMode('interval', e.target.value));
        });

        // Initialize State
        this.analysisMode = { interval: 'single' };
    },

    setAnalysisMode(type, value) {
        this.analysisMode[type] = value;
        
        // Handle logic changes（2025-12-21更新：移除组织模式逻辑）
        if (type === 'interval') {
            // Update selection behavior for Time filters
            this.renderDrillSelectors();
        }
        
        // Clear conflicting selections if switching to single mode
        if (value === 'single') {
            this.enforceSingleSelectionMode(type);
        }
    },

    enforceSingleSelectionMode(type) {
        // 2025-12-21更新：移除组织模式单选逻辑，只保留区间模式
        if (type === 'interval') {
            ['policy_start_year', 'week_number'].forEach(key => {
                const draft = this.filterState.drill.draft[key];
                if (draft && draft.length > 1) {
                    this.filterState.drill.draft[key] = [draft[draft.length - 1]]; // Keep latest
                }
            });
            this.applyDrillFilters();
        }
    },



    // 初始化下拉选择器
    initDrillSelectors() {
        this.renderDrillSelectors();
        // Initial check for visibility (in case of re-init or defaults)
        this.checkDynamicVisibility();
    },

    // 渲染选择器按钮（支持动态排序）
    renderDrillSelectors() {
        const container = document.getElementById('drill-selectors');
        const dimensions = this.getDrillDownDimensions();
        
        // 排序逻辑：已选中的排在最前面，其余按 group 和 默认顺序排序
        const appliedDims = this.filterState.drill.applied.map(c => c.dimension);
        const draftDims = Object.keys(this.filterState.drill.draft).filter(k => this.filterState.drill.draft[k].length > 0);
        const activeDims = [...new Set([...appliedDims, ...draftDims])];

        const sortedDimensions = [...dimensions].sort((a, b) => {
            const aActive = activeDims.includes(a.key);
            const bActive = activeDims.includes(b.key);
            
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            
            // 如果状态相同，按 group 排序
            if (a.group !== b.group) return (a.group || 99) - (b.group || 99);
            
            // 保持原数组顺序
            return 0;
        });

        container.innerHTML = ''; // Clear existing

        sortedDimensions.forEach(dim => {
            const btn = document.createElement('button');
            btn.className = 'drill-selector-btn';
            btn.dataset.dimension = dim.key;
            
            // Dynamic visibility (initially hidden if dynamic)
            if (dim.dynamic) {
                btn.style.display = 'none';
            }

            // New Button Structure
            const label = document.createElement('span');
            label.className = 'btn-label';
            label.textContent = dim.label;

            const arrow = document.createElement('span');
            arrow.className = 'selector-arrow';
            arrow.textContent = '▼';

            btn.appendChild(label);
            btn.appendChild(arrow);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(dim.key, btn);
            });

            container.appendChild(btn);
            
            // 恢复 UI 状态
            this.updateSelectorButtonUI(dim.key);
        });
    },

    // 切换下拉面板
    toggleDropdown(dimensionKey, buttonElement) {
        const panel = document.getElementById('drill-dropdown-panel');

        // 如果点击的是同一个按钮，关闭面板
        if (this.activeDropdown === dimensionKey) {
            this.closeDropdown();
            return;
        }

        // 关闭之前打开的面板
        this.closeDropdown();

        // 打开新面板
        this.activeDropdown = dimensionKey;
        buttonElement.classList.add('active');

        // 定位面板
        const rect = buttonElement.getBoundingClientRect();
        panel.style.left = rect.left + 'px';
        panel.style.top = (rect.bottom + 5) + 'px';
        panel.style.display = 'flex';

        // 加载维度值
        this.loadDropdownValues(dimensionKey);

        // 添加搜索功能
        const searchInput = document.getElementById('drill-search-input');
        searchInput.value = '';
        searchInput.oninput = () => this.filterDropdownValues(searchInput.value);
    },

    // 关闭下拉面板
    closeDropdown() {
        if (!this.activeDropdown) return;

        const panel = document.getElementById('drill-dropdown-panel');
        panel.style.display = 'none';

        // 移除active状态
        document.querySelectorAll('.drill-selector-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        this.activeDropdown = null;
    },

    /**
     * 渲染分组下拉选择器（同城/异地）
     * @param {string} dimensionKey - 维度key
     * @param {Object} dimConfig - 维度配置
     * @param {HTMLElement} container - 容器元素
     */
    renderGroupedDropdown(dimensionKey, dimConfig, container) {
        const currentSelection = this.filterState.drill.draft[dimensionKey] || [];

        dimConfig.groupOptions.forEach(group => {
            // 创建分组容器
            const groupDiv = document.createElement('div');
            groupDiv.className = 'drill-group-container';

            // 分组标题（全选checkbox）
            const groupHeader = document.createElement('div');
            groupHeader.className = 'drill-group-header';

            const groupCheckbox = document.createElement('input');
            groupCheckbox.type = 'checkbox';
            groupCheckbox.className = 'drill-group-checkbox';
            groupCheckbox.id = `group-${dimensionKey}-${group.value}`;

            // 检查是否所有子选项都被选中
            const allChildrenSelected = group.children.every(child => currentSelection.includes(child));
            const someChildrenSelected = group.children.some(child => currentSelection.includes(child));
            groupCheckbox.checked = allChildrenSelected;
            groupCheckbox.indeterminate = someChildrenSelected && !allChildrenSelected;

            const groupLabel = document.createElement('label');
            groupLabel.htmlFor = groupCheckbox.id;
            groupLabel.className = 'drill-group-label';
            groupLabel.textContent = `${group.label} (${group.children.length}个机构)`;

            groupCheckbox.addEventListener('change', () => {
                this.toggleGroup(dimensionKey, group.value, group.children, groupCheckbox.checked);
            });

            groupHeader.appendChild(groupCheckbox);
            groupHeader.appendChild(groupLabel);
            groupDiv.appendChild(groupHeader);

            // 子选项列表
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'drill-group-children';

            group.children.forEach(child => {
                const childDiv = document.createElement('div');
                childDiv.className = 'drill-dropdown-item drill-group-child-item';

                const childCheckbox = document.createElement('input');
                childCheckbox.type = 'checkbox';
                childCheckbox.value = child;
                childCheckbox.checked = currentSelection.includes(child);
                childCheckbox.id = `drill-${dimensionKey}-${child}`;
                childCheckbox.dataset.group = group.value;

                const childLabel = document.createElement('label');
                childLabel.htmlFor = childCheckbox.id;
                childLabel.textContent = child;

                childCheckbox.addEventListener('change', () => {
                    this.handleGroupedValueSelection(dimensionKey, child, childCheckbox.checked, group.value);
                });

                childDiv.appendChild(childCheckbox);
                childDiv.appendChild(childLabel);
                childrenContainer.appendChild(childDiv);
            });

            groupDiv.appendChild(childrenContainer);
            container.appendChild(groupDiv);
        });
    },

    /**
     * 切换分组选择
     * @param {string} dimensionKey - 维度key
     * @param {string} groupValue - 分组值 (local/remote)
     * @param {Array} children - 分组包含的子选项
     * @param {boolean} checked - 是否选中
     */
    toggleGroup(dimensionKey, groupValue, children, checked) {
        if (!this.filterState.drill.draft[dimensionKey]) {
            this.filterState.drill.draft[dimensionKey] = [];
        }

        if (checked) {
            // 选中整个分组
            children.forEach(child => {
                if (!this.filterState.drill.draft[dimensionKey].includes(child)) {
                    this.filterState.drill.draft[dimensionKey].push(child);
                }
            });

            // 禁用另一个分组
            const otherGroup = groupValue === 'local' ? 'remote' : 'local';
            this.disableGroup(dimensionKey, otherGroup);
        } else {
            // 取消选中整个分组
            children.forEach(child => {
                this.filterState.drill.draft[dimensionKey] =
                    this.filterState.drill.draft[dimensionKey].filter(v => v !== child);
            });

            // 启用另一个分组
            const otherGroup = groupValue === 'local' ? 'remote' : 'local';
            this.enableGroup(dimensionKey, otherGroup);
        }

        // 更新UI
        this.updateGroupUI(dimensionKey);
        this.updateSelectorButtonUI(dimensionKey);
    },

    /**
     * 处理分组内的值选择
     * @param {string} dimensionKey - 维度key
     * @param {string} value - 选中的值
     * @param {boolean} checked - 是否选中
     * @param {string} groupValue - 所属分组
     */
    handleGroupedValueSelection(dimensionKey, value, checked, groupValue) {
        if (!this.filterState.drill.draft[dimensionKey]) {
            this.filterState.drill.draft[dimensionKey] = [];
        }

        if (checked) {
            // 添加值
            if (!this.filterState.drill.draft[dimensionKey].includes(value)) {
                this.filterState.drill.draft[dimensionKey].push(value);
            }

            // 如果选中任何值，禁用另一个分组
            const otherGroup = groupValue === 'local' ? 'remote' : 'local';
            this.disableGroup(dimensionKey, otherGroup);
        } else {
            // 移除值
            this.filterState.drill.draft[dimensionKey] =
                this.filterState.drill.draft[dimensionKey].filter(v => v !== value);

            // 如果当前分组没有任何选中，启用另一个分组
            const dimConfig = this.getDrillDownDimensions().find(d => d.key === dimensionKey);
            const currentGroup = dimConfig.groupOptions.find(g => g.value === groupValue);
            const hasSelection = currentGroup.children.some(child =>
                this.filterState.drill.draft[dimensionKey].includes(child)
            );

            if (!hasSelection) {
                const otherGroup = groupValue === 'local' ? 'remote' : 'local';
                this.enableGroup(dimensionKey, otherGroup);
            }
        }

        // 更新UI
        this.updateGroupUI(dimensionKey);
        this.updateSelectorButtonUI(dimensionKey);
    },

    /**
     * 禁用分组
     */
    disableGroup(dimensionKey, groupValue) {
        const groupCheckbox = document.getElementById(`group-${dimensionKey}-${groupValue}`);
        const childCheckboxes = document.querySelectorAll(`input[data-group="${groupValue}"]`);

        if (groupCheckbox) {
            groupCheckbox.disabled = true;
            groupCheckbox.parentElement.style.opacity = '0.5';
        }

        childCheckboxes.forEach(checkbox => {
            checkbox.disabled = true;
        });
    },

    /**
     * 启用分组
     */
    enableGroup(dimensionKey, groupValue) {
        const groupCheckbox = document.getElementById(`group-${dimensionKey}-${groupValue}`);
        const childCheckboxes = document.querySelectorAll(`input[data-group="${groupValue}"]`);

        if (groupCheckbox) {
            groupCheckbox.disabled = false;
            groupCheckbox.parentElement.style.opacity = '1';
        }

        childCheckboxes.forEach(checkbox => {
            checkbox.disabled = false;
        });
    },

    /**
     * 更新分组UI状态
     */
    updateGroupUI(dimensionKey) {
        const dimConfig = this.getDrillDownDimensions().find(d => d.key === dimensionKey);
        if (!dimConfig || !dimConfig.hasGrouping) return;

        const currentSelection = this.filterState.drill.draft[dimensionKey] || [];

        dimConfig.groupOptions.forEach(group => {
            const groupCheckbox = document.getElementById(`group-${dimensionKey}-${group.value}`);
            if (!groupCheckbox) return;

            const allChildrenSelected = group.children.every(child => currentSelection.includes(child));
            const someChildrenSelected = group.children.some(child => currentSelection.includes(child));

            groupCheckbox.checked = allChildrenSelected;
            groupCheckbox.indeterminate = someChildrenSelected && !allChildrenSelected;
        });
    },

    // 加载下拉值列表
    loadDropdownValues(dimensionKey) {
        const listContainer = document.getElementById('drill-dropdown-list');
        listContainer.innerHTML = '';

        // 检查是否是分组维度
        const dimConfig = this.getDrillDownDimensions().find(d => d.key === dimensionKey);
        if (dimConfig && dimConfig.hasGrouping) {
            this.renderGroupedDropdown(dimensionKey, dimConfig, listContainer);
            return;
        }

        // 业务类型添加快捷选择按钮
        if (dimensionKey === 'ui_short_label') {
            const quickActions = document.createElement('div');
            quickActions.className = 'drill-quick-actions';
            quickActions.innerHTML = `
                <div class="quick-action-title">快捷选择：</div>
                <button class="quick-action-btn" onclick="Dashboard.quickSelectBusinessType('仅摩托车')">
                    🛵 仅摩托车
                </button>
                <button class="quick-action-btn" onclick="Dashboard.quickSelectBusinessType('不含摩托车')">
                    🚗 不含摩托车
                </button>
                <button class="quick-action-btn" onclick="Dashboard.quickSelectBusinessType('全部业务')">
                    📋 全部业务
                </button>
            `;
            listContainer.appendChild(quickActions);

            // 添加分隔线
            const separator = document.createElement('div');
            separator.className = 'drill-dropdown-separator';
            listContainer.appendChild(separator);
        }

        // 从Worker获取唯一值
        this.worker.postMessage({
            type: 'get_dimension_values',
            payload: { 
                dimension: dimensionKey,
                currentFilters: this.filterState
            }
        });

        const handler = (e) => {
            if (e.data.type === 'dimension_values_response') {
                const values = e.data.payload || [];
                const currentSelection = this.filterState.drill.draft[dimensionKey] || [];

                values.forEach(value => {
                    // 过滤逻辑：如果在 "非营客-旧" 模式下，排除 "新保"
                    if (dimensionKey === 'renewal_status' && this._excludeNewRenewal && value === '新保') {
                        return;
                    }

                    const item = document.createElement('div');
                    item.className = 'drill-dropdown-item';

                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.value = value;
                    input.checked = currentSelection.includes(value);
                    input.id = `drill-${dimensionKey}-${value}`;

                    const label = document.createElement('label');
                    label.htmlFor = input.id;
                    // 使用映射后的文本
                    label.textContent = this.getValueLabel(dimensionKey, value);

                    input.addEventListener('change', () => {
                        this.handleValueSelection(dimensionKey, value, input.checked);
                    });

                    item.appendChild(input);
                    item.appendChild(label);
                    listContainer.appendChild(item);
                });

                // 特殊排序：终端来源 "0110融合销售" 置顶
                if (dimensionKey === 'terminal_source') {
                    const items = Array.from(listContainer.children);
                    const topItem = items.find(item => item.textContent.includes('0110融合销售'));
                    if (topItem) {
                        listContainer.prepend(topItem);
                    }
                }

                this.worker.removeEventListener('message', handler);
            }
        };

        this.worker.addEventListener('message', handler);
    },

    // 处理值选择
    handleValueSelection(dimensionKey, value, checked) {
        if (!this.filterState.drill.draft[dimensionKey]) {
            this.filterState.drill.draft[dimensionKey] = [];
        }

        // 多选逻辑
        if (checked) {
            // 添加值
            if (!this.filterState.drill.draft[dimensionKey].includes(value)) {
                this.filterState.drill.draft[dimensionKey].push(value);
            }
        } else {
            // 移除值
            this.filterState.drill.draft[dimensionKey] =
                this.filterState.drill.draft[dimensionKey].filter(v => v !== value);
        }

        // 更新选择器按钮的UI
        this.updateSelectorButtonUI(dimensionKey);

        // 如果修改的是业务类型，需要检查联动
        if (dimensionKey === 'ui_short_label') {
            this.checkDynamicVisibility();
        }

        // 移除实时更新标签逻辑
        // this.renderDrillTags(true);
    },

    // 业务类型快捷选择
    quickSelectBusinessType(mode) {
        console.log(`[Dashboard] 业务类型快捷选择: ${mode}`);
        
        // 检查Worker是否可用
        if (!this.worker) {
            console.error('[Dashboard] Worker实例不存在，无法执行快捷选择');
            return;
        }
        
        // 从当前数据直接获取业务类型
        const allBusinessTypes = [...new Set(this.data.map(item => item.business_type_category))].filter(Boolean);
        console.log('[Dashboard] 可用业务类型:', allBusinessTypes);
        
        let selectedValues = [];
        switch(mode) {
            case '仅摩托车':
                selectedValues = allBusinessTypes.filter(type => type === '摩托车');
                break;
            case '不含摩托车':
                selectedValues = allBusinessTypes.filter(type => type !== '摩托车');
                break;
            case '全部业务':
                selectedValues = allBusinessTypes;
                break;
        }
        
        console.log(`[Dashboard] 快捷选择"${mode}"的结果:`, selectedValues);
        
        // 更新草稿状态
        this.filterState.drill.draft['ui_short_label'] = selectedValues;
        
        // 更新UI
        this.updateSelectorButtonUI('ui_short_label');
        
        // 立即应用筛选
        this.applyDrillFilters();
        
        // 关闭下拉面板
        this.closeDropdown();
    },

    // 值显示映射配置
    getValueLabel(dimensionKey, value) {
        // 转换 value 为字符串进行比较
        const strVal = String(value).toLowerCase();
        
        if (dimensionKey === 'energy_type') {
            if (strVal === 'true' || strVal === '1' || strVal === '新能源') return '新能源';
            if (strVal === 'false' || strVal === '0' || strVal === '燃油') return '燃油';
        }
        
        if (dimensionKey === 'is_transferred_vehicle') {
            if (strVal === 'true' || strVal === '1' || strVal === '过户') return '过户';
            if (strVal === 'false' || strVal === '0' || strVal === '非过户') return '非过户';
        }
        
        return value;
    },

    // 更新选择器按钮UI (显示值 + 计数)
    updateSelectorButtonUI(dimensionKey) {
        const btn = document.querySelector(`.drill-selector-btn[data-dimension="${dimensionKey}"]`);
        // 如果按钮不存在（可能是因为重排序导致 DOM 重建，或者尚未初始化），则忽略，renderDrillSelectors 会再次调用
        if (!btn) return;

        const draft = this.filterState.drill.draft[dimensionKey];
        const applied = this.filterState.drill.applied.find(c => c.dimension === dimensionKey)?.values;
        // 优先显示 Draft，如果没有 Draft 则显示 Applied
        const values = draft !== undefined ? draft : (applied || []);
        
        const count = values.length;
        const dimensionLabel = this.getDrillDownDimensions().find(d => d.key === dimensionKey)?.label || '';

        const labelSpan = btn.querySelector('.btn-label');
        // 如果没有 .btn-label 结构（首次初始化可能没有），则重建
        if (!labelSpan) {
            btn.innerHTML = `<span class="btn-label">${dimensionLabel}</span><span class="selector-arrow">▼</span>`;
        }

        const finalLabelSpan = btn.querySelector('.btn-label');
        
        if (count === 0) {
            // 默认状态
            btn.classList.remove('has-selection');
            finalLabelSpan.textContent = dimensionLabel;
        } else if (count === 1) {
            // 单选状态
            btn.classList.add('has-selection');
            const displayVal = this.getValueLabel(dimensionKey, values[0]);
            finalLabelSpan.textContent = `${dimensionLabel}: ${displayVal}`;
        } else {
            // 多选状态
            btn.classList.add('has-selection');
            const firstDisplayVal = this.getValueLabel(dimensionKey, values[0]);
            finalLabelSpan.textContent = `${dimensionLabel}: ${firstDisplayVal} (+${count - 1})`;
        }
    },

    // 全选/清空/反选当前下拉
    toggleAllInDropdown(action) {
        if (!this.activeDropdown) return;

        const checkboxes = document.querySelectorAll('#drill-dropdown-list input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            let shouldCheck = false;
            if (action === 'all') shouldCheck = true;
            else if (action === 'none') shouldCheck = false;
            else if (action === 'invert') shouldCheck = !checkbox.checked;

            if (checkbox.checked !== shouldCheck) {
                checkbox.checked = shouldCheck;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    },

    // 搜索过滤
    filterDropdownValues(searchTerm) {
        const items = document.querySelectorAll('.drill-dropdown-item');
        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            item.style.display = label.includes(term) ? 'flex' : 'none';
        });
    },

    // 应用下钻筛选
    applyDrillFilters() {
        // 将draft状态应用到applied
        const newApplied = [];

        Object.keys(this.filterState.drill.draft).forEach(dimension => {
            const values = this.filterState.drill.draft[dimension];
            if (values && values.length > 0) {
                newApplied.push({ dimension, values });
            }
        });

        this.filterState.drill.applied = newApplied;
        this.closeDropdown();
        this.applyFilters();
        
        // 重新渲染选择器以更新排序
        this.renderDrillSelectors();
    },

    // 删除单个筛选条件
    removeDrillCondition(dimension, value) {
        // 从applied中移除
        const condition = this.filterState.drill.applied.find(c => c.dimension === dimension);
        if (condition) {
            condition.values = condition.values.filter(v => v !== value);
            if (condition.values.length === 0) {
                this.filterState.drill.applied = this.filterState.drill.applied.filter(c => c.dimension !== dimension);
            }
        }

        // 同步到draft
        if (this.filterState.drill.draft[dimension]) {
            this.filterState.drill.draft[dimension] = this.filterState.drill.draft[dimension].filter(v => v !== value);
        }

        // 更新UI
        this.renderDrillTags();
        this.updateSelectorBadge(dimension);

        // 重新应用筛选
        this.applyFilters();
    },

    // 渲染下钻标签 (已弃用，功能移至按钮本身)
    renderDrillTags(isDraft = false) {
        const container = document.getElementById('drill-condition-tags');
        if (container) container.innerHTML = '';
    },

    // 重置筛选
    resetFilters() {
        // Reset time filter
        document.getElementById('filter-year').value = '';
        document.getElementById('filter-week-start').value = 1;
        document.getElementById('filter-week-end').value = 52;

        this.filterState.time.applied = { year: null, weekStart: 1, weekEnd: 52 };

        // Reset drill filter
        this.filterState.drill.applied = [];
        this.filterState.drill.draft = {};
        
        // 重置级联状态
        this._excludeNewRenewal = false;

        // 重新渲染选择器（会重置顺序）
        this.renderDrillSelectors();
        
        // 重置所有selector badge/label (renderDrillSelectors已处理，但为了保险)
        // const dimensions = this.getDrillDownDimensions();
        // dimensions.forEach(dim => {
        //     this.updateSelectorButtonUI(dim.key);
        // });

        // Reset dynamic visibility
        this.checkDynamicVisibility();

        // Apply reset
        this.applyFilters();
    },

    /**
     * 判断是否应该显示保费时间进度达成率折线图
     * 只有在三级机构维度且没有任何细分筛选条件时才显示
     * 因为只有机构级别的保费计划，没有细分项的保费计划
     * @param {string} dimension - 当前维度
     * @returns {boolean} 是否显示折线图
     */
    shouldShowPremiumProgressLine(dimension) {
        // 只有三级机构维度才可能显示折线图
        if (dimension !== 'org') {
            return false;
        }

        // 检查是否有任何筛选条件（除了机构维度本身）
        // 只要有任何细分筛选，就无法计算保费达成率
        const hasOtherFilters = this.filterState.drill.applied.some(filter => {
            // 排除机构维度的筛选，检查其他所有筛选条件
            return filter.dimension !== 'third_level_organization';
        });

        // 如果有任何其他筛选条件，则不显示折线图
        if (hasOtherFilters) {
            return false;
        }

        // 对于机构筛选，可以部分选择（只要有机构级别的保费计划就能计算）
        const orgFilter = this.filterState.drill.applied.find(f => f.dimension === 'third_level_organization');
        
        // 如果没有机构筛选或选择了至少一个机构，都可以显示
        return !orgFilter || orgFilter.values.length > 0;
    },

    // ====== 组织模式系统（2025-12-21新增） ======

    /**
     * 根据当前选择的机构判断组织模式
     * @param {Array} selectedOrgs - 用户选择的机构列表
     * @param {Array} allOrgs - 所有可用机构列表
     * @returns {Object} 当前组织模式配置
     */
    detectOrganizationMode(selectedOrgs, allOrgs) {
        const selectionCount = selectedOrgs.length;
        const totalCount = allOrgs.length;
        
        // 单机构模式
        if (selectionCount === 1) {
            return {
                ...this.organizationModes.single,
                currentOrg: selectedOrgs[0]
            };
        }
        
        // 同城模式检查
        const localOrgs = ['天府', '高新', '新都', '青羊', '武侯'];
        const isLocalMode = selectionCount === localOrgs.length && 
                          selectedOrgs.every(org => localOrgs.includes(org));
        
        if (isLocalMode) {
            return this.organizationModes.local;
        }
        
        // 异地模式检查
        const remoteOrgs = ['宜宾', '泸州', '德阳', '资阳', '乐山', '自贡', '达州'];
        const isRemoteMode = selectionCount === remoteOrgs.length && 
                           selectedOrgs.every(org => remoteOrgs.includes(org));
        
        if (isRemoteMode) {
            return this.organizationModes.remote;
        }
        
        // 分公司模式（全部选择）
        if (selectionCount === totalCount) {
            return this.organizationModes.branch;
        }
        
        // 多机构模式（其他自定义选择）
        return {
            ...this.organizationModes.multi,
            selectedOrgs: selectedOrgs
        };
    },

    /**
     * 根据组织模式生成页面标题
     * @param {Object} modeConfig - 组织模式配置
     * @param {Object} context - 上下文信息（周次、年份等）
     * @returns {string} 页面标题
     */
    generatePageTitle(modeConfig, context) {
        const { week, year, company = '四川' } = context;
        
        if (typeof modeConfig.titlePrefix === 'function') {
            // 单机构模式的动态标题
            const prefix = modeConfig.titlePrefix(modeConfig.currentOrg);
            return `${prefix}车险第${week}周经营分析`;
        } else {
            // 其他模式的固定标题
            return `${modeConfig.titlePrefix}车险第${week}周经营分析`;
        }
    },

    /**
     * 更新页面标题（基于当前选择）
     */
    updatePageTitle() {
        // 获取当前选择的机构
        const orgFilter = this.filterState.drill.applied.find(f => f.dimension === 'third_level_organization');
        const selectedOrgs = orgFilter ? orgFilter.values : [];
        
        // 获取所有机构列表
        const allOrgs = this.data.organizations || [];
        
        // 检测组织模式
        const modeConfig = this.detectOrganizationMode(selectedOrgs, allOrgs);
        
        // 获取上下文信息
        const context = {
            week: this.data.week || '50',
            year: this.data.year || '2025',
            company: '四川'
        };
        
        // 生成并更新标题
        const newTitle = this.generatePageTitle(modeConfig, context);
        const titleElement = document.getElementById('mainTitle');
        if (titleElement) {
            titleElement.textContent = newTitle;
        }
    }
};

// Expose to window
window.Dashboard = Dashboard;
