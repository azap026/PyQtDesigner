import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  TreePine,
  Folder,
  FileText
} from "lucide-react";
import type { HierarchicalWorkStructure } from "@shared/schema";

export function HierarchyDatabase() {
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: hierarchy, isLoading } = useQuery<HierarchicalWorkStructure>({
    queryKey: ["/api/hierarchy"],
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/hierarchy/import", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy"] });
      toast({
        title: "Импорт завершен",
        description: `Импортировано: ${result.imported.sections} разделов, ${result.imported.tasks} работ${result.errors?.length ? `. Ошибок: ${result.errors.length}` : ""}`,
        variant: result.errors?.length ? "destructive" : "default",
      });
      
      if (result.errors?.length > 0) {
        console.error("Import errors:", result.errors);
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка импорта",
        description: "Не удалось импортировать иерархическую структуру",
        variant: "destructive",
      });
      console.error("Import error:", error);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/hierarchy/clear", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy"] });
      toast({
        title: "База очищена",
        description: "Иерархическая структура успешно очищена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось очистить базу данных",
        variant: "destructive",
      });
      console.error("Clear error:", error);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    window.open("/api/hierarchy/template", "_blank");
  };

  const handleClearDatabase = () => {
    if (window.confirm("Вы уверены, что хотите очистить всю иерархическую структуру? Это действие нельзя отменить.")) {
      clearMutation.mutate();
    }
  };

  const renderSection = (section: any, level: number = 0) => {
    const indent = level * 20;
    return (
      <div key={section.id} className="space-y-2">
        <div 
          className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
          style={{ marginLeft: `${indent}px` }}
        >
          <Folder className="h-4 w-4 text-blue-500 mr-2" />
          <span className="font-medium text-blue-700 dark:text-blue-300 mr-2">
            {section.displayIndex}
          </span>
          <span className="text-sm">{section.title}</span>
        </div>
        
        {/* Подразделы */}
        {section.children?.map((child: any) => renderSection(child, level + 1))}
        
        {/* Работы */}
        {section.tasks?.map((task: any) => (
          <div 
            key={task.id}
            className="flex items-center p-2 rounded bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600"
            style={{ marginLeft: `${(level + 1) * 20}px` }}
          >
            <FileText className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 mr-2">
              {task.displayIndex}
            </span>
            <span className="text-sm flex-1">{task.title}</span>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Badge variant="outline">{task.unit}</Badge>
              {task.costPrice && (
                <span>Себест.: {task.costPrice} ₽</span>
              )}
              <span className="font-medium">Цена: {task.price} ₽</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const filteredSections = hierarchy?.sections?.filter(section => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(query) ||
      section.displayIndex.toLowerCase().includes(query) ||
      section.children?.some((child: any) => 
        child.title.toLowerCase().includes(query) ||
        child.displayIndex.toLowerCase().includes(query) ||
        child.tasks?.some((task: any) =>
          task.title.toLowerCase().includes(query) ||
          task.displayIndex.toLowerCase().includes(query)
        )
      ) ||
      section.tasks?.some((task: any) => 
        task.title.toLowerCase().includes(query) ||
        task.displayIndex.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Иерархическая структура работ
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Управление разделами, подразделами и работами
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <TreePine className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего разделов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy?.totalSections || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего работ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy?.totalTasks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Корневых разделов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy?.sections?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Управление данными */}
      <Card>
        <CardHeader>
          <CardTitle>Управление данными</CardTitle>
          <CardDescription>
            Импорт иерархической структуры из Excel файла
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>
                {importMutation.isPending ? "Импорт..." : "Импорт из Excel"}
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Скачать шаблон</span>
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={handleClearDatabase}
              disabled={clearMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>
                {clearMutation.isPending ? "Очистка..." : "Очистить базу"}
              </span>
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Поиск */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск и просмотр</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск по названию или шифру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Иерархическая структура */}
      <Card>
        <CardHeader>
          <CardTitle>Структура работ</CardTitle>
          <CardDescription>
            Показано {filteredSections?.length || 0} из {hierarchy?.sections?.length || 0} корневых разделов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Загрузка структуры...</div>
            </div>
          ) : !hierarchy?.sections?.length ? (
            <div className="text-center py-8">
              <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <div className="text-gray-500 mb-2">Иерархическая структура пуста</div>
              <div className="text-sm text-gray-400">
                Импортируйте данные из Excel файла для начала работы
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredSections?.map(section => renderSection(section))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}