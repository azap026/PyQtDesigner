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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mt-6">
      <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-200">Сводная таблица габаритов</h3>
      
      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="w-full border-collapse border border-gray-400 dark:border-gray-500 text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700">
              <th className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-200 min-w-[250px]">
                Показатель
              </th>
              <th className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-200 min-w-[150px]">
                Значение
              </th>
              <th className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-200 min-w-[100px]">
                Ед. изм.
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800">
                Площадь потолка
              </td>
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200 bg-yellow-50 dark:bg-yellow-900/20">
                {calculateTotalCeilingArea().toFixed(2)}
              </td>
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800">
                м²
              </td>
            </tr>
            
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800">
                Периметр
              </td>
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200 bg-yellow-50 dark:bg-yellow-900/20">
                {calculateTotalPerimeter().toFixed(2)}
              </td>
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800">
                м
              </td>
            </tr>
            
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800">
                Площадь стен
              </td>
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200 bg-yellow-50 dark:bg-yellow-900/20">
                {calculateTotalWallArea().toFixed(2)}
              </td>
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800">
                м²
              </td>
            </tr>
            
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800">
                Площадь пола
              </td>
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center font-medium text-gray-800 dark:text-gray-200 bg-yellow-50 dark:bg-yellow-900/20">
                {calculateTotalFloorArea().toFixed(2)}
              </td>
              <td className="border border-gray-400 dark:border-gray-500 px-4 py-3 text-center text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800">
                м²
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Примечание */}
      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-green-200 dark:border-gray-500 shadow-sm">
        <p className="text-xs text-gray-700 dark:text-gray-300">
          <strong className="font-semibold">Примечание:</strong> Все значения рассчитываются автоматически на основе данных из таблицы габаритов помещений.
          Площадь стен учитывает вычет проемов (окна и порталы).
        </p>
      </div>
    </div>
  );
}