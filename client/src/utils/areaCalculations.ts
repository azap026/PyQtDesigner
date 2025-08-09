import type { ProjectAreas, RoomAreas, AreaType } from "@shared/schema";

interface RoomData {
  length: number;
  width: number;
  height: number;
  openings: number;
  doors: number;
  floorArea: number;
  window1_a: number;
  window1_b: number;
  window2_a: number;
  window2_b: number;
  window3_a: number;
  window3_b: number;
  portal_a: number;
  portal_b: number;
}

/**
 * Рассчитывает площади для одного помещения
 */
export function calculateRoomAreas(room: RoomData): RoomAreas {
  const windowArea = 
    (room.window1_a || 0) * (room.window1_b || 0) +
    (room.window2_a || 0) * (room.window2_b || 0) +
    (room.window3_a || 0) * (room.window3_b || 0);
  
  const doorArea = (room.portal_a || 0) * (room.portal_b || 0);
  const allOpenings = windowArea + doorArea;
  
  const perimeter = room.length || 0;
  const height = room.height || 0;
  const wallAreaGross = perimeter * height;
  const wallAreaNet = Math.max(0, wallAreaGross - allOpenings);
  
  return {
    floorArea: room.floorArea || 0,
    ceilingArea: room.floorArea || 0, // Площадь потолка = площадь пола
    wallArea: wallAreaNet,
    windowArea,
    doorArea,
    perimeter
  };
}

/**
 * Рассчитывает общие площади проекта
 */
export function calculateProjectAreas(roomsData: RoomData[]): ProjectAreas {
  const roomsAreas = roomsData.map(calculateRoomAreas);
  
  const totals = roomsAreas.reduce(
    (acc, room) => ({
      totalFloorArea: acc.totalFloorArea + room.floorArea,
      totalCeilingArea: acc.totalCeilingArea + room.ceilingArea,
      totalWallArea: acc.totalWallArea + room.wallArea,
      totalWindowArea: acc.totalWindowArea + room.windowArea,
      totalDoorArea: acc.totalDoorArea + room.doorArea,
      totalPerimeter: acc.totalPerimeter + room.perimeter,
    }),
    {
      totalFloorArea: 0,
      totalCeilingArea: 0,
      totalWallArea: 0,
      totalWindowArea: 0,
      totalDoorArea: 0,
      totalPerimeter: 0,
    }
  );
  
  return {
    ...totals,
    roomsData: roomsAreas
  };
}

/**
 * Получает площадь по типу из проекта
 */
export function getAreaByType(areas: ProjectAreas, areaType: AreaType): number {
  switch (areaType) {
    case "пол":
      return areas.totalFloorArea;
    case "потолок":
      return areas.totalCeilingArea;
    case "стены":
      return areas.totalWallArea;
    case "окна":
      return areas.totalWindowArea;
    case "двери":
      return areas.totalDoorArea;
    case "ручной":
    default:
      return 0;
  }
}

/**
 * Автоматически определяет тип площади по названию работы
 */
export function suggestAreaType(workTitle: string): AreaType {
  const title = workTitle.toLowerCase();
  
  // Полы
  if (title.includes("пол") || title.includes("стяжка") || title.includes("покрытие пол") || 
      title.includes("плинтус") || title.includes("ламинат") || title.includes("паркет") ||
      title.includes("линолеум") || title.includes("керамогранит пол")) {
    return "пол";
  }
  
  // Потолки
  if (title.includes("потолок") || title.includes("подвесн") || title.includes("натяжн") ||
      title.includes("покраска потолк") || title.includes("штукатурка потолк") ||
      title.includes("шпаклевка потолк") || title.includes("грунтовка потолк")) {
    return "потолок";
  }
  
  // Стены
  if (title.includes("стен") || title.includes("штукатурка") || title.includes("шпаклевка") ||
      title.includes("обои") || title.includes("покраска стен") || title.includes("кирпич") ||
      title.includes("блок") || title.includes("перегородк") || title.includes("кладка")) {
    return "стены";
  }
  
  // Окна
  if (title.includes("окн") || title.includes("откос") || title.includes("подоконник") ||
      title.includes("рама") || title.includes("стеклопакет")) {
    return "окна";
  }
  
  // Двери
  if (title.includes("двер") || title.includes("короб") || title.includes("наличник") ||
      title.includes("замок") || title.includes("ручка двер")) {
    return "двери";
  }
  
  return "ручной";
}

/**
 * Форматирует площадь для отображения
 */
export function formatArea(area: number, unit: string = "м²"): string {
  return `${area.toFixed(2)} ${unit}`;
}