import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema,
  insertMaterialSchema,
  insertWorkItemSchema,
  insertWorkMaterialSchema
} from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
