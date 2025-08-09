import { useState, useEffect } from "react";

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

interface RoomParametersTableProps {
  onDataChange?: (roomIndex: number, data: RoomData) => void;
}

export function RoomParametersTable({ onDataChange }: RoomParametersTableProps) {
  const [roomsData, setRoomsData] = useState<RoomData[]>(
    Array.from({ length: 12 }, () => ({
      length: 0,
      width: 0,
      height: 0,
      openings: 0,
      doors: 0,
      floorArea: 0,
      window1_a: 0,
      window1_b: 0,
      window2_a: 0,
      window2_b: 0,
      window3_a: 0,
      window3_b: 0,
      portal_a: 0,
      portal_b: 0,
    }))
  );

  // Вычисляемые поля
  const calculateWallArea = (room: RoomData): number => {
    if (!room.length || !room.height) return 0;
    const wallArea = room.length * room.height;
    const openings = calculateOpenings(room);
    return Math.max(0, wallArea - openings);
  };

  const calculateFloorArea = (room: RoomData): number => {
    if (!room.length) return 0;
    return room.length;
  };

  const calculatePerimeter = (room: RoomData): number => {
    if (!room.length) return 0;
    return room.length;
  };

  const calculateWindow1Area = (room: RoomData): number => {
    return (room.window1_a || 0) * (room.window1_b || 0);
  };

  const calculateWindow2Area = (room: RoomData): number => {
    return (room.window2_a || 0) * (room.window2_b || 0);
  };

  const calculateWindow3Area = (room: RoomData): number => {
    return (room.window3_a || 0) * (room.window3_b || 0);
  };

  const calculatePortalArea = (room: RoomData): number => {
    return (room.portal_a || 0) * (room.portal_b || 0);
  };

  const calculateOpenings = (room: RoomData): number => {
    const window1Area = calculateWindow1Area(room);
    const window2Area = calculateWindow2Area(room);
    const window3Area = calculateWindow3Area(room);
    const portalArea = calculatePortalArea(room);
    return window1Area + window2Area + window3Area + portalArea;
  };

  const calculateWindowSlopes = (room: RoomData): number => {
    const window1Area = calculateWindow1Area(room);
    const window2Area = calculateWindow2Area(room);
    const window3Area = calculateWindow3Area(room);
    return 2 * (window1Area + window2Area + window3Area);
  };

  const updateRoomData = (roomIndex: number, field: keyof RoomData, value: number) => {
    const newRoomsData = [...roomsData];
    newRoomsData[roomIndex] = {
      ...newRoomsData[roomIndex],
      [field]: value,
    };
    setRoomsData(newRoomsData);
    onDataChange?.(roomIndex, newRoomsData[roomIndex]);
  };

  const renderInputCell = (roomIndex: number, field: keyof RoomData, bgClass: string) => (
    <td className="border border-gray-400 dark:border-gray-500 p-0">
      <input
        type="number"
        step="0.01"
        value={roomsData[roomIndex][field] || ""}
        onChange={(e) => updateRoomData(roomIndex, field, parseFloat(e.target.value) || 0)}
        className={`w-full h-10 px-3 border-0 bg-transparent text-center text-sm font-medium text-gray-800 dark:text-gray-200 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${bgClass}`}
        placeholder="0.00"
      />
    </td>
  );

  const renderCalculatedCell = (value: number, bgClass: string) => (
    <td className={`border border-gray-400 dark:border-gray-500 px-3 py-2 text-center text-sm font-medium text-gray-800 dark:text-gray-200 ${bgClass}`}>
      <span className="inline-block min-w-[50px]">
        {value ? value.toFixed(2) : "0.00"}
      </span>
    </td>
  );

  const rows = [
    {
      label: "Периметр",
      bg: "bg-white dark:bg-gray-800",
      type: "input" as const,
      field: "length" as keyof RoomData,
    },
    {
      label: "Площадь стен",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      type: "calculated" as const,
      calculator: calculateWallArea,
    },
    {
      label: "Площадь пола",
      bg: "bg-white dark:bg-gray-800",
      type: "input" as const,
      field: "floorArea" as keyof RoomData,
    },
    {
      label: "Проемы",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      type: "calculated" as const,
      calculator: calculateOpenings,
    },
    {
      label: "Высота",
      bg: "bg-white dark:bg-gray-800",
      type: "input" as const,
      field: "height" as keyof RoomData,
    },
    {
      label: "Оконные/дверные откосы",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      type: "calculated" as const,
      calculator: calculateWindowSlopes,
    },
    {
      label: "Двери (кол-во) (шт)",
      bg: "bg-white dark:bg-gray-800",
      type: "input" as const,
      field: "doors" as keyof RoomData,
    },
    {
      label: "Окно 1: Длина/Высота, (м2)",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      type: "calculated" as const,
      calculator: calculateWindow1Area,
    },
    {
      label: "",
      bg: "bg-white dark:bg-gray-800",
      secondary: "L=",
      type: "input" as const,
      field: "window1_a" as keyof RoomData,
    },
    {
      label: "",
      bg: "bg-white dark:bg-gray-800",
      secondary: "H=",
      type: "input" as const,
      field: "window1_b" as keyof RoomData,
    },
    {
      label: "Окно 2: Длина/Высота, (м2)",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      type: "calculated" as const,
      calculator: calculateWindow2Area,
    },
    {
      label: "",
      bg: "bg-white dark:bg-gray-800",
      secondary: "L=",
      type: "input" as const,
      field: "window2_a" as keyof RoomData,
    },
    {
      label: "",
      bg: "bg-white dark:bg-gray-800",
      secondary: "H=",
      type: "input" as const,
      field: "window2_b" as keyof RoomData,
    },
    {
      label: "Окно 3: Длина/Высота, (м2)",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      type: "calculated" as const,
      calculator: calculateWindow3Area,
    },
    {
      label: "",
      bg: "bg-white dark:bg-gray-800",
      secondary: "L=",
      type: "input" as const,
      field: "window3_a" as keyof RoomData,
    },
    {
      label: "",
      bg: "bg-white dark:bg-gray-800",
      secondary: "H=",
      type: "input" as const,
      field: "window3_b" as keyof RoomData,
    },
    {
      label: "Портал: Длина/Высота, (м2)",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      type: "calculated" as const,
      calculator: calculatePortalArea,
    },
    {
      label: "",
      bg: "bg-white dark:bg-gray-800",
      secondary: "L=",
      type: "input" as const,
      field: "portal_a" as keyof RoomData,
    },
    {
      label: "",
      bg: "bg-white dark:bg-gray-800",
      secondary: "H=",
      type: "input" as const,
      field: "portal_b" as keyof RoomData,
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200">Габариты помещений</h3>
      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="w-full border-collapse border border-gray-400 dark:border-gray-500 text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
              <th className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-200 min-w-[200px]">
                Габариты
              </th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i} className="border border-gray-400 dark:border-gray-500 px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-200 min-w-[100px] text-xs">
                  {i < 9 ? `Помещение ${i + 1}` : `С/У${i - 8}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className={`border border-gray-400 dark:border-gray-500 px-4 py-2 ${row.bg} font-semibold text-right text-gray-800 dark:text-gray-200 text-sm min-w-[200px]`}>
                  <div className="flex flex-col">
                    <span className="leading-tight">{row.label}</span>
                    {row.secondary && <span className="text-center text-xs font-normal mt-1 text-gray-600 dark:text-gray-400">{row.secondary}</span>}
                  </div>
                </td>
                {Array.from({ length: 12 }, (_, colIndex) => {
                  if (row.type === "input" && row.field) {
                    return renderInputCell(colIndex, row.field, row.bg);
                  } else if (row.type === "calculated" && row.calculator) {
                    const value = row.calculator(roomsData[colIndex]);
                    return renderCalculatedCell(value, row.bg);
                  } else {
                    // Header or empty cells
                    return (
                      <td key={colIndex} className={`border border-gray-400 dark:border-gray-500 px-3 py-2 text-center ${row.bg}`}>
                        {/* Empty cell for headers */}
                      </td>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Формулы справка */}
      <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-blue-200 dark:border-gray-500 shadow-sm">
        <h4 className="font-bold mb-3 text-gray-800 dark:text-gray-200 text-sm">Автоматические расчеты:</h4>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-xs">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">•</span>
            <span><strong className="font-semibold">Площадь стен:</strong> Периметр × Высота - Проемы</span>
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            <span><strong className="font-semibold">Площадь пола:</strong> Ручной ввод</span>
          </li>
          <li className="flex items-start">
            <span className="text-orange-500 mr-2">•</span>
            <span><strong className="font-semibold">Проемы:</strong> Окно 1 + Окно 2 + Окно 3 + Портал</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span><strong className="font-semibold">Оконные/дверные откосы:</strong> 2 × (Сумма площадей всех окон)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}