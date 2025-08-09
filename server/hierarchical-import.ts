import XLSX from 'xlsx';
import { storage } from './storage';
import { InsertSection, InsertTask } from "@shared/schema";

interface ParsedRecord {
  index: string;
  title: string;
  unit?: string;
  costPrice?: string;
  type: 'section' | 'subsection' | 'task' | 'ignore';
  orderNum: number;
}

interface ImportResult {
  imported: {
    sections: number;
    tasks: number;
  };
  errors: string[];
}

/**
 * Определяет тип записи по индексу и дополнительной информации
 */
export function determineRecordType(index: string, title?: string, unit?: string): 'section' | 'subsection' | 'task' | 'ignore' {
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
  
  // Специальная логика: если нет единицы измерения и название начинается с индекса + пробел,
  // то это подраздел (например: "4.1 Демонтаж душевой кабины")
  if (!unit && title && title.startsWith(trimmed + ' ')) {
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
  console.log('=== НАЧАЛО ПАРСИНГА ===');
  
  // Проверяем по заголовку файла - Excel файлы начинаются с PK (ZIP-архив)
  // Также проверяем наличие подписи Excel в начале файла
  const hasZipSignature = buffer.length > 4 && 
    buffer[0] === 0x50 && buffer[1] === 0x4B && // PK магический номер
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07); // Дополнительная проверка ZIP
  
  // Дополнительная проверка: ищем подпись Excel файлов
  const bufferStr = buffer.toString('binary', 0, Math.min(buffer.length, 1000));
  const hasExcelSignature = bufferStr.includes('xl/') || bufferStr.includes('docProps/') || 
                           bufferStr.includes('[Content_Types].xml');
  
  const isExcel = hasZipSignature || hasExcelSignature;
  
  console.log('Тип файла:', isExcel ? 'Excel' : 'CSV');
  
  let jsonData: any[][];
  
  if (!isExcel) {
    // Для CSV файлов - парсим как текст с правильной кодировкой
    try {
      const fileStr = buffer.toString('utf8');
      const lines = fileStr.split('\n').filter(line => line.trim().length > 0);
    
    // Автоопределение разделителя: проверяем первую строку
    const firstLine = lines[0] || '';
    const hasSemicolon = firstLine.includes(';');
    const hasComma = firstLine.includes(',');
    const delimiter = hasSemicolon ? ';' : ',';
    
    console.log('Определён разделитель:', delimiter === ';' ? 'точка с запятой' : 'запятая');
    
    jsonData = lines.map(line => {
      // Разделяем по найденному разделителю, учитывая кавычки
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
    } catch (error) {
      console.log('Ошибка при чтении как CSV, пробуем как Excel файл...');
      // Если не удалось прочитать как CSV, пробуем как Excel
      const workbook = XLSX.read(buffer, { 
        type: "buffer",
        codepage: 65001 // UTF-8 кодировка
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: null 
      });
    }
  } else {
    // Для Excel файлов
    const workbook = XLSX.read(buffer, { 
      type: "buffer",
      codepage: 65001 // UTF-8 кодировка
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null 
    });
  }

  const records: ParsedRecord[] = [];
  let orderNum = 0;

  console.log('Всего строк для обработки:', jsonData.length);
  console.log('Первые строки:', jsonData.slice(0, 3));

  // Пропускаем заголовок (первую строку)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    if (!row || row.length === 0) continue;
    
    // Обработка проблемы с Excel Date Serial Numbers  
    let index = row[1]?.toString()?.trim(); // Столбец B (шифр)
    const title = row[2]?.toString()?.trim();  // Столбец C (наименование)  
    const unit = row[3]?.toString()?.trim() || '';   // Столбец D (единица измерения)
    let costPrice = row[4]?.toString()?.trim() || ''; // Столбец E (себестоимость)
    
    // Исправляем русскую локализацию чисел: заменяем запятую на точку
    if (costPrice && costPrice.includes(',')) {
      costPrice = costPrice.replace(',', '.');
      console.log(`Исправили число: "${row[4]}" -> "${costPrice}"`);
    }
    
    // Исправляем Excel Date Serial Numbers для разделов  
    if (index === '36892') index = '1-';     // 1- преобразуется в 36892
    if (index === '36923') index = '2-';     // 2- преобразуется в 36923
    if (index === '36954') index = '3-';     // 3- преобразуется в 36954
    if (index === '36985') index = '4-';     // 4- и так далее...
    if (index === '37016') index = '5-';
    if (index === '37047') index = '6-';
    if (index === '37078') index = '7-';
    if (index === '37109') index = '8-';
    if (index === '37140') index = '9-';
    if (index === '37170') index = '10-';
    if (index === '37201') index = '11-';
    if (index === '37232') index = '12-';
    if (index === '37263') index = '13-';
    if (index === '37294') index = '14-';
    if (index === '37325') index = '15-';
    
    if (!index || !title) {
      console.log(`Пропускаем строку ${orderNum + 2}: шифр="${index}", название="${title}"`);
      continue;
    }
    
    const type = determineRecordType(index, title, unit);
    console.log(`Строка ${orderNum + 2}: шифр="${index}", тип="${type}", единица="${unit}"`);
    if (type === 'ignore') continue;
    
    records.push({
      index,
      title,
      unit,
      costPrice,
      type,
      orderNum: orderNum++
    });
  }
  
  console.log('Всего записей создано:', records.length);
  console.log('Записи:', records.map(r => ({ index: r.index, title: r.title, type: r.type })));
  
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
          // Если родительский раздел не найден, создаем его автоматически
          console.log(`Автосоздание родительского раздела "${parentIndex}" для "${record.index}"`);
          const autoSectionData = {
            index: parentIndex,
            displayIndex: parentIndex + '-',
            title: `Раздел ${parentIndex}`,
            parentId: null,
            orderNum: record.orderNum - 0.5
          };
          
          const autoCreatedSection = await storage.createSection(autoSectionData as InsertSection);
          sectionMap.set(parentIndex, autoCreatedSection.id);
          parentId = autoCreatedSection.id;
          sectionsCreated++;
        }
      }
      
      const sectionData = {
        index: cleanIndex,
        displayIndex: record.index,
        title: record.title,
        parentId,
        orderNum: record.orderNum
      };
      
      const createdSection = await storage.createSection(sectionData as InsertSection);
      sectionMap.set(cleanIndex, createdSection.id);
      sectionsCreated++;
      
    } catch (error) {
      errors.push(`Строка ${record.orderNum + 2}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
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
        
        // Для работ обязательны единица измерения и себестоимость
        if (!record.unit || record.unit === "") {
          console.log(`Пропускаем работу без единицы измерения: "${record.index}"`);
          continue;
        }
        
        // Проверяем наличие себестоимости
        if (!record.costPrice || record.costPrice === "") {
          console.log(`Пропускаем работу без себестоимости: "${record.index}"`);
          continue;
        }
        
        const taskData = {
          index: cleanIndex,
          displayIndex: record.index,
          title: record.title,
          unit: record.unit,
          costPrice: record.costPrice,
          parentSectionId,
          orderNum: record.orderNum
        };
        
        await storage.createTask(taskData as InsertTask);
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