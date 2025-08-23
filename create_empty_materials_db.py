import sqlite3

SQLITE_DB = 'materials.db'

conn = sqlite3.connect(SQLITE_DB)
c = conn.cursor()
c.execute('''
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    price REAL,
    supplier TEXT,
    notes TEXT,
    image_url TEXT,
    product_url TEXT,
    consumption_rate REAL,
    consumption_unit TEXT,
    weight_per_unit REAL,
    weight_unit TEXT
)
''')
conn.commit()
conn.close()
print('Пустая база данных materials.db создана!')
