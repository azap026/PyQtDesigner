import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { 
  insertProjectSchema,
  insertMaterialSchema,
  insertWorkItemSchema,
  insertWorkMaterialSchema
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
          const materialData = {
            name: row[0]?.toString() || "",
            unit: row[1]?.toString() || "",
            pricePerUnit: row[2]?.toString() || "0",
            imageUrl: row[3]?.toString() || null,
            productUrl: row[4]?.toString() || null,
            consumptionRate: row[5]?.toString() || null,
            consumptionUnit: row[6]?.toString() || null,
            weightPerUnit: row[7]?.toString() || null,
            weightUnit: row[8]?.toString() || null,
            supplier: row[9]?.toString() || null,
            notes: row[10]?.toString() || null,
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
          "Наименование*", 
          "Единица измерения*", 
          "Цена за единицу*", 
          "Ссылка на картинку", 
          "Ссылка на товар", 
          "Расход на ед. изм.", 
          "Единица расхода", 
          "Вес за единицу", 
          "Единица веса", 
          "Поставщик", 
          "Примечания"
        ],
        [
          "Кирпич керамический", 
          "шт", 
          "12.50", 
          "https://example.com/brick.jpg", 
          "https://shop.com/brick", 
          "510", 
          "шт/м³", 
          "2.5", 
          "кг/шт", 
          "ООО Стройматериалы", 
          "Красный лицевой кирпич"
        ],
        [
          "Цемент М400", 
          "кг", 
          "8.50", 
          "", 
          "", 
          "350", 
          "кг/м³", 
          "", 
          "", 
          "Завод ЖБИ-1", 
          "Портландцемент"
        ]
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths
      worksheet['!cols'] = [
        { width: 25 }, // Наименование
        { width: 15 }, // Единица измерения
        { width: 15 }, // Цена
        { width: 30 }, // Ссылка на картинку
        { width: 30 }, // Ссылка на товар
        { width: 15 }, // Расход
        { width: 15 }, // Единица расхода
        { width: 15 }, // Вес
        { width: 15 }, // Единица веса
        { width: 20 }, // Поставщик
        { width: 30 }, // Примечания
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Материалы");
      
      const buffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: "xlsx" 
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=template_materials.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
