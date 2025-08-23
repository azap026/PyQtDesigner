-- Кодировка: UTF-8
-- Файл: create_table_and_import.sql
-- Создаёт таблицу `products` и содержит заготовку команды COPY для ручного импорта CSV-файла

-- CREATE TABLE
CREATE TABLE products (
    name VARCHAR(255),
    price NUMERIC(10,2),
    image_url TEXT,
    product_url TEXT,
    unit VARCHAR(100),
    consumption VARCHAR(100),
    weight VARCHAR(100)
);

-- Команда для импорта данных из CSV (выполняется вручную).
-- Замените путь ниже на фактический путь к вашему файлу 1111.csv.
-- Разделитель: ";". Первая строка файла содержит заголовки.

COPY products(name, price, image_url, product_url, unit, consumption, weight)
FROM '/path/to/1111.csv'
WITH (
  FORMAT csv,
  DELIMITER ';',
  HEADER
);
