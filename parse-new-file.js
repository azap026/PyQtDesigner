import XLSX from 'xlsx';
import fs from 'fs';

// Читаем новый Excel файл
const workbook = XLSX.readFile('./attached_assets/Копия Образец 04.08.2025_1754741195825.xlsx');

console.log('=== АНАЛИЗ НОВОГО ФАЙЛА ===');
console.log('Листы в файле:', workbook.SheetNames);

// Проверяем каждый лист
workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n=== ЛИСТ: ${sheetName} ===`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Строк: ${data.length}`);
  
  // Ищем строки с данными
  const contentRows = data.filter(row => row && row.some(cell => cell !== undefined && cell !== ''));
  console.log(`Строк с содержимым: ${contentRows.length}`);
  
  if (contentRows.length > 0) {
    console.log('Первые 15 строк:');
    contentRows.slice(0, 15).forEach((row, idx) => {
      console.log(`  ${idx + 1}:`, row.slice(0, 8));
    });
    
    // Поиск заголовков таблицы
    const headerPatterns = ['№', 'Наименование', 'Ед.изм', 'Количество', 'Цена', 'Стоимость'];
    for (let i = 0; i < contentRows.length; i++) {
      const row = contentRows[i];
      const matchCount = headerPatterns.filter(pattern => 
        row.some(cell => typeof cell === 'string' && cell.includes(pattern))
      ).length;
      
      if (matchCount >= 3) {
        console.log(`\nВозможные заголовки на строке ${i + 1}:`, row);
        
        // Показываем следующие 10 строк
        console.log('Следующие строки:');
        for (let j = i + 1; j < Math.min(i + 11, contentRows.length); j++) {
          console.log(`  ${j + 1}:`, contentRows[j].slice(0, 8));
        }
        break;
      }
    }
  }
});

// Сохраняем для детального анализа
const allData = {};
workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  allData[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
});

fs.writeFileSync('./new-file-data.json', JSON.stringify(allData, null, 2), 'utf8');
console.log('\n=== Данные сохранены в new-file-data.json ===');