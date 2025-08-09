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
  FileText,
  Edit2,
  Check,
  X,
  Calculator,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { HierarchicalWorkStructure } from "@shared/schema";

export function HierarchyDatabase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isCoeffDialogOpen, setIsCoeffDialogOpen] = useState(false);
  const [coefficient, setCoefficient] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{id: string, title: string, displayIndex: string, type: 'section' | 'task'}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, costPrice }: { taskId: string; costPrice: string }) => {
      const response = await fetch(`/api/hierarchy/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ costPrice }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy"] });
      setEditingTask(null);
      setEditValue("");
      toast({
        title: "Обновлено",
        description: "Себестоимость успешно обновлена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить себестоимость",
        variant: "destructive",
      });
      console.error("Update error:", error);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (coefficient: number) => {
      const response = await fetch("/api/hierarchy/bulk-update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coefficient }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy"] });
      setIsCoeffDialogOpen(false);
      setCoefficient("");
      toast({
        title: "Массовое обновление завершено",
        description: `Обновлено ${result.updated} работ`,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить массовое обновление",
        variant: "destructive",
      });
      console.error("Bulk update error:", error);
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

  const handleEditTask = (taskId: string, currentPrice: string) => {
    setEditingTask(taskId);
    setEditValue(currentPrice);
  };

  const handleSaveTask = (taskId: string) => {
    if (editValue.trim() === "") {
      toast({
        title: "Ошибка",
        description: "Себестоимость не может быть пустой",
        variant: "destructive",
      });
      return;
    }
    updateTaskMutation.mutate({ taskId, costPrice: editValue });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditValue("");
  };

  const handleBulkUpdate = () => {
    const coeffValue = parseFloat(coefficient);
    if (isNaN(coeffValue) || coeffValue <= 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректный коэффициент (число больше 0)",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm(`Применить коэффициент ${coeffValue}% ко всем работам? Это действие нельзя отменить.`)) {
      bulkUpdateMutation.mutate(coeffValue);
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setCollapsedSections(new Set());
  };

  const collapseAll = () => {
    if (!hierarchy?.sections) return;
    const allSectionIds = new Set<string>();
    
    const collectIds = (sections: any[]) => {
      sections.forEach(section => {
        allSectionIds.add(section.id);
        if (section.children) collectIds(section.children);
      });
    };
    
    collectIds(hierarchy.sections);
    setCollapsedSections(allSectionIds);
  };

  const generateSearchSuggestions = (query: string) => {
    if (!hierarchy?.sections || query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const suggestions: Array<{id: string, title: string, displayIndex: string, type: 'section' | 'task'}> = [];
    const lowerQuery = query.toLowerCase();

    const collectSuggestions = (sections: any[]) => {
      sections.forEach(section => {
        // Добавляем разделы
        if (section.title.toLowerCase().includes(lowerQuery) || section.displayIndex.toLowerCase().includes(lowerQuery)) {
          suggestions.push({
            id: section.id,
            title: section.title,
            displayIndex: section.displayIndex,
            type: 'section'
          });
        }

        // Добавляем работы
        section.tasks?.forEach((task: any) => {
          if (task.title.toLowerCase().includes(lowerQuery) || task.displayIndex.toLowerCase().includes(lowerQuery)) {
            suggestions.push({
              id: task.id,
              title: task.title,
              displayIndex: task.displayIndex,
              type: 'task'
            });
          }
        });

        // Рекурсивно обрабатываем подразделы
        if (section.children) collectSuggestions(section.children);
      });
    };

    collectSuggestions(hierarchy.sections);
    setSearchSuggestions(suggestions.slice(0, 10)); // Ограничиваем количество подсказок
    setShowSuggestions(true);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    generateSearchSuggestions(value);
  };

  const handleSuggestionClick = (suggestion: {id: string, title: string, displayIndex: string, type: 'section' | 'task'}) => {
    setSearchQuery(suggestion.displayIndex + " " + suggestion.title);
    setShowSuggestions(false);
    
    // Подсвечиваем выбранный элемент
    setHighlightedTask(suggestion.id);
    setTimeout(() => setHighlightedTask(null), 3000); // Убираем подсветку через 3 секунды
    
    // Разворачиваем все разделы для показа найденного элемента
    if (suggestion.type === 'task') {
      expandAll();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    // При нажатии Enter фильтруем по ключевому слову
    // Логика фильтрации уже работает через filteredSections
  };

  const renderSection = (section: any, level: number = 0) => {
    const indent = level * 20;
    const isCollapsed = collapsedSections.has(section.id);
    const hasChildren = (section.children && section.children.length > 0) || (section.tasks && section.tasks.length > 0);
    
    return (
      <div key={section.id} className="space-y-2">
        <div 
          className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          style={{ marginLeft: `${indent}px` }}
          onClick={() => hasChildren && toggleSection(section.id)}
        >
          {hasChildren ? (
            isCollapsed ? (
              <Plus className="h-4 w-4 text-gray-500 mr-2" />
            ) : (
              <Minus className="h-4 w-4 text-gray-500 mr-2" />
            )
          ) : (
            <div className="w-4 h-4 mr-2" /> // Пустое место для выравнивания
          )}
          <Folder className="h-4 w-4 text-blue-500 mr-2" />
          <span className="font-medium text-blue-700 dark:text-blue-300 mr-2">
            {section.displayIndex}
          </span>
          <span className="text-sm">{section.title}</span>
          {hasChildren && (
            <span className="ml-auto text-xs text-gray-500">
              {isCollapsed ? 'Свернуто' : 'Развернуто'}
            </span>
          )}
        </div>
        
        {/* Показываем содержимое только если раздел развернут */}
        {!isCollapsed && (
          <>
            {/* Подразделы */}
            {section.children?.map((child: any) => renderSection(child, level + 1))}
            
            {/* Работы */}
            {section.tasks?.map((task: any) => (
              <div 
                key={task.id}
                className={`flex items-center p-2 rounded border transition-all duration-500 ${
                  highlightedTask === task.id 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 shadow-md' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-600'
                }`}
                style={{ marginLeft: `${(level + 1) * 20}px` }}
              >
                <FileText className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm font-mono text-gray-600 dark:text-gray-400 mr-2">
                  {task.displayIndex}
                </span>
                <span className="text-sm flex-1">{task.title}</span>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Badge variant="outline">{task.unit}</Badge>
                  {editingTask === task.id ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 h-6 text-xs"
                        placeholder="0.00"
                      />
                      <span className="text-xs">₽</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleSaveTask(task.id)}
                        disabled={updateTaskMutation.isPending}
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">
                        {task.costPrice ? `${task.costPrice} ₽` : "Не указана"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEditTask(task.id, task.costPrice || "")}
                      >
                        <Edit2 className="h-3 w-3 text-gray-400 hover:text-blue-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
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
            <div className="text-2xl font-bold text-blue-600">{
              (() => {
                if (!hierarchy?.sections) return 0;
                // Подсчитываем все разделы (включая корневые и подразделы)
                const allSectionsCount = hierarchy.sections.reduce((total, section) => {
                  let count = 1; // сам раздел
                  const countChildren = (children) => {
                    if (!children || !Array.isArray(children)) return 0;
                    return children.reduce((childTotal, child) => {
                      return childTotal + 1 + countChildren(child.children);
                    }, 0);
                  };
                  count += countChildren(section.children);
                  return total + count;
                }, 0);
                return allSectionsCount;
              })()
            }</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего подразделов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{
              (() => {
                if (!hierarchy?.sections) return 0;
                // Подсчитываем только подразделы (дочерние элементы)
                const countSubsections = (sections) => {
                  if (!sections || !Array.isArray(sections)) return 0;
                  return sections.reduce((total, section) => {
                    const childrenCount = section.children ? section.children.length : 0;
                    const grandChildrenCount = countSubsections(section.children);
                    return total + childrenCount + grandChildrenCount;
                  }, 0);
                };
                return countSubsections(hierarchy.sections);
              })()
            }</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего работ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{hierarchy?.totalTasks || 0}</div>
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
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
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
            
            <Dialog open={isCoeffDialogOpen} onOpenChange={setIsCoeffDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="flex items-center space-x-2">
                  <Calculator className="h-4 w-4" />
                  <span>Коэффициент цен</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Массовое изменение себестоимости</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coefficient">Коэффициент изменения (%)</Label>
                    <Input
                      id="coefficient"
                      type="number"
                      step="0.1"
                      placeholder="Например: 110 для увеличения на 10%"
                      value={coefficient}
                      onChange={(e) => setCoefficient(e.target.value)}
                    />
                    <div className="text-sm text-gray-500">
                      <p>• 110% = увеличение на 10%</p>
                      <p>• 90% = уменьшение на 10%</p>
                      <p>• 150% = увеличение в 1.5 раза</p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCoeffDialogOpen(false)}
                    >
                      Отмена
                    </Button>
                    <Button 
                      onClick={handleBulkUpdate}
                      disabled={bulkUpdateMutation.isPending}
                    >
                      {bulkUpdateMutation.isPending ? "Применяю..." : "Применить"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
          <div className="relative">
            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Поиск по названию или шифру... (Enter для фильтрации)"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="flex-1"
              />
            </form>
            
            {/* Подсказки поиска */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.type}-${suggestion.id}`}
                    className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion.type === 'section' ? (
                      <Folder className="h-4 w-4 text-blue-500 mr-3" />
                    ) : (
                      <FileText className="h-4 w-4 text-green-500 mr-3" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {suggestion.displayIndex}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {suggestion.title}
                      </div>
                    </div>
                    <Badge variant={suggestion.type === 'section' ? 'secondary' : 'outline'} className="text-xs">
                      {suggestion.type === 'section' ? 'Раздел' : 'Работа'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Иерархическая структура */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Структура работ</CardTitle>
              <CardDescription>
                Показано {filteredSections?.length || 0} из {hierarchy?.sections?.length || 0} корневых разделов
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={expandAll}
                className="text-xs"
              >
                Развернуть все
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={collapseAll}
                className="text-xs"
              >
                Свернуть все
              </Button>
            </div>
          </div>
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
              <div className="text-sm text-gray-400 mb-4">
                Импортируйте данные из Excel файла для начала работы
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-left">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Важно:</strong> Прикрепленный файл содержит каталог материалов, а не иерархическую структуру работ. 
                  Скачайте шаблон для иерархической структуры, заполните его и импортируйте.
                </div>
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