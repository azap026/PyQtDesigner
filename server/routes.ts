import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { importHierarchicalStructure } from "./hierarchical-import";
import { db } from "./db";
import { tasks } from "@shared/schema";
import { eq, isNotNull } from "drizzle-orm";
import { 
  insertProjectSchema,
  insertMaterialSchema,
  insertWorkItemSchema,
  insertWorkMaterialSchema,
  insertSectionSchema,
  insertTaskSchema
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error getting projects:", error);
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error getting project:", error);
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ error: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const projectData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, projectData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Materials
  app.get("/api/materials", async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials);
    } catch (error) {
      console.error("Error getting materials:", error);
      res.status(500).json({ error: "Failed to get materials" });
    }
  });

  // Search materials by name
  app.get("/api/materials/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }
      
      const materials = await storage.searchMaterials(q);
      res.json(materials);
    } catch (error) {
      console.error("Error searching materials:", error);
      res.status(500).json({ error: "Failed to search materials" });
    }
  });

  app.post("/api/materials", async (req, res) => {
    try {
      const materialData = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial(materialData);
      res.status(201).json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(400).json({ error: "Failed to create material" });
    }
  });

  app.put("/api/materials/:id", async (req, res) => {
    try {
      const materialData = insertMaterialSchema.partial().parse(req.body);
      const material = await storage.updateMaterial(req.params.id, materialData);
      res.json(material);
    } catch (error) {
      console.error("Error updating material:", error);
      res.status(400).json({ error: "Failed to update material" });
    }
  });

  // Clear all materials (MUST be before /api/materials/:id route)
  app.delete("/api/materials/clear", async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      let deletedCount = 0;
      
      for (const material of materials) {
        await storage.deleteMaterial(material.id);
        deletedCount++;
      }
      
      res.json({ deleted: deletedCount });
    } catch (error) {
      console.error("Error clearing materials:", error);
      res.status(500).json({ error: "Failed to clear materials database" });
    }
  });

  app.delete("/api/materials/:id", async (req, res) => {
    try {
      await storage.deleteMaterial(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting material:", error);
      res.status(500).json({ error: "Failed to delete material" });
    }
  });

  // Work Items
  app.get("/api/projects/:projectId/work-items", async (req, res) => {
    try {
      const workItems = await storage.getWorkItems(req.params.projectId);
      res.json(workItems);
    } catch (error) {
      console.error("Error getting work items:", error);
      res.status(500).json({ error: "Failed to get work items" });
    }
  });

  app.get("/api/work-items/:id", async (req, res) => {
    try {
      const workItem = await storage.getWorkItem(req.params.id);
      if (!workItem) {
        return res.status(404).json({ error: "Work item not found" });
      }
      res.json(workItem);
    } catch (error) {
      console.error("Error getting work item:", error);
      res.status(500).json({ error: "Failed to get work item" });
    }
  });

  app.post("/api/work-items", async (req, res) => {
    try {
      const workItemData = insertWorkItemSchema.parse(req.body);
      const workItem = await storage.createWorkItem(workItemData);
      res.status(201).json(workItem);
    } catch (error) {
      console.error("Error creating work item:", error);
      res.status(400).json({ error: "Failed to create work item" });
    }
  });

  app.put("/api/work-items/:id", async (req, res) => {
    try {
      const workItemData = insertWorkItemSchema.partial().parse(req.body);
      const workItem = await storage.updateWorkItem(req.params.id, workItemData);
      res.json(workItem);
    } catch (error) {
      console.error("Error updating work item:", error);
      res.status(400).json({ error: "Failed to update work item" });
    }
  });

  // Clear all work items (MUST be before /api/work-items/:id route)
  app.delete("/api/work-items/clear", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      let deletedCount = 0;
      
      for (const project of projects) {
        const workItems = await storage.getWorkItems(project.id);
        for (const workItem of workItems) {
          await storage.deleteWorkItem(workItem.id);
          deletedCount++;
        }
      }
      
      res.json({ deleted: deletedCount });
    } catch (error) {
      console.error("Error clearing work items:", error);
      res.status(500).json({ error: "Failed to clear work items database" });
    }
  });

  // Create work material for specific work item
  app.post("/api/work-items/:workItemId/materials", async (req, res) => {
    try {
      const { workItemId } = req.params;
      const workMaterialData = insertWorkMaterialSchema.parse({
        ...req.body,
        workItemId
      });
      
      const workMaterial = await storage.createWorkMaterial(workMaterialData);
      res.status(201).json(workMaterial);
    } catch (error) {
      console.error("Error creating work material:", error);
      res.status(500).json({ error: "Failed to create work material" });
    }
  });

  app.delete("/api/work-items/:id", async (req, res) => {
    try {
      await storage.deleteWorkItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work item:", error);
      res.status(500).json({ error: "Failed to delete work item" });
    }
  });

  // Work Materials
  app.get("/api/work-items/:workItemId/materials", async (req, res) => {
    try {
      const workMaterials = await storage.getWorkMaterials(req.params.workItemId);
      res.json(workMaterials);
    } catch (error) {
      console.error("Error getting work materials:", error);
      res.status(500).json({ error: "Failed to get work materials" });
    }
  });

  app.post("/api/work-materials", async (req, res) => {
    try {
      const workMaterialData = insertWorkMaterialSchema.parse(req.body);
      const workMaterial = await storage.createWorkMaterial(workMaterialData);
      res.status(201).json(workMaterial);
    } catch (error) {
      console.error("Error creating work material:", error);
      res.status(400).json({ error: "Failed to create work material" });
    }
  });

  app.put("/api/work-materials/:id", async (req, res) => {
    try {
      const workMaterialData = insertWorkMaterialSchema.partial().parse(req.body);
      const workMaterial = await storage.updateWorkMaterial(req.params.id, workMaterialData);
      res.json(workMaterial);
    } catch (error) {
      console.error("Error updating work material:", error);
      res.status(400).json({ error: "Failed to update work material" });
    }
  });

  app.delete("/api/work-materials/:id", async (req, res) => {
    try {
      await storage.deleteWorkMaterial(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work material:", error);
      res.status(500).json({ error: "Failed to delete work material" });
    }
  });

  // Material Import
  app.post("/api/materials/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON, starting from row 2 (skip header)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: null 
      });

      // Skip header row
      const dataRows = jsonData.slice(1);
      
      let importedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as any[];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[0]) continue;

        try {
          // Функция для очистки и конвертации русского формата чисел
          const cleanPrice = (value: any): string => {
            if (!value) return "0";
            let priceStr = value.toString().trim();
            
            // Проверяем на текстовые значения ошибок
            if (priceStr.toLowerCase().includes('ненайдена') || 
                priceStr.toLowerCase().includes('ошибка') ||
                priceStr.toLowerCase().includes('error') ||
                priceStr === '-' || priceStr === '') {
              return "0";
            }
            
            // Удаляем пробелы из чисел (русский формат тысяч)
            priceStr = priceStr.replace(/\s+/g, '');
            // Заменяем запятую на точку (русский десятичный разделитель)
            priceStr = priceStr.replace(',', '.');
            
            // Проверяем, что результат - валидное число
            const numValue = parseFloat(priceStr);
            if (isNaN(numValue)) {
              return "0";
            }
            
            return priceStr;
          };

          // Обновленная структура согласно файлу "Цены парсер"
          const materialData = {
            name: row[1]?.toString() || "", // Наименование (колонка B)
            unit: row[5]?.toString() || "шт", // Единица измерения (колонка F)
            pricePerUnit: cleanPrice(row[2]), // Цена (колонка C) - как строка для схемы
            imageUrl: row[3]?.toString() || null, // Ссылка на картинку (колонка D)
            productUrl: row[4]?.toString() || null, // Ссылка на товар (колонка E)
            consumptionRate: cleanPrice(row[6]) || null, // Норма расхода (колонка G)
            consumptionUnit: "кв.м", // По умолчанию
            weightPerUnit: cleanPrice(row[7]) || null, // Вес на единицу (колонка H)
            weightUnit: "кг", // По умолчанию
            supplier: null,
            notes: null,
          };

          // Validate required fields
          if (!materialData.name || !materialData.unit || !materialData.pricePerUnit) {
            errors.push(`Строка ${i + 2}: отсутствуют обязательные поля (название, единица измерения, цена)`);
            continue;
          }

          const validatedData = insertMaterialSchema.parse(materialData);
          await storage.createMaterial(validatedData);
          importedCount++;
        } catch (error) {
          errors.push(`Строка ${i + 2}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
        }
      }

      if (errors.length > 0) {
        console.log("Import errors:", errors);
      }

      res.json({ 
        imported: importedCount, 
        errors: errors.length > 0 ? errors : undefined 
      });
    } catch (error) {
      console.error("Error importing materials:", error);
      res.status(500).json({ error: "Failed to import materials" });
    }
  });

  // Download template
  app.get("/api/materials/template", (req, res) => {
    try {
      const templateData = [
        [
          "№", 
          "Наименование", 
          "Цена", 
          "Ссылка на картинку", 
          "Ссылка на товар", 
          "ЕД.ИЗМ", 
          "Норма расхода на 1кв.м.", 
          "Вес на единицу"
        ],
        [
          "1", 
          "*1150101001 КЕНДИ КАШТАН 340ML", 
          "7153.50", 
          "https://lk.teremopt.ru/upload/resize_cache/iblock/", 
          "https://lk.teremopt.ru/catalogue/detail.php?ID=12202", 
          "шт", 
          "1.2", 
          "0.5"
        ],
        [
          "2", 
          "*1160033100 КЕНДИ МОРКОВЬ Мусс", 
          "1189.40", 
          "https://lk.teremopt.ru/upload/resize_cache/iblock/", 
          "https://lk.teremopt.ru/catalogue/detail.php?ID=12243", 
          "шт", 
          "0.8", 
          "0.3"
        ]
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths  
      worksheet['!cols'] = [
        { width: 5 },  // №
        { width: 40 }, // Наименование
        { width: 15 }, // Цена
        { width: 35 }, // Ссылка на картинку
        { width: 35 }, // Ссылка на товар
        { width: 12 }, // ЕД.ИЗМ
        { width: 20 }, // Норма расхода
        { width: 15 }, // Вес на единицу
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Материалы");
      
      const buffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: "xlsx" 
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=template_material_prices.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Quick Materials Database Import
  app.post("/api/materials/import-base", async (req, res) => {
    try {
      const baseMaterials = [
        {
          name: "Кирпич керамический",
          unit: "шт",
          pricePerUnit: "12.50",
          supplier: "ООО Стройматериалы",
          notes: "Красный лицевой кирпич",
          consumptionRate: "510",
          consumptionUnit: "шт/м³",
          weightPerUnit: "2.5",
          weightUnit: "кг/шт"
        },
        {
          name: "Цемент М400",
          unit: "кг",
          pricePerUnit: "8.50",
          supplier: "Завод ЖБИ-1",
          notes: "Портландцемент",
          consumptionRate: "350",
          consumptionUnit: "кг/м³"
        },
        {
          name: "Песок строительный",
          unit: "м³",
          pricePerUnit: "850.00",
          supplier: "Карьер Песок",
          notes: "Мытый песок фракция 0-5мм",
          weightPerUnit: "1.6",
          weightUnit: "т/м³"
        },
        {
          name: "Щебень гранитный 5-20",
          unit: "м³",
          pricePerUnit: "1200.00",
          supplier: "Карьер Гранит",
          notes: "Фракция 5-20мм",
          weightPerUnit: "1.4",
          weightUnit: "т/м³"
        },
        {
          name: "Арматура А500С Ø12",
          unit: "м",
          pricePerUnit: "45.00",
          supplier: "Металлбаза",
          notes: "Рифленая арматура",
          weightPerUnit: "0.888",
          weightUnit: "кг/м"
        },
        {
          name: "Доска обрезная 50×150×6000",
          unit: "м³",
          pricePerUnit: "15000.00",
          supplier: "Лесобаза",
          notes: "Сосна 1 сорт",
          weightPerUnit: "500",
          weightUnit: "кг/м³"
        },
        {
          name: "Утеплитель минеральная вата",
          unit: "м³",
          pricePerUnit: "3500.00",
          supplier: "ТеплоСтрой",
          notes: "Плотность 50кг/м³",
          weightPerUnit: "50",
          weightUnit: "кг/м³"
        },
        {
          name: "Гипсокартон 12.5мм",
          unit: "м²",
          pricePerUnit: "280.00",
          supplier: "ГипсПром",
          notes: "Стандартный ГКЛ",
          weightPerUnit: "10",
          weightUnit: "кг/м²"
        },
        {
          name: "Краска водоэмульсионная",
          unit: "л",
          pricePerUnit: "320.00",
          supplier: "ЛакКрас",
          notes: "Белая матовая",
          consumptionRate: "0.15",
          consumptionUnit: "л/м²"
        },
        {
          name: "Плитка керамическая",
          unit: "м²",
          pricePerUnit: "850.00",
          supplier: "КерамПлюс",
          notes: "Настенная 300×300мм"
        }
      ];

      let importedCount = 0;
      const errors: string[] = [];

      for (const materialData of baseMaterials) {
        try {
          const validatedData = insertMaterialSchema.parse(materialData);
          await storage.createMaterial(validatedData);
          importedCount++;
        } catch (error) {
          errors.push(`${materialData.name}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
        }
      }

      res.json({ 
        imported: importedCount, 
        errors: errors.length > 0 ? errors : undefined 
      });
    } catch (error) {
      console.error("Error importing base materials:", error);
      res.status(500).json({ error: "Failed to import base materials" });
    }
  });



  // Work Items Import
  app.post("/api/work-items-import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON, starting from row 2 (skip header)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: null 
      });

      // Skip header row
      const dataRows = jsonData.slice(1);
      
      let importedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as any[];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[0]) continue;

        try {
          const workData = {
            projectId: projectId,
            name: row[0]?.toString() || "",
            description: row[1]?.toString() || null,
            unit: row[2]?.toString() || "",
            pricePerUnit: row[3]?.toString() || "0",
            costPrice: row[4]?.toString() || null,
            volume: row[5]?.toString() || "0",
          };

          // Validate required fields
          if (!workData.name || !workData.unit || !workData.pricePerUnit) {
            errors.push(`Строка ${i + 2}: отсутствуют обязательные поля (название, единица измерения, цена)`);
            continue;
          }

          const validatedData = insertWorkItemSchema.parse(workData);
          await storage.createWorkItem(validatedData);
          importedCount++;
        } catch (error) {
          errors.push(`Строка ${i + 2}: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
        }
      }

      if (errors.length > 0) {
        console.log("Work import errors:", errors);
      }

      res.json({ 
        imported: importedCount, 
        errors: errors.length > 0 ? errors : undefined 
      });
    } catch (error) {
      console.error("Error importing work items:", error);
      res.status(500).json({ error: "Failed to import work items" });
    }
  });

  // Work Items Template Download
  app.get("/api/work-items-template", (req, res) => {
    try {
      const templateData = [
        [
          "Наименование*", 
          "Описание", 
          "Единица измерения*", 
          "Цена за единицу*", 
          "Себестоимость", 
          "Объём"
        ],
        [
          "Кладка кирпичных стен", 
          "Кладка наружных стен из керамического кирпича", 
          "м³", 
          "4500.00", 
          "3200.00", 
          "12.5"
        ],
        [
          "Устройство бетонного пола", 
          "Заливка и выравнивание бетонного пола", 
          "м²", 
          "850.00", 
          "620.00", 
          "45.2"
        ],
        [
          "Монтаж оконных блоков", 
          "Установка пластиковых окон", 
          "шт", 
          "1200.00", 
          "950.00", 
          "8"
        ]
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths
      worksheet['!cols'] = [
        { width: 30 }, // Наименование
        { width: 40 }, // Описание
        { width: 20 }, // Единица измерения
        { width: 20 }, // Цена за единицу
        { width: 20 }, // Себестоимость
        { width: 15 }, // Объём
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Работы");
      
      const buffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: "xlsx" 
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=template_works.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error creating work template:", error);
      res.status(500).json({ error: "Failed to create work template" });
    }
  });

  // Hierarchical Work Structure API
  
  // Get hierarchical structure
  // Интеграция работ с материалами
app.post("/api/projects/:projectId/sync-hierarchy", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { syncWorksWithHierarchy, linkWorksToMaterials } = await import("./work-integration");
    
    // Синхронизируем работы с иерархической структурой
    const syncResults = await syncWorksWithHierarchy(projectId);
    
    // Привязываем материалы к работам
    const linkResults = await linkWorksToMaterials(projectId);
    
    res.json({
      message: "Синхронизация завершена",
      syncedWorks: syncResults.length,
      linkedWorks: linkResults.length,
      details: {
        sync: syncResults,
        links: linkResults
      }
    });
  } catch (error) {
    console.error("Sync hierarchy error:", error);
    res.status(500).json({ error: "Ошибка синхронизации с иерархией" });
  }
});

app.get("/api/hierarchy", async (req, res) => {
    try {
      const structure = await storage.getHierarchicalStructure();
      res.json(structure);
    } catch (error) {
      console.error("Error getting hierarchical structure:", error);
      res.status(500).json({ error: "Failed to get hierarchical structure" });
    }
  });

  // Import hierarchical structure from Excel
  app.post("/api/hierarchy/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await importHierarchicalStructure(req.file.buffer);
      res.json(result);
    } catch (error) {
      console.error("Error importing hierarchical structure:", error);
      res.status(500).json({ error: "Failed to import hierarchical structure" });
    }
  });

  // Clear hierarchy data
  app.delete("/api/hierarchy/clear", async (req, res) => {
    try {
      // Delete all tasks first (due to foreign key constraints)
      const tasks = await storage.getTasks();
      for (const task of tasks) {
        await storage.deleteTask(task.id);
      }

      // Then delete all sections
      const sections = await storage.getSections();
      for (const section of sections) {
        await storage.deleteSection(section.id);
      }

      res.json({ message: "Hierarchical structure cleared successfully" });
    } catch (error) {
      console.error("Error clearing hierarchy:", error);
      res.status(500).json({ error: "Failed to clear hierarchical structure" });
    }
  });

  // Update task cost price
  app.patch("/api/hierarchy/tasks/:id", async (req, res) => {
    try {
      const { costPrice } = req.body;
      
      if (costPrice === undefined || costPrice === null) {
        return res.status(400).json({ error: "costPrice is required" });
      }

      const task = await storage.updateTask(req.params.id, { costPrice });
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Update task area configuration
  app.patch("/api/hierarchy/tasks/:id/area-config", async (req, res) => {
    try {
      const { areaType, autoFillFromArea, areaMultiplier } = req.body;
      
      const updateData: any = {};
      if (areaType !== undefined) updateData.areaType = areaType;
      if (autoFillFromArea !== undefined) updateData.autoFillFromArea = autoFillFromArea;
      if (areaMultiplier !== undefined) updateData.areaMultiplier = areaMultiplier.toString();
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No area configuration data provided" });
      }

      const task = await storage.updateTask(req.params.id, updateData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task area config:", error);
      res.status(500).json({ error: "Failed to update task area configuration" });
    }
  });

  // Download hierarchical template
  app.get("/api/hierarchy/template", (req, res) => {
    try {
      const templateData = [
        [
          "№", 
          "Шифр", 
          "Наименование работ и затрат", 
          "Ед. изм.", 
          "Себестоимость"
        ],
        [
          "1", 
          "1-", 
          "Земляные работы", 
          "", 
          ""
        ],
        [
          "2", 
          "1.1", 
          "Разработка грунта вручную", 
          "м³", 
          "145.50"
        ],
        [
          "3", 
          "1.2", 
          "Планировка площадей", 
          "м²", 
          "12.30"
        ],
        [
          "4", 
          "1.3", 
          "Засыпка траншей", 
          "м³", 
          "89.75"
        ],
        [
          "5", 
          "2-", 
          "Фундаменты", 
          "", 
          ""
        ],
        [
          "6", 
          "2.1", 
          "Устройство бетонной подготовки", 
          "м³", 
          "1245.60"
        ],
        [
          "7", 
          "2.2", 
          "Устройство ленточных фундаментов", 
          "м³", 
          "2145.80"
        ],
        [
          "8", 
          "2.3", 
          "Гидроизоляция фундаментов", 
          "м²", 
          "125.40"
        ],
        [
          "9", 
          "3-", 
          "Стены", 
          "", 
          ""
        ],
        [
          "10", 
          "3.1-", 
          "Кирпичная кладка", 
          "", 
          ""
        ],
        [
          "11", 
          "3.1.1", 
          "Кладка стен из кирпича", 
          "м³", 
          "3250.00"
        ],
        [
          "12", 
          "3.1.2", 
          "Расшивка швов", 
          "м²", 
          "45.80"
        ],
        [
          "13", 
          "3.2-", 
          "Монолитные работы", 
          "", 
          ""
        ],
        [
          "14", 
          "3.2.1", 
          "Устройство монолитных стен", 
          "м³", 
          "2890.50"
        ],
        [
          "15", 
          "3.2.2", 
          "Установка арматуры", 
          "т", 
          "12500.00"
        ]
      ];

      // Создаём шаблон в том же формате, что и пользовательские данные
      // Поддерживаем и Excel и CSV форматы
      const format = req.query.format as string || 'csv';
      
      if (format === 'excel') {
        // Excel формат
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(templateData);
        
        // Set column widths
        worksheet['!cols'] = [
          { width: 8 },  // №
          { width: 12 }, // Шифр
          { width: 50 }, // Наименование
          { width: 15 }, // Ед. изм.
          { width: 15 }, // Себестоимость
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "Иерархическая структура");
        
        const buffer = XLSX.write(workbook, { 
          type: "buffer", 
          bookType: "xlsx" 
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=template_hierarchy.xlsx');
        res.send(buffer);
      } else {
        // CSV формат с точкой с запятой (стандарт для русской локализации)
        const csvContent = templateData.map(row => row.map(cell => {
          // Экранируем ячейки с точками с запятой или кавычками
          if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
            return '"' + cell.replace(/"/g, '""') + '"';
          }
          return cell;
        }).join(';')).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=template_hierarchy.csv');
        res.send('\uFEFF' + csvContent); // Добавляем BOM для правильной кодировки UTF-8
      }
    } catch (error) {
      console.error("Error creating hierarchy template:", error);
      res.status(500).json({ error: "Failed to create hierarchy template" });
    }
  });

  // Sections CRUD
  app.get("/api/sections", async (req, res) => {
    try {
      const sections = await storage.getSections();
      res.json(sections);
    } catch (error) {
      console.error("Error getting sections:", error);
      res.status(500).json({ error: "Failed to get sections" });
    }
  });

  app.post("/api/sections", async (req, res) => {
    try {
      const validatedData = insertSectionSchema.parse(req.body);
      const section = await storage.createSection(validatedData);
      res.json(section);
    } catch (error) {
      console.error("Error creating section:", error);
      res.status(500).json({ error: "Failed to create section" });
    }
  });

  app.put("/api/sections/:id", async (req, res) => {
    try {
      const validatedData = insertSectionSchema.partial().parse(req.body);
      const section = await storage.updateSection(req.params.id, validatedData);
      res.json(section);
    } catch (error) {
      console.error("Error updating section:", error);
      res.status(500).json({ error: "Failed to update section" });
    }
  });

  app.delete("/api/sections/:id", async (req, res) => {
    try {
      await storage.deleteSection(req.params.id);
      res.json({ message: "Section deleted successfully" });
    } catch (error) {
      console.error("Error deleting section:", error);
      res.status(500).json({ error: "Failed to delete section" });
    }
  });

  // Tasks CRUD
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error getting tasks:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, validatedData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Массовое обновление себестоимости работ
  app.patch("/api/hierarchy/bulk-update", async (req, res) => {
    try {
      const { coefficient } = req.body;
      
      if (!coefficient || typeof coefficient !== 'number' || coefficient <= 0) {
        return res.status(400).json({ error: "Coefficient must be a positive number" });
      }

      // Получаем все работы с себестоимостью
      const allTasks = await db.select().from(tasks).where(isNotNull(tasks.costPrice));
      
      let updated = 0;
      
      // Обновляем каждую работу
      for (const task of allTasks) {
        if (task.costPrice) {
          const currentPrice = parseFloat(task.costPrice);
          if (!isNaN(currentPrice)) {
            const newPrice = (currentPrice * coefficient / 100).toFixed(2);
            
            await db
              .update(tasks)
              .set({ costPrice: newPrice })
              .where(eq(tasks.id, task.id));
            
            updated++;
          }
        }
      }

      console.log(`Bulk update completed: ${updated} tasks updated with coefficient ${coefficient}%`);
      
      res.json({ 
        message: "Bulk update completed successfully",
        updated,
        coefficient 
      });
    } catch (error) {
      console.error("Error in bulk update:", error);
      res.status(500).json({ error: "Failed to perform bulk update" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
