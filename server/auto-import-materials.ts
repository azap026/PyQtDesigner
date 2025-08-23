import { Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { pool } from "./db";

// Multer для загрузки файлов в память
const upload = multer({ storage: multer.memoryStorage() });

// Автоматический импорт с созданием/обновлением структуры таблицы
export const autoImportMaterials = [
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }
    try {
      // Чтение Excel/CSV
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
      if (!data.length) {
        return res.status(400).json({ error: "Файл пустой" });
      }
      // Получаем список столбцов и определяем типы
      const columns = Object.keys(data[0]);
      // Простейшее определение типа: если все значения числа — numeric, иначе text
      const columnTypes = columns.map(col => {
        const allNumbers = data.every(row => row[col] === null || /^-?\d+(\.\d+)?$/.test(String(row[col])));
        return allNumbers ? 'numeric' : 'text';
      });
      // Формируем SQL для создания таблицы (или добавления недостающих столбцов)
      let alterSql = '';
      for (let i = 0; i < columns.length; i++) {
        alterSql += `ALTER TABLE materials ADD COLUMN IF NOT EXISTS "${columns[i]}" ${columnTypes[i]};\n`;
      }
      // Создаём таблицу, если её нет
      const createSql = `CREATE TABLE IF NOT EXISTS materials (id serial PRIMARY KEY);`;
      // Выполняем SQL
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(createSql);
        await client.query(alterSql);
        // Импортируем данные
        let success = 0;
        let errors = 0;
        for (const row of data) {
          const keys = Object.keys(row);
          const values = keys.map(k => row[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const insertSql = `INSERT INTO materials (${keys.map(k => `\"${k}\"`).join(', ')}) VALUES (${placeholders})`;
          try {
            await client.query(insertSql, values);
            success++;
          } catch (e) {
            errors++;
            console.error(`Ошибка при вставке строки:`, row);
            console.error(e);
          }
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      res.json({ success: true, imported: data.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: String(error) });
    }
  }
];
