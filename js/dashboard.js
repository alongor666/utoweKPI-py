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
            dimensionConfigs: [],
            applied: [],
            draft: null
        },
        motorcycleMode: '全部业务'  // 新增摩托车模式字段
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
        this.initFilters();
        this.initDrillModal();
        this.initYearSelector();
        this.renderMetadata();  // 渲染元数据预览卡片
        this.renderKPI();
        this.renderChart('overview');

        // Show Dashboard
        document.getElementById('uploadContainer').style.display = 'none';
        document.getElementById('dashboardContainer').style.display = 'block';
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

    setupWorkerBridge() {
        // Simplified bridge since we are in the same context as the worker creation (mostly)
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

// 全局图表样式配置函数
    getGlobalChartOptions() {
        return {
            // 网格线设置
            grid: {
                left: '10%',
                right: '8%',
                bottom: '15%',
                top: '10%',
                containLabel: true
            },
            // 移除所有网格线
            xAxis: {
                splitLine: { show: false },
                axisLine: { 
                    lineStyle: { color: '#333', width: 2 }
                },
                axisTick: { show: false },
                axisLabel: {
                    fontWeight: 'bold',
                    color: '#333',
                    interval: 0,
                    rotate: 0, // 不倾斜
                    fontSize: 12,
                    formatter: function(value) {
                        // 自动缩小字体适应间距
                        const maxLength = 8;
                        if (value.length > maxLength) {
                            return value.substring(0, maxLength) + '...';
                        }
                        return value;
                    }
                },
                nameTextStyle: {
                    fontWeight: 'bold',
                    fontSize: 14,
                    color: '#333',
                    padding: [20, 0, 0, 0] // 确保坐标轴名称不被遮挡
                }
            },
            yAxis: {
                splitLine: { show: false }, // 去掉网格线
                axisLine: { 
                    lineStyle: { color: '#333', width: 2 }
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
                    padding: [0, 0, 20, 0] // 确保坐标轴名称不被遮挡
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
                fontSize: 11,
                interval: 0,  // 显示所有标签
                rotate: 0,    // 不倾斜
                overflow: 'truncate',  // 超出部分截断
                hideOverlap: false  // 不隐藏重叠标签
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
            html += `<th style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${indicator}</th>`;
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
                const displayValue = isPercentage ? `${this.formatRate(value)}%` : this.formatInteger(value);
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

    // 渲染元数据预览卡片
    renderMetadata() {
        const info = this.data.dynamicInfo;
        if (!info) {
            console.warn('元数据信息不存在，跳过渲染');
            return;
        }

        console.log('渲染元数据预览卡片:', info);

        // 更新各个字段
        const metaYear = document.getElementById('meta-year');
        const metaWeek = document.getElementById('meta-week');
        const metaUpdateDate = document.getElementById('meta-update-date');
        const metaMode = document.getElementById('meta-mode');
        const metaOrgCount = document.getElementById('meta-org-count');
        const metaOrgList = document.getElementById('meta-org-list');
        const metaOrgListContainer = document.getElementById('meta-org-list-container');
        const metadataCard = document.getElementById('metadata-card');

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

        // 显示元数据卡片
        if (metadataCard) {
            metadataCard.style.display = 'flex';
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
            const progress = item.保费时间进度达成率 || 0;
            const profit = item.边际贡献额 || 0;

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
        else if (tab === 'expense') data.sort((a, b) => (b.费用率 || 0) - (a.费用率 || 0));

        const chartDom = document.getElementById(`chart-${tab}`);
        if (!chartDom) return;
        
        if (echarts.getInstanceByDom(chartDom)) echarts.dispose(chartDom);
        const chart = echarts.init(chartDom);
        
        let option = {};
        // ... (Chart Options Logic - Simplified/Ported) ...
        // Since the full logic is long, I'll implement the key parts
        
        if (tab === 'overview') {
            const costRates = data.map(d => d.变动成本率 || 0);
            const normalizedCostRates = this.normalizeBarHeights(costRates);
            const globalOptions = this.getGlobalChartOptions();

            option = {
                tooltip: {
                    trigger: 'axis',
                    textStyle: { fontWeight: 'bold' },
                    formatter: (params) => {
                        const p = params?.[0];
                        const point = p?.data;
                        if (!point) return '';
                        return `${p.axisValue}<br/>变动成本率: ${this.formatRate(point.actual, 1)}%`;
                    }
                },
                grid: globalOptions.grid,
                xAxis: {
                    type: 'category',
                    data: data.map(d => d[dimField]),
                    ...globalOptions.xAxis
                },
                yAxis: {
                    type: 'value',
                    name: '变动成本率(%)',
                    ...globalOptions.yAxis
                },
                series: [{
                    type: 'bar',
                    data: data.map((d, index) => ({
                        value: normalizedCostRates[index],
                        actual: costRates[index],
                        itemStyle: { color: this.getStatusColor(d.变动成本率) }
                    })),
                    label: {
                        show: true,
                        position: 'top',
                        formatter: (p) => `${this.formatRate(p.data.actual, 1)}%`
                    },
                    markLine: {
                        silent: false,
                        symbol: 'none',
                        data: [
                            {
                                yAxis: 91,
                                name: '预警线',
                                lineStyle: {
                                    color: '#ffc000',
                                    type: 'dashed',
                                    width: 2,
                                    opacity: 0.8
                                },
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
                }]
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
                    name: '费用率(%)',
                    min: 0,
                    max: 30,
                    ...globalOptions.yAxis
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
                        overflow: 'truncate',
                        ellipsis: '...',
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: '#000000',
                        formatter: (p) => {
                            // 简化标签：只显示名称和变动成本率
                            const name = p.data.name;
                            const rate = this.formatRate(p.data.value[2], 1);
                            return `${name}\n${rate}%`;
                        }
                    },
                    markLine: {
                        silent: false,
                        symbol: 'none',
                        lineStyle: { type: 'solid', width: 3, opacity: 0.8 },
                        data: [
                            {
                                xAxis: thresholds['满期赔付率'] || 75,
                                name: '赔付率阈值',
                                lineStyle: { color: '#c00000' },
                                label: {
                                    formatter: '赔付率阈值',
                                    fontWeight: 'bold',
                                    color: '#c00000',
                                    fontSize: 12
                                }
                            },
                            {
                                yAxis: thresholds['费用率'] || 17,
                                name: '费用率阈值',
                                lineStyle: { color: '#ffc000' },
                                label: {
                                    formatter: '费用率阈值',
                                    fontWeight: 'bold',
                                    color: '#ffc000',
                                    fontSize: 12
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
                    type: 'value',
                    name: '签单保费(万元)',
                    ...globalOptions.yAxis
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
                    }
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
                            type: 'value',
                            name: '占比(%)',
                            min: 0,
                            max: 100,
                            ...globalOptions.yAxis
                        },
                        {
                            type: 'value',
                            name: '满期赔付率(%)',
                            min: 0,
                            max: 130,
                            ...globalOptions.yAxis
                        }
                    ],
                    legend: {
                        data: ['保费占比', '已报告赔款占比', '满期赔付率'],
                        top: 0,
                        textStyle: { fontWeight: 'bold' }
                    },
                    series: [
                        {
                            name: '保费占比',
                            type: 'bar',
                            yAxisIndex: 0,
                            data: data.map(d => d.保费占比 || 0),
                            itemStyle: { color: '#0070c0' },
                            label: { show: true, position: 'top', formatter: (p) => `${this.formatRate(p.value, 1)}%` }
                        },
                        {
                            name: '已报告赔款占比',
                            type: 'bar',
                            yAxisIndex: 0,
                            data: data.map(d => d.已报告赔款占比 || 0),
                            itemStyle: { color: '#92d050' },
                            label: { show: true, position: 'top', formatter: (p) => `${this.formatRate(p.value, 1)}%` }
                        },
                        {
                            name: '满期赔付率',
                            type: 'line',
                            yAxisIndex: 1,
                            data: data.map(d => d.满期赔付率 || 0),
                            itemStyle: { color: '#c00000' },
                            lineStyle: { color: '#c00000', width: 3 },
                            label: { show: true, position: 'top', formatter: (p) => `${this.formatRate(p.value, 1)}%` },
                            markLine: {
                                silent: false,
                                symbol: 'none',
                                lineStyle: { type: 'dashed', width: 2, opacity: 0.8, color: '#ffc000' },
                                data: [
                                    {
                                        yAxis: thresholds['满期赔付率'] || 70,
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
                        name: '案均赔款(元)',
                        min: 0,
                        axisLabel: {
                            formatter: (value) => this.formatInteger(value)
                        },
                        ...globalOptions.yAxis
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
                            overflow: 'truncate',
                            ellipsis: '...',
                            fontSize: 10,
                            fontWeight: 'bold',
                            color: '#000000',
                            formatter: (p) => {
                                // 简化标签：只显示名称和出险率
                                const name = p.data.name;
                                const rate = this.formatRate(p.data.value[0], 1);
                                return `${name}\n${rate}%`;
                            }
                        }
                    }]
                };
            }
        } else if (tab === 'expense') {
            const expenseRates = data.map(d => d.费用率 || 0);
            const normalizedExpenseRates = this.normalizeBarHeights(expenseRates);
            const globalOptions = this.getGlobalChartOptions();

            option = {
                tooltip: {
                    trigger: 'axis',
                    textStyle: { fontWeight: 'bold' },
                    formatter: (params) => {
                        const p = params?.[0];
                        const point = p?.data;
                        if (!point) return '';
                        return `${p.axisValue}<br/>费用率: ${this.formatRate(point.actual, 1)}%`;
                    }
                },
                grid: globalOptions.grid,
                xAxis: {
                    type: 'category',
                    data: data.map(d => d[dimField]),
                    ...globalOptions.xAxis
                },
                yAxis: {
                    type: 'value',
                    name: '费用率(%)',
                    ...globalOptions.yAxis
                },
                series: [{
                    type: 'bar',
                    data: data.map((d, index) => ({
                        value: normalizedExpenseRates[index],
                        actual: expenseRates[index],
                        itemStyle: {
                            color: d.费用率 > 17 ? '#c00000' : d.费用率 > 14 ? '#ffc000' : '#00b050'
                        }
                    })),
                    label: {
                        show: true,
                        position: 'top',
                        formatter: (p) => `${this.formatRate(p.data.actual, 1)}%`
                    },
                    markLine: {
                        silent: false,
                        symbol: 'none',
                        data: [
                            {
                                yAxis: 14,
                                name: '预警线',
                                lineStyle: {
                                    color: '#ffc000',
                                    type: 'dashed',
                                    width: 2,
                                    opacity: 0.8
                                },
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
                }]
            };
        }

        chart.setOption(option);

        // 生成动态标题和正文分析
        this.generateDynamicTitle(tab, dimension, data);
        this.generateAnalysisContent(tab, dimension, data);

        // Add indicator table if bubble chart
        if (option.series && option.series[0].type === 'scatter') {
             // Remove old table
             const oldTable = chartDom.parentElement.querySelector('.indicator-table-container');
             if (oldTable) oldTable.remove();
             
             let indicators = [];
             if (tab === 'cost') indicators = ['满期赔付率', '费用率', '变动成本率', '签单保费'];
             
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

    getDrillDownDimensions() {
        return [
            { key: 'third_level_organization', label: '三级机构' },
            { key: 'customer_category_3', label: '客户类别' },
            { key: 'ui_short_label', label: '业务类型' },
            { key: 'policy_start_year', label: '保单年度' },
            { key: 'week_number', label: '周次' }
        ];
    },

    initFilters() {
        document.getElementById('btn-apply-filters').addEventListener('click', () => this.applyFilters());
        document.getElementById('btn-reset-filters').addEventListener('click', () => this.resetFilters());
        
        // Init drill down stuff
        document.getElementById('btn-add-drill').addEventListener('click', () => this.openDrillModal());
    },

    initDrillModal() {
        // Close button
        document.querySelector('.drill-modal-close').addEventListener('click', () => this.closeDrillModal());

        // Dimension select change event
        const dimensionSelect = document.getElementById('drill-dimension-select');
        dimensionSelect.addEventListener('change', (e) => {
            const dimension = e.target.value;
            if (dimension) {
                this.loadDimensionValues(dimension);
            } else {
                document.getElementById('drill-value-section').style.display = 'none';
            }
        });
    },
    
    openDrillModal() {
        document.getElementById('drill-modal').classList.add('active');
        // Populate select
        const select = document.getElementById('drill-dimension-select');
        select.innerHTML = '<option value="">请选择维度</option>';
        this.getDrillDownDimensions().forEach(dim => {
            const opt = document.createElement('option');
            opt.value = dim.key;
            opt.textContent = dim.label;
            select.appendChild(opt);
        });
    },

    closeDrillModal() {
        document.getElementById('drill-modal').classList.remove('active');
        // Reset modal state
        document.getElementById('drill-dimension-select').value = '';
        document.getElementById('drill-value-section').style.display = 'none';
    },

    async initYearSelector() {
        // Request available years from worker
        const handler = (e) => {
            const { type, payload } = e.data;
            if (type === 'dimension_values_response') {
                const yearSelect = document.getElementById('filter-year');
                yearSelect.innerHTML = '<option value="">全部</option>';
                payload.sort().forEach(year => {
                    const opt = document.createElement('option');
                    opt.value = year;
                    opt.textContent = year + '年';
                    yearSelect.appendChild(opt);
                });
                this.worker.removeEventListener('message', handler);
            }
        };
        this.worker.addEventListener('message', handler);
        this.worker.postMessage({
            type: 'get_dimension_values',
            payload: { dimension: 'policy_start_year', currentFilters: null }
        });
    },

    async loadDimensionValues(dimension) {
        console.log('Loading values for dimension:', dimension);

        // Show loading state
        const valueSection = document.getElementById('drill-value-section');
        const valueList = document.getElementById('drill-value-list');
        valueSection.style.display = 'block';
        valueList.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">加载中...</div>';

        // Request dimension values from worker
        const handler = (e) => {
            const { type, payload } = e.data;
            if (type === 'dimension_values_response') {
                this.renderValueCheckboxes(dimension, payload);
                this.worker.removeEventListener('message', handler);
            }
        };
        this.worker.addEventListener('message', handler);
        this.worker.postMessage({
            type: 'get_dimension_values',
            payload: {
                dimension: dimension,
                currentFilters: this.filterState.time.applied
            }
        });
    },

    renderValueCheckboxes(dimension, values) {
        const valueList = document.getElementById('drill-value-list');
        valueList.innerHTML = '';

        if (!values || values.length === 0) {
            valueList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">无可用数据</div>';
            return;
        }

        // Sort values
        values.sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'));

        // Get existing selections if editing this dimension
        const existingCondition = this.filterState.drill.applied.find(c => c.dimension === dimension);
        const selectedValues = existingCondition ? existingCondition.values : [];

        // Store current draft state
        if (!this.filterState.drill.draft) {
            this.filterState.drill.draft = { dimension, values: [...selectedValues] };
        } else {
            this.filterState.drill.draft.dimension = dimension;
            this.filterState.drill.draft.values = [...selectedValues];
        }

        // Render checkboxes
        values.forEach(value => {
            const item = document.createElement('div');
            item.className = 'drill-value-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `drill-value-${value}`;
            checkbox.value = value;
            checkbox.checked = selectedValues.includes(value);

            // Update draft state on change
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.filterState.drill.draft.values.includes(value)) {
                        this.filterState.drill.draft.values.push(value);
                    }
                } else {
                    const index = this.filterState.drill.draft.values.indexOf(value);
                    if (index > -1) {
                        this.filterState.drill.draft.values.splice(index, 1);
                    }
                }
            });

            const label = document.createElement('label');
            label.setAttribute('for', `drill-value-${value}`);
            label.textContent = value;
            label.style.cursor = 'pointer';

            item.appendChild(checkbox);
            item.appendChild(label);
            valueList.appendChild(item);
        });
    },

    toggleAllValues(selectAll) {
        const checkboxes = document.querySelectorAll('.drill-value-item input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            // Trigger change event to update draft state
            checkbox.dispatchEvent(new Event('change'));
        });
    },

    confirmDrillSelection() {
        const draft = this.filterState.drill.draft;

        if (!draft || !draft.dimension) {
            alert('请先选择维度');
            return;
        }

        if (draft.values.length === 0) {
            alert('请至少选择一个值');
            return;
        }

        // Update or add condition
        const existingIndex = this.filterState.drill.applied.findIndex(c => c.dimension === draft.dimension);
        if (existingIndex > -1) {
            this.filterState.drill.applied[existingIndex] = {
                dimension: draft.dimension,
                values: [...draft.values]
            };
        } else {
            this.filterState.drill.applied.push({
                dimension: draft.dimension,
                values: [...draft.values]
            });
        }

        // Clear draft
        this.filterState.drill.draft = null;

        // Update UI
        this.renderDrillTags();
        this.closeDrillModal();

        console.log('Drill conditions updated:', this.filterState.drill.applied);
    },

    renderDrillTags() {
        const container = document.getElementById('drill-condition-tags');
        container.innerHTML = '';

        const dimensions = this.getDrillDownDimensions();
        const dimensionMap = {};
        dimensions.forEach(d => dimensionMap[d.key] = d.label);

        this.filterState.drill.applied.forEach((condition, index) => {
            const tag = document.createElement('div');
            tag.className = 'condition-tag';

            const label = dimensionMap[condition.dimension] || condition.dimension;
            const valueText = condition.values.length > 3
                ? `${condition.values.slice(0, 3).join(', ')}... (共${condition.values.length}项)`
                : condition.values.join(', ');

            const text = document.createElement('span');
            text.textContent = `${label}: ${valueText}`;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'condition-tag-remove';
            removeBtn.textContent = '×';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.marginLeft = '6px';
            removeBtn.onclick = () => this.removeDrillCondition(index);

            tag.appendChild(text);
            tag.appendChild(removeBtn);
            container.appendChild(tag);
        });
    },

    removeDrillCondition(index) {
        this.filterState.drill.applied.splice(index, 1);
        this.renderDrillTags();
        console.log('Condition removed, remaining:', this.filterState.drill.applied);
    },

    async applyFilters() {
        console.log('Applying filters...');
        // Gather filter state from UI inputs
        const year = document.getElementById('filter-year').value;
        const weekStart = document.getElementById('filter-week-start').value;
        const weekEnd = document.getElementById('filter-week-end').value;
        
        this.filterState.time.applied = { year, weekStart, weekEnd };
        
        // Send to worker
        this.worker.postMessage({ 
            type: 'filter_data', 
            payload: { filterState: this.filterState } 
        });
        
        // Listen for result
        // We need a one-time listener or use a promise-based bridge
        const handler = (e) => {
            const { type, payload } = e.data;
            if (type === 'filter_complete') {
                this.data = payload; // Update data
                // 性能优化：清空缓存因为数据已更改
                this.clearChartCache();
                this.renderKPI();
                const activeTab = document.querySelector('.tab.active').dataset.tab;
                this.renderChart(activeTab);
                this.worker.removeEventListener('message', handler);
            }
        };
        this.worker.addEventListener('message', handler);
    },

    resetFilters() {
        // Reset UI
        document.getElementById('filter-year').value = '';
        document.getElementById('filter-week-start').value = 1;
        document.getElementById('filter-week-end').value = 52;

        // Reset state
        this.filterState.time.applied = { year: null, weekStart: 1, weekEnd: 52 };
        this.filterState.drill.applied = [];
        this.filterState.drill.draft = null;
        this.filterState.motorcycleMode = '全部业务';  // 重置摩托车模式

        // Reset motorcycle mode UI
        const motorcycleRadio = document.querySelector('input[name="motorcycle-mode"][value="全部业务"]');
        if (motorcycleRadio) {
            motorcycleRadio.checked = true;
        }

        // Clear tags
        this.renderDrillTags();

        // Apply reset
        this.applyFilters();
    }
};

// Expose to window
window.Dashboard = Dashboard;
