import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  unit: text("unit").notNull(), // м², м³, шт, т, кг
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workItems = pgTable("work_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull(), // м², м³, шт, т, кг
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  volume: decimal("volume", { precision: 10, scale: 3 }).default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workMaterials = pgTable("work_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workItemId: varchar("work_item_id").notNull().references(() => workItems.id, { onDelete: "cascade" }),
  materialId: varchar("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  consumptionNorm: decimal("consumption_norm", { precision: 10, scale: 6 }).notNull(), // расход на единицу работы
  consumptionUnit: text("consumption_unit").notNull(), // единица расхода (шт/м³, м³/м², т/м³)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  workItems: many(workItems),
}));

export const workItemsRelations = relations(workItems, ({ one, many }) => ({
  project: one(projects, {
    fields: [workItems.projectId],
    references: [projects.id],
  }),
  workMaterials: many(workMaterials),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  workMaterials: many(workMaterials),
}));

export const workMaterialsRelations = relations(workMaterials, ({ one }) => ({
  workItem: one(workItems, {
    fields: [workMaterials.workItemId],
    references: [workItems.id],
  }),
  material: one(materials, {
    fields: [workMaterials.materialId],
    references: [materials.id],
  }),
}));

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkItemSchema = createInsertSchema(workItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkMaterialSchema = createInsertSchema(workMaterials).omit({
  id: true,
  createdAt: true,
});

// Types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type WorkItem = typeof workItems.$inferSelect;
export type InsertWorkItem = z.infer<typeof insertWorkItemSchema>;

export type WorkMaterial = typeof workMaterials.$inferSelect;
export type InsertWorkMaterial = z.infer<typeof insertWorkMaterialSchema>;

// Extended types with relations
export type ProjectWithWorkItems = Project & {
  workItems: (WorkItem & {
    workMaterials: (WorkMaterial & {
      material: Material;
    })[];
  })[];
};

export type WorkItemWithMaterials = WorkItem & {
  workMaterials: (WorkMaterial & {
    material: Material;
  })[];
};
