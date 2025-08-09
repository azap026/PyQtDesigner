import React from 'react';

interface RoomData {
  length: number;
  height: number;
  floorArea: number;
  window1_a: number;
  window1_b: number;
  window2_a: number;
  window2_b: number;
  window3_a: number;
  window3_b: number;
  portal_a: number;
  portal_b: number;
  doors: number;
}

interface SummaryTableProps {
  roomsData: RoomData[];
}

export function SummaryTable({ roomsData }: SummaryTableProps) {
  // Рассчитываем суммарные значения
  const calculateTotalPerimeter = () => {
    return roomsData.reduce((sum, room) => sum + (room.length || 0), 0);
  };

  const calculateTotalCeilingArea = () => {
    return roomsData.reduce((sum, room) => sum + (room.floorArea || 0), 0);
  };

  const calculateTotalWallArea = () => {
    return roomsData.reduce((sum, room) => {
      const perimeter = room.length || 0;
      const height = room.height || 0;
      const openings = 
        (room.window1_a || 0) * (room.window1_b || 0) +
        (room.window2_a || 0) * (room.window2_b || 0) +
        (room.window3_a || 0) * (room.window3_b || 0) +
        (room.portal_a || 0) * (room.portal_b || 0);
      
      return sum + (perimeter * height - openings);
    }, 0);
  };

  const calculateTotalFloorArea = () => {
    return roomsData.reduce((sum, room) => sum + (room.floorArea || 0), 0);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-200 dark:border-gray-600 p-6 shadow-lg">
      <div className="flex items-center mb-6">
        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Сводка по объекту</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Площадь потолка */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Площадь потолка</span>
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {calculateTotalCeilingArea().toFixed(2)}
            </span>
            <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">м²</span>
          </div>
        </div>

        {/* Периметр */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Периметр</span>
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {calculateTotalPerimeter().toFixed(2)}
            </span>
            <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">м</span>
          </div>
        </div>

        {/* Площадь стен */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Площадь стен</span>
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {calculateTotalWallArea().toFixed(2)}
            </span>
            <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">м²</span>
          </div>
        </div>

        {/* Площадь пола */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Площадь пола</span>
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {calculateTotalFloorArea().toFixed(2)}
            </span>
            <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">м²</span>
          </div>
        </div>
      </div>
      
      {/* Примечание */}
      <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
        <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start">
          <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            <strong className="font-semibold">Автоматический расчет:</strong> Значения обновляются в реальном времени при изменении данных в таблице габаритов.
          </span>
        </p>
      </div>
    </div>
  );
}