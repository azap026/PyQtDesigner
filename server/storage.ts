import { 
  projects, 
  materials, 
  workItems, 
  workMaterials,
  type Project, 
  type InsertProject,
  type Material,
  type InsertMaterial,
  type WorkItem,
  type InsertWorkItem,
  type WorkMaterial,
  type InsertWorkMaterial,
  type ProjectWithWorkItems,
  type WorkItemWithMaterials
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<ProjectWithWorkItems | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Materials
  getMaterials(): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material>;
  deleteMaterial(id: string): Promise<void>;

  // Work Items
  getWorkItems(projectId: string): Promise<WorkItemWithMaterials[]>;
  getWorkItem(id: string): Promise<WorkItemWithMaterials | undefined>;
  createWorkItem(workItem: InsertWorkItem): Promise<WorkItem>;
  updateWorkItem(id: string, workItem: Partial<InsertWorkItem>): Promise<WorkItem>;
  deleteWorkItem(id: string): Promise<void>;

  // Work Materials
  getWorkMaterials(workItemId: string): Promise<(WorkMaterial & { material: Material })[]>;
  createWorkMaterial(workMaterial: InsertWorkMaterial): Promise<WorkMaterial>;
  updateWorkMaterial(id: string, workMaterial: Partial<InsertWorkMaterial>): Promise<WorkMaterial>;
  deleteWorkMaterial(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string): Promise<ProjectWithWorkItems | undefined> {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        workItems: {
          with: {
            workMaterials: {
              with: {
                material: true
              }
            }
          }
        }
      }
    });
    return project as ProjectWithWorkItems | undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({ ...insertProject, updatedAt: new Date() })
      .returning();
    return project;
  }

  async updateProject(id: string, updateProject: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...updateProject, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Materials
  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials).orderBy(materials.name);
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async createMaterial(insertMaterial: InsertMaterial): Promise<Material> {
    const [material] = await db
      .insert(materials)
      .values({ ...insertMaterial, updatedAt: new Date() })
      .returning();
    return material;
  }

  async updateMaterial(id: string, updateMaterial: Partial<InsertMaterial>): Promise<Material> {
    const [material] = await db
      .update(materials)
      .set({ ...updateMaterial, updatedAt: new Date() })
      .where(eq(materials.id, id))
      .returning();
    return material;
  }

  async deleteMaterial(id: string): Promise<void> {
    await db.delete(materials).where(eq(materials.id, id));
  }

  // Work Items
  async getWorkItems(projectId: string): Promise<WorkItemWithMaterials[]> {
    const items = await db.query.workItems.findMany({
      where: eq(workItems.projectId, projectId),
      with: {
        workMaterials: {
          with: {
            material: true
          }
        }
      }
    });
    return items as WorkItemWithMaterials[];
  }

  async getWorkItem(id: string): Promise<WorkItemWithMaterials | undefined> {
    const item = await db.query.workItems.findFirst({
      where: eq(workItems.id, id),
      with: {
        workMaterials: {
          with: {
            material: true
          }
        }
      }
    });
    return item as WorkItemWithMaterials | undefined;
  }

  async createWorkItem(insertWorkItem: InsertWorkItem): Promise<WorkItem> {
    const [workItem] = await db
      .insert(workItems)
      .values({ ...insertWorkItem, updatedAt: new Date() })
      .returning();
    return workItem;
  }

  async updateWorkItem(id: string, updateWorkItem: Partial<InsertWorkItem>): Promise<WorkItem> {
    const [workItem] = await db
      .update(workItems)
      .set({ ...updateWorkItem, updatedAt: new Date() })
      .where(eq(workItems.id, id))
      .returning();
    return workItem;
  }

  async deleteWorkItem(id: string): Promise<void> {
    await db.delete(workItems).where(eq(workItems.id, id));
  }

  // Work Materials
  async getWorkMaterials(workItemId: string): Promise<(WorkMaterial & { material: Material })[]> {
    const materials = await db.query.workMaterials.findMany({
      where: eq(workMaterials.workItemId, workItemId),
      with: {
        material: true
      }
    });
    return materials as (WorkMaterial & { material: Material })[];
  }

  async createWorkMaterial(insertWorkMaterial: InsertWorkMaterial): Promise<WorkMaterial> {
    const [workMaterial] = await db
      .insert(workMaterials)
      .values(insertWorkMaterial)
      .returning();
    return workMaterial;
  }

  async updateWorkMaterial(id: string, updateWorkMaterial: Partial<InsertWorkMaterial>): Promise<WorkMaterial> {
    const [workMaterial] = await db
      .update(workMaterials)
      .set(updateWorkMaterial)
      .where(eq(workMaterials.id, id))
      .returning();
    return workMaterial;
  }

  async deleteWorkMaterial(id: string): Promise<void> {
    await db.delete(workMaterials).where(eq(workMaterials.id, id));
  }
}

export const storage = new DatabaseStorage();
