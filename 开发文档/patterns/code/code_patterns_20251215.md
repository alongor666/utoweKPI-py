# 代码模式库

> 自动提取于 2025-12-15 14:14:27

## safe_divide

**文件**: `kpi_calculator.py`

**函数签名**:
```python
def safe_divide(self, numerator, denominator)
```

**说明**:
安全除法，分母为0返回0

---

## calculate_kpis

**文件**: `kpi_calculator.py`

**函数签名**:
```python
def calculate_kpis(self, df, manual_plan=None)
```

**说明**:
计算给定 DataFrame 的所有核心 KPI。

---

## _build_canonical_map

**文件**: `mapper.py`

**函数签名**:
```python
def _build_canonical_map(self)
```

**说明**:
构建标准名称到详细信息的映射

---

## _build_compatibility_map

**文件**: `mapper.py`

**函数签名**:
```python
def _build_compatibility_map(self)
```

**说明**:
构建兼容性映射

---

## map_business_type

**文件**: `mapper.py`

**函数签名**:
```python
def map_business_type(self, raw_value)
```

**说明**:
根据原始值返回标准化的业务类型信息。
        返回字典: {'ui_full_name', 'ui_short_label', 'category', ...}

---

## load_data

**文件**: `data_loader.py`

**函数签名**:
```python
def load_data(self)
```

**说明**:
加载 CSV 文件并进行基本的类型转换。

---

## _detect_problems

**文件**: `report_generator.py`

**函数签名**:
```python
def _detect_problems(self, org_data)
```

**说明**:
基于阈值检测异常

---

