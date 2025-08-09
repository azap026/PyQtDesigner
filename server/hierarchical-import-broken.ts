import * as XLSX from "xlsx";
import { storage } from "./storage";
import { InsertSection, InsertTask } from "@shared/schema";

export interface ImportResult {
  imported: {
    sections: number;
    tasks: number;
  };
  errors: string[];
}

export interface ParsedRecord {
  index: string;
  title: string;
  unit?: string;
  costPrice?: string;
  price?: string;
  type: 'section' | 'subsection' | 'task' | 'ignore';
  orderNum: number;
}

/**
 * Определяет тип записи по индексу
 */
export function determineRecordType(index: string): 'section' | 'subsection' | 'task' | 'ignore' {
  if (!index || typeof index !== 'string') return 'ignore';
  
  const trimmed = index.trim();
  
  // Игнорируем пустые строки и служебные записи
  if (trimmed === '' || trimmed.startsWith('ИТОГО') || trimmed.startsWith('Всего') || trimmed.startsWith('№')) {
    return 'ignore';
  }
  
  // Раздел: оканчивается на "-" и не содержит точек (например: "1-", "6-")
  if (trimmed.endsWith('-') && !trimmed.includes('.')) {
    return 'section';
  }
  
  // Подраздел: оканчивается на "-" и содержит точку (например: "1.1-", "6.2-")
  if (trimmed.endsWith('-') && trimmed.includes('.')) {
    return 'subsection';
  }
  
  // Работа: не оканчивается на "-" и содержит цифры (например: "1.1.1", "6.2.3")
  if (!trimmed.endsWith('-') && /\d/.test(trimmed)) {
    return 'task';
  }
  
  return 'ignore';
}

/**
 * Извлекает индекс без минуса для хранения
 */
export function extractCleanIndex(index: string): string {
  return index.trim().replace(/-$/, '');
}

/**
 * Находит родительский раздел для подраздела или работы
 */
export function findParentIndex(index: string): string | null {
  const clean = extractCleanIndex(index);
  const parts = clean.split('.');
  
  if (parts.length === 1) {
    // Это корневой раздел, родителя нет
    return null;
  }
  
  // Убираем последнюю часть для получения родителя
  const parentParts = parts.slice(0, -1);
  return parentParts.join('.');
}

/**
 * Парсит Excel файл и определяет структуру
 */
export function parseHierarchicalExcel(buffer: Buffer): ParsedRecord[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: null 
  });

  const records: ParsedRecord[] = [];
  let orderNum = 0;

  // Пропускаем заголовок (первую строку)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    if (!row || row.length === 0) continue;
    
    const index = row[1]?.toString()?.trim(); // Столбец B (шифр)
    const title = row[2]?.toString()?.trim();  // Столбец C (наименование)  
    const unit = row[3]?.toString()?.trim();   // Столбец D (единица измерения)
    const costPrice = row[4]?.toString()?.trim(); // Столбец E (себестоимость)
    const price = row[5]?.toString()?.trim();     // Столбец F (цена)
    
    if (!index || !title) continue;
    
    const type = determineRecordType(index);
    if (type === 'ignore') continue;
    
    records.push({
      index,
      title,
      unit,
      costPrice,
      price,
      type,
      orderNum: orderNum++
    });
  }
  
  return records;
}

/**
 * Импортирует иерархическую структуру в базу данных
 */
export async function importHierarchicalStructure(buffer: Buffer): Promise<ImportResult> {
  const records = parseHierarchicalExcel(buffer);
  const errors: string[] = [];
  const sectionMap = new Map<string, string>(); // index -> id
  let sectionsCreated = 0;
  let tasksCreated = 0;

  // Сортируем по уровню иерархии - сначала разделы, потом подразделы  
  const sectionsAndSubsections = records.filter(r => r.type === 'section' || r.type === 'subsection')
    .sort((a, b) => {
      const aLevel = a.index.split('.').length;
      const bLevel = b.index.split('.').length;
      return aLevel - bLevel;
    });

  // Создаем разделы и подразделы в правильном порядке
  for (const record of sectionsAndSubsections) {
    try {
      const cleanIndex = extractCleanIndex(record.index);
      const parentIndex = findParentIndex(cleanIndex);
      let parentId: string | null = null;
      
      if (parentIndex) {
        parentId = sectionMap.get(parentIndex) || null;
        if (!parentId) {
          errors.push(`Строка ${record.orderNum + 2}: не найден родительский раздел для "${record.index}"`);
          continue;
        }
      }
      
      const sectionData: InsertSection = {
        index: cleanIndex,
        displayIndex: record.index,
        title: record.title,
        parentId,
        orderNum: record.orderNum
      };
      
      const [createdSection] = await storage.createSection(sectionData);
      sectionMap.set(cleanIndex, createdSection.id);
      sectionsCreated++;
      
    } catch (error) {
      errors.push(`Строка ${record.orderNum + 2}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
    }
  }
  }
  
  // Затем создаем все работы
  for (const record of records) {
    if (record.type === 'task') {
      try {
        const cleanIndex = extractCleanIndex(record.index);
        const parentIndex = findParentIndex(cleanIndex);
        
        if (!parentIndex) {
          errors.push(`Строка ${record.orderNum + 2}: работа "${record.index}" должна принадлежать разделу или подразделу`);
          continue;
        }
        
        const parentSectionId = sectionMap.get(parentIndex);
        if (!parentSectionId) {
          errors.push(`Строка ${record.orderNum + 2}: не найден родительский раздел "${parentIndex}" для работы "${record.index}"`);
          continue;
        }
        
        // Для работ обязательны единица измерения и цена
        if (!record.unit || !record.price || record.unit === "" || record.price === "") {
          errors.push(`Строка ${record.orderNum + 2}: отсутствуют обязательные поля (единица измерения или цена) для работы "${record.index}"`);
          continue;
        }
        
        const taskData: InsertTask = {
          index: cleanIndex,
          displayIndex: record.index,
          title: record.title,
          unit: record.unit,
          costPrice: record.costPrice && record.costPrice !== "" ? record.costPrice : null,
          price: record.price,
          parentSectionId,
          orderNum: record.orderNum
        };
        
        await storage.createTask(taskData);
        tasksCreated++;
        
      } catch (error) {
        errors.push(`Строка ${record.orderNum + 2}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
      }
    }
  }
  
  return {
    imported: {
      sections: sectionsCreated,
      tasks: tasksCreated
    },
    errors
  };
}