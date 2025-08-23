import pandas as pd
import sqlite3
import uuid

EXCEL_FILE = 'Список материала 2025 (1).xlsx'
SQLITE_DB = 'materials.db'

def safe_float(val):
    try:
        return float(str(val).replace(' ', '').replace(',', '.'))
    except:
        return None

def safe_str(val):
    if pd.isna(val):
        return None
    return str(val)

df = pd.read_excel(EXCEL_FILE)

# Приводим названия столбцов к "чистому" виду (без пробелов и невидимых символов)
df.columns = [col.strip() for col in df.columns]

def get_col(row, colname):
    # Безопасно получить значение по названию столбца
    try:
        return row[colname]
    except KeyError:
        return None


conn = sqlite3.connect(SQLITE_DB)
c = conn.cursor()

for _, row in df.iterrows():
    try:
        c.execute('''
            INSERT INTO materials (
                id, name, unit, price, supplier, notes, image_url, product_url,
                consumption_rate, consumption_unit, weight_per_unit, weight_unit
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
                str(uuid.uuid4()),
                safe_str(get_col(row, 'Наименование')),
                safe_str(get_col(row, 'Ед.Изм')),
                safe_float(get_col(row, 'Цена')),
            None,
            None,
            safe_str(get_col(row, 'Ссылка на картинку')),
            safe_str(get_col(row, 'Ссылка на товар')),
            safe_float(get_col(row, 'Расход')),
            safe_str(get_col(row, 'Ед.Изм')),
            safe_float(get_col(row, 'Вес')),
            'кг',
        ))
    except Exception as e:
        print(f'Ошибка при обработке строки: {e}')
        print(f'Строка данных: {row.to_dict()}')

conn.commit()
conn.close()
print('Импорт завершён!')

conn = sqlite3.connect(SQLITE_DB)
c = conn.cursor()

for _, row in df.iterrows():
    c.execute('''
        INSERT INTO materials (
            id, name, unit, price, supplier, notes, image_url, product_url,
            consumption_rate, consumption_unit, weight_per_unit, weight_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        str(uuid.uuid4()),
        safe_str(row['Наименование']),
        safe_str(row['Ед.Изм']),
        safe_float(row['Цена']),
        None,
        None,
        safe_str(row['Ссылка на картинку']),
        safe_str(row['Ссылка на товар']),
        safe_float(row['Расход']),
        safe_str(row['Ед.Изм']),
        safe_float(row['Вес']),
        'кг',
    ))

conn.commit()
conn.close()
print('Импорт завершён!')
