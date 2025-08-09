import { 
  projects, 
  materials, 
  workItems, 
  workMaterials,
  sections,
  tasks,
  type Project, 
  type InsertProject,
  type Material,
  type InsertMaterial,
  type WorkItem,
  type InsertWorkItem,
  type WorkMaterial,
  type InsertWorkMaterial,
  type Section,
  type InsertSection,
  type Task,
  type InsertTask,
  type ProjectWithWorkItems,
  type WorkItemWithMaterials,
  type SectionWithChildren,
  type HierarchicalWorkStructure
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

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
  searchMaterials(query: string): Promise<Material[]>;
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

  // Hierarchical Work Structure
  getSections(): Promise<Section[]>;
  getSection(id: string): Promise<Section | undefined>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, section: Partial<InsertSection>): Promise<Section>;
  deleteSection(id: string): Promise<void>;
  
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  getHierarchicalStructure(): Promise<HierarchicalWorkStructure>;
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

  async searchMaterials(query: string): Promise<Material[]> {
    const searchQuery = `%${query.toLowerCase()}%`;
    return await db.select().from(materials)
      .where(sql`LOWER(${materials.name}) LIKE ${searchQuery}`)
      .limit(20);
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

  // Hierarchical Work Structure
  async getSections(): Promise<Section[]> {
    return await db.select().from(sections).orderBy(sections.orderNum);
  }

  async getSection(id: string): Promise<Section | undefined> {
    const [section] = await db.select().from(sections).where(eq(sections.id, id));
    return section;
  }

  async createSection(insertSection: InsertSection): Promise<Section> {
    const [section] = await db
      .insert(sections)
      .values({ ...insertSection, updatedAt: new Date() })
      .returning();
    return section;
  }

  async updateSection(id: string, updateSection: Partial<InsertSection>): Promise<Section> {
    const [section] = await db
      .update(sections)
      .set({ ...updateSection, updatedAt: new Date() })
      .where(eq(sections.id, id))
      .returning();
    return section;
  }

  async deleteSection(id: string): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  }

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(tasks.orderNum);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ ...insertTask, updatedAt: new Date() })
      .returning();
    return task;
  }

  async updateTask(id: string, updateTask: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...updateTask, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getHierarchicalStructure(): Promise<HierarchicalWorkStructure> {
    // Получаем все разделы и задачи отдельно
    const allSections = await this.getSections();
    const allTasks = await this.getTasks();
    
    // Строим иерархию программно
    const sectionMap = new Map<string, any>();
    
    // Создаем карту всех разделов
    allSections.forEach(section => {
      sectionMap.set(section.id, {
        ...section,
        children: [],
        tasks: []
      });
    });
    
    // Добавляем задачи к соответствующим разделам
    allTasks.forEach(task => {
      const parentSection = sectionMap.get(task.parentSectionId);
      if (parentSection) {
        parentSection.tasks.push(task);
      }
    });
    
    // Строим дерево разделов
    const rootSections: any[] = [];
    allSections.forEach(section => {
      const sectionWithChildren = sectionMap.get(section.id);
      if (!section.parentId) {
        rootSections.push(sectionWithChildren);
      } else {
        const parent = sectionMap.get(section.parentId);
        if (parent) {
          parent.children.push(sectionWithChildren);
        }
      }
    });
    
    // Сортируем по orderNum
    const sortByOrder = (items: any[]) => {
      items.sort((a, b) => a.orderNum - b.orderNum);
      items.forEach(item => {
        if (item.children) sortByOrder(item.children);
        if (item.tasks) item.tasks.sort((a: any, b: any) => a.orderNum - b.orderNum);
      });
    };
    
    sortByOrder(rootSections);
    
    return {
      sections: rootSections,
      totalSections: allSections.length,
      totalTasks: allTasks.length,
    };
  }
}

export const storage = new DatabaseStorage();
