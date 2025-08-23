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
    console.log('--- [autoImportMaterials] Начало импорта материалов ---');
    if (!req.file) {
      console.error('[autoImportMaterials] Файл не загружен');
      return res.status(400).json({ error: "Файл не загружен" });
    }
    try {
      // Чтение Excel/CSV
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null }) as Record<string, any>[];
      console.log(`[autoImportMaterials] Прочитано строк: ${data.length}`);
      if (!data.length) {
        console.error('[autoImportMaterials] Файл пустой');
        return res.status(400).json({ error: "Файл пустой" });
      }
      // Получаем список столбцов и определяем типы
      const columns = Object.keys(data[0]);
      console.log('[autoImportMaterials] Столбцы:', columns);
      // Простейшее определение типа: если все значения числа — numeric, иначе text
      const columnTypes = columns.map(col => {
        const allNumbers = data.every((row: Record<string, any>) => row[col] === null || /^-?\d+(\.\d+)?$/.test(String(row[col])));
        return allNumbers ? 'numeric' : 'text';
      });
      console.log('[autoImportMaterials] Типы столбцов:', columnTypes);
      // Формируем SQL для создания таблицы (или добавления недостающих столбцов)
      let alterSql = '';
      for (let i = 0; i < columns.length; i++) {
        alterSql += `ALTER TABLE materials ADD COLUMN IF NOT EXISTS "${columns[i]}" ${columnTypes[i]};\n`;
      }
      console.log('[autoImportMaterials] ALTER SQL:', alterSql);
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
          const keys = Object.keys(row as Record<string, any>);
          const values = keys.map(k => (row as Record<string, any>)[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const insertSql = `INSERT INTO materials (${keys.map(k => `\"${k}\"`).join(', ')}) VALUES (${placeholders})`;
          try {
            await client.query(insertSql, values);
            success++;
          } catch (e) {
            errors++;
            console.error(`[autoImportMaterials] Ошибка при вставке строки:`, row);
            console.error(e);
          }
        }
        await client.query('COMMIT');
        console.log(`[autoImportMaterials] Импорт завершён. Успешно: ${success}, ошибок: ${errors}`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('[autoImportMaterials] Ошибка при выполнении SQL:', e);
        throw e;
      } finally {
        client.release();
      }
      res.json({ success: true, imported: data.length });
      console.log('--- [autoImportMaterials] Конец импорта ---');
    } catch (error) {
      console.error('[autoImportMaterials] Ошибка импорта:', error);
      res.status(500).json({ error: String(error) });
    }
  }
];
