import XLSX from 'xlsx';
import fs from 'fs';

const workbook = XLSX.readFile('./attached_assets/Копия Образец 04.08.2025_1754741195825.xlsx');
const worksheet = workbook.Sheets['Смета с материалом'];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== ИЗВЛЕЧЕНИЕ ПОЛНЫХ ДАННЫХ ===');

const sections = [];
let currentSection = null;
let currentWork = null;

// Начинаем с 4 строки (индекс 3), пропуская заголовки
for (let i = 3; i < data.length; i++) {
  const row = data[i];
  if (!row || !row.some(cell => cell !== undefined && cell !== '')) continue;
  
  const [stage, index, name, image, unit, quantity, , costPrice, unitPrice, materials, laborCost] = row;
  
  // Заголовок раздела (например, "1. Работы по потолкам (Демонтаж)")
  if (typeof index === 'string' && index.match(/^\d+$/) && typeof name === 'string' && name.includes('.') && !unit) {
    currentSection = {
      id: parseInt(index),
      title: name.trim(),
      works: []
    };
    sections.push(currentSection);
    console.log(`Раздел ${index}: ${name}`);
    continue;
  }
  
  // Работа (имеет этап, номер типа "1.1", единицу измерения)
  if (typeof stage === 'number' && typeof index === 'string' && index.includes('.') && unit) {
    currentWork = {
      stage: stage,
      index: index,
      title: name ? name.trim() : '',
      unit: unit,
      quantity: parseFloat(quantity) || 0,
      costPrice: parseFloat(costPrice) || 0,
      unitPrice: parseFloat(unitPrice) || 0,
      materials: []
    };
    
    if (currentSection) {
      currentSection.works.push(currentWork);
    }
    continue;
  }
  
  // Материал (строка после работы, первая колонка содержит единицу измерения)
  if (currentWork && typeof stage === 'string' && typeof index === 'string' && typeof name === 'string' && name.length > 5) {
    const material = {
      unit: stage, // единица измерения материала
      workIndex: index, // связь с работой
      name: name.trim(),
      priceType: image || '',
      quantity: parseFloat(quantity) || 0,
      costPrice: parseFloat(costPrice) || 0,
      unitPrice: parseFloat(unitPrice) || 0,
      total: parseFloat(materials) || 0
    };
    currentWork.materials.push(material);
  }
}

// Создаем структуру для TypeScript компонента
const estimateStructure = {
  sections: sections.filter(s => s.works && s.works.length > 0),
  metadata: {
    totalSections: sections.length,
    totalWorks: sections.reduce((sum, section) => sum + section.works.length, 0),
    totalMaterials: sections.reduce((sum, section) => 
      sum + section.works.reduce((workSum, work) => workSum + work.materials.length, 0), 0)
  }
};

// Сохраняем как JSON для использования в компоненте
fs.writeFileSync('./estimate-full-data.json', JSON.stringify(estimateStructure, null, 2), 'utf8');

console.log(`\n=== РЕЗУЛЬТАТ ===`);
console.log(`Разделов: ${estimateStructure.metadata.totalSections}`);
console.log(`Работ: ${estimateStructure.metadata.totalWorks}`);
console.log(`Материалов: ${estimateStructure.metadata.totalMaterials}`);

// Создаем TypeScript константу для компонента
let tsConstant = 'const estimateData = {\n  sections: [\n';

estimateStructure.sections.forEach((section, sectionIndex) => {
  tsConstant += `    {\n      id: ${section.id},\n      title: "${section.title}",\n      works: [\n`;
  
  section.works.forEach((work, workIndex) => {
    tsConstant += `        {\n          stage: ${work.stage},\n          index: "${work.index}",\n          title: "${work.title}",\n          unit: "${work.unit}",\n          quantity: ${work.quantity},\n          costPrice: ${work.costPrice},\n          unitPrice: ${work.unitPrice},\n          materials: [\n`;
    
    work.materials.forEach((material, materialIndex) => {
      tsConstant += `            { name: "${material.name.replace(/"/g, '\\"')}", unit: "${material.unit}", quantity: ${material.quantity}, unitPrice: ${material.unitPrice} }`;
      if (materialIndex < work.materials.length - 1) tsConstant += ',';
      tsConstant += '\n';
    });
    
    tsConstant += '          ]\n        }';
    if (workIndex < section.works.length - 1) tsConstant += ',';
    tsConstant += '\n';
  });
  
  tsConstant += '      ]\n    }';
  if (sectionIndex < estimateStructure.sections.length - 1) tsConstant += ',';
  tsConstant += '\n';
});

tsConstant += '  ]\n};';

fs.writeFileSync('./estimate-typescript-data.ts', tsConstant, 'utf8');

console.log('\nПервые несколько разделов:');
estimateStructure.sections.slice(0, 3).forEach(section => {
  console.log(`\n${section.title} (${section.works.length} работ)`);
  section.works.slice(0, 2).forEach(work => {
    console.log(`  ${work.index} ${work.title} - ${work.quantity} ${work.unit} х ₽${work.unitPrice}`);
    console.log(`    Материалов: ${work.materials.length}`);
  });
});