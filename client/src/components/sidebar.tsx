import { Button } from "@/components/ui/button";
import { 
  Plus, 
  FolderOpen, 
  Save, 
  Hammer, 
  Package, 
  Calculator, 
  BarChart3,
  FileText,
  FileSpreadsheet,
  DollarSign,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

const navigationItems = [
  { id: "project-params", label: "Параметры объекта", icon: Settings },
  { id: "works", label: "Виды работ", icon: Hammer },
  { id: "materials", label: "Материалы", icon: Package },
  { id: "estimate", label: "Смета", icon: Calculator },
  { id: "reports", label: "Отчеты", icon: BarChart3 },
];

const settingsItems = [
  { id: "material-prices", label: "Цены на материалы", icon: DollarSign },
  { id: "hierarchy-db", label: "База работ", icon: Hammer },
];

export function Sidebar({
  activeTab,
  onTabChange,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportPDF,
  onExportExcel,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-4">
        {/* Project Actions */}
        <div className="space-y-2 mb-6">
          <Button
            onClick={onNewProject}
            className="w-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Новый проект</span>
          </Button>
          <Button
            onClick={onOpenProject}
            className="w-full flex items-center justify-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Открыть</span>
          </Button>
          <Button
            onClick={onSaveProject}
            className="w-full flex items-center justify-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
          >
            <Save className="h-4 w-4" />
            <span>Сохранить</span>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full px-3 py-2 rounded-md flex items-center space-x-3 text-sm font-medium transition-colors text-left",
                  isActive
                    ? "bg-yellow-400 text-black font-semibold shadow-md"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Настройки
          </h3>
          <nav className="space-y-1">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full px-3 py-2 rounded-md flex items-center space-x-3 text-sm font-medium transition-colors text-left",
                    isActive
                      ? "bg-yellow-400 text-black font-semibold shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Export Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Экспорт
          </h3>
          <div className="space-y-2">
            <Button
              onClick={onExportPDF}
              variant="ghost"
              className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="h-4 w-4 mr-3 text-red-500" />
              <span>Экспорт PDF</span>
            </Button>
            <Button
              onClick={onExportExcel}
              variant="ghost"
              className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileSpreadsheet className="h-4 w-4 mr-3 text-green-500" />
              <span>Экспорт Excel</span>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
