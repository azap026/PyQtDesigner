import { db } from "./db";
import { eq, like, and } from "drizzle-orm";
import { workItems, materials, workMaterials, tasks, sections } from "@shared/schema";
import type { WorkItem, Material } from "@shared/schema";

// Автоматическая привязка работ к материалам по номерам
export async function linkWorksToMaterials(projectId: string) {
  try {
    // Получаем все работы проекта
    const projectWorks = await db
      .select()
      .from(workItems)
      .where(eq(workItems.projectId, projectId));

    // Получаем иерархическую структуру
    const hierarchyTasks = await db
      .select({
        id: tasks.id,
        index: tasks.index,
        name: tasks.name,
        unit: tasks.unit,
        costPrice: tasks.costPrice,
        section: {
          id: sections.id,
          name: sections.name,
          index: sections.index
        }
      })
      .from(tasks)
      .leftJoin(sections, eq(tasks.sectionId, sections.id));

    const results = [];

    for (const work of projectWorks) {
      // Извлекаем номер работы из названия (например: "2.9", "2.10")
      const workCodeMatch = work.name.match(/^(\d+\.\d+)/);
      if (!workCodeMatch) continue;

      const workCode = workCodeMatch[1];

      // Находим соответствующую задачу в иерархии
      const matchingTask = hierarchyTasks.find(task => 
        task.index === workCode || task.name.includes(workCode)
      );

      if (matchingTask) {
        // Обновляем работу с информацией из иерархии
        await db
          .update(workItems)
          .set({
            workCode: workCode,
            sectionName: matchingTask.section?.name,
            hierarchyTaskId: matchingTask.id,
            costPrice: matchingTask.costPrice || work.costPrice
          })
          .where(eq(workItems.id, work.id));

        // Автоматически привязываем материалы по шаблону номера
        await linkMaterialsToWork(work.id, workCode);

        results.push({
          workId: work.id,
          workName: work.name,
          workCode: workCode,
          linkedTaskId: matchingTask.id,
          sectionName: matchingTask.section?.name
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error linking works to materials:", error);
    throw error;
  }
}

// Привязка материалов к работе по номеру
async function linkMaterialsToWork(workId: string, workCode: string) {
  try {
    // Удаляем существующие связи
    await db
      .delete(workMaterials)
      .where(eq(workMaterials.workItemId, workId));

    // Ищем материалы, которые содержат номер работы в названии
    // Например: материалы для работы "2.9" будут содержать "2.9" в названии
    const relatedMaterials = await db
      .select()
      .from(materials)
      .where(like(materials.name, `%${workCode}%`));

    // Также ищем материалы по типу работы (например, "мешок для мусора" для демонтажа)
    const workBaseName = await db
      .select()
      .from(workItems)
      .where(eq(workItems.id, workId));

    if (workBaseName.length === 0) return;

    const workName = workBaseName[0].name.toLowerCase();
    let additionalMaterials: any[] = [];

    // Логика поиска материалов по типу работы
    if (workName.includes("демонтаж") || workName.includes("расчистка")) {
      additionalMaterials = await db
        .select()
        .from(materials)
        .where(like(materials.name, "%мешок%"));
    }

    if (workName.includes("краск") || workName.includes("шпаклев")) {
      additionalMaterials = await db
        .select()
        .from(materials)
        .where(like(materials.name, "%чашка%"));
    }

    if (workName.includes("штукатур") || workName.includes("малярн")) {
      additionalMaterials = await db
        .select()
        .from(materials)
        .where(like(materials.name, "%шпатель%"));
    }

    // Объединяем найденные материалы
    const allMaterials = [...relatedMaterials, ...additionalMaterials];
    const uniqueMaterials = allMaterials.filter((material, index, self) => 
      index === self.findIndex(m => m.id === material.id)
    );

    // Создаем связи работа-материал
    for (const material of uniqueMaterials) {
      let consumptionNorm = "1.0"; // По умолчанию
      let consumptionUnit = "шт"; // По умолчанию

      // Устанавливаем норму расхода в зависимости от типа материала
      if (material.name.toLowerCase().includes("мешок")) {
        consumptionNorm = "0.1"; // 0.1 мешка на м²
        consumptionUnit = "шт/м²";
      } else if (material.name.toLowerCase().includes("чашка")) {
        consumptionNorm = "1.0";
        consumptionUnit = "шт";
      } else if (material.name.toLowerCase().includes("шпатель")) {
        consumptionNorm = "1.0";
        consumptionUnit = "шт";
      } else if (material.consumptionRate) {
        consumptionNorm = material.consumptionRate;
        consumptionUnit = material.consumptionUnit || "шт/м²";
      }

      await db
        .insert(workMaterials)
        .values({
          workItemId: workId,
          materialId: material.id,
          consumptionNorm: consumptionNorm,
          consumptionUnit: consumptionUnit
        })
        .onConflictDoNothing();
    }

    return uniqueMaterials.length;
  } catch (error) {
    console.error(`Error linking materials to work ${workId}:`, error);
    return 0;
  }
}

// Синхронизация работ с иерархической структурой
export async function syncWorksWithHierarchy(projectId: string) {
  try {
    // Получаем все задачи из иерархии
    const hierarchyTasks = await db
      .select({
        id: tasks.id,
        index: tasks.index,
        name: tasks.name,
        unit: tasks.unit,
        costPrice: tasks.costPrice,
        section: {
          id: sections.id,
          name: sections.name,
          index: sections.index
        }
      })
      .from(tasks)
      .leftJoin(sections, eq(tasks.sectionId, sections.id));

    const results = [];

    for (const task of hierarchyTasks) {
      if (!task.unit || !task.costPrice) continue; // Пропускаем заголовки разделов

      // Проверяем, есть ли уже такая работа в проекте
      const existingWork = await db
        .select()
        .from(workItems)
        .where(
          and(
            eq(workItems.projectId, projectId),
            eq(workItems.hierarchyTaskId, task.id)
          )
        );

      if (existingWork.length === 0) {
        // Создаем новую работу
        const [newWork] = await db
          .insert(workItems)
          .values({
            projectId: projectId,
            name: `${task.index} ${task.name}`,
            description: `Работа из иерархической структуры: ${task.section?.name}`,
            unit: task.unit,
            pricePerUnit: task.costPrice,
            costPrice: task.costPrice,
            workCode: task.index,
            sectionName: task.section?.name,
            hierarchyTaskId: task.id,
            volume: "0"
          })
          .returning();

        // Автоматически привязываем материалы
        await linkMaterialsToWork(newWork.id, task.index);

        results.push({
          action: "created",
          workId: newWork.id,
          workName: newWork.name,
          workCode: task.index
        });
      } else {
        // Обновляем существующую работу
        await db
          .update(workItems)
          .set({
            costPrice: task.costPrice,
            sectionName: task.section?.name
          })
          .where(eq(workItems.id, existingWork[0].id));

        results.push({
          action: "updated",
          workId: existingWork[0].id,
          workName: existingWork[0].name,
          workCode: task.index
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error syncing works with hierarchy:", error);
    throw error;
  }
}