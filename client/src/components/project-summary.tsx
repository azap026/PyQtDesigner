import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import type { ProjectWithWorkItems } from "@shared/schema";

interface ProjectSummaryProps {
  project: ProjectWithWorkItems | null;
  onGenerateReport: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export function ProjectSummary({
  project,
  onGenerateReport,
  onExportPDF,
  onExportExcel,
}: ProjectSummaryProps) {
  if (!project) {
    return (
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Проект не выбран
        </div>
      </div>
    );
  }

  // Calculate totals
  const worksCost = project.workItems.reduce((total, item) => {
    return total + ((parseFloat(item.volume || "0")) * (parseFloat(item.pricePerUnit || "0")));
  }, 0);

  const materialsCost = project.workItems.reduce((total, workItem) => {
    return total + workItem.workMaterials.reduce((materialTotal, workMaterial) => {
      const quantity = (parseFloat(workItem.volume || "0")) * (parseFloat(workMaterial.consumptionNorm || "0"));
      return materialTotal + (quantity * (parseFloat(workMaterial.material.pricePerUnit || "0")));
    }, 0);
  }, 0);

  const totalCost = worksCost + materialsCost;

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Проект</div>
            <div className="font-bold text-lg">{project.name}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Работы</div>
            <div className="font-bold text-lg text-primary">
              ₽ {worksCost.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Материалы</div>
            <div className="font-bold text-lg text-secondary">
              ₽ {materialsCost.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Итого</div>
            <div className="font-bold text-xl text-success">
              ₽ {totalCost.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400">Последнее изменение</div>
            <div className="text-sm">
              {new Date(project.updatedAt).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={onGenerateReport}
              className="bg-success hover:bg-green-600 text-white flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Смета</span>
            </Button>
            <Button
              onClick={onExportPDF}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>PDF</span>
            </Button>
            <Button
              onClick={onExportExcel}
              className="bg-green-500 hover:bg-green-600 text-white flex items-center space-x-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
