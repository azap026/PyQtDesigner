import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, Settings, Save, CheckCircle, Circle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Task, ProjectAreas, AreaType } from "@shared/schema";
import { getAreaByType, formatArea } from "@/utils/areaCalculations";

interface AreaWorkLinkingProps {
  projectAreas?: ProjectAreas;
}

export default function AreaWorkLinking({ projectAreas }: AreaWorkLinkingProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task & {
    autoFillFromArea?: boolean;
    areaType?: AreaType;
    areaMultiplier?: number;
  } | null>(null);

  const queryClient = useQueryClient();

  // Загрузка всех работ
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/hierarchy/tasks"],
  });

  // Загрузка настроек привязки площадей
  const { data: areaConfigs = [] } = useQuery<Array<{
    taskId: string;
    autoFillFromArea: boolean;
    areaType: AreaType;
    areaMultiplier: number;
  }>>({
    queryKey: ["/api/area-configs"],
  });

  // Сохранение настроек
  const saveConfigMutation = useMutation({
    mutationFn: async (config: {
      taskId: string;
      autoFillFromArea: boolean;
      areaType?: AreaType;
      areaMultiplier?: number;
    }) => {
      return apiRequest("/api/area-configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/area-configs"] });
      setIsConfigDialogOpen(false);
    },
  });

  // Фильтрация работ по поисковому запросу
  const filteredTasks = tasks.filter(task =>
    task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.index?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Получение конфигурации для задачи
  const getTaskConfig = (taskId: string) => {
    return areaConfigs.find(config => config.taskId === taskId);
  };

  // Обработка настройки задачи
  const handleConfigureTask = (task: Task) => {
    const config = getTaskConfig(task.id);
    setSelectedTask({
      ...task,
      autoFillFromArea: config?.autoFillFromArea || false,
      areaType: config?.areaType || "ручной",
      areaMultiplier: config?.areaMultiplier || 1.0,
    });
    setIsConfigDialogOpen(true);
  };

  // Сохранение конфигурации
  const handleSaveConfig = () => {
    if (!selectedTask) return;

    saveConfigMutation.mutate({
      taskId: selectedTask.id,
      autoFillFromArea: selectedTask.autoFillFromArea || false,
      areaType: selectedTask.areaType,
      areaMultiplier: selectedTask.areaMultiplier,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Привязка площадей к работам</CardTitle>
          <div className="text-sm text-gray-600">
            Автоматическое заполнение объемов работ на основе площадей помещений
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск работ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Список работ */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTasks.map((task) => {
              const config = getTaskConfig(task.id);
              const isConfigured = config?.autoFillFromArea;
              
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isConfigured ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-medium">{task.index}</span>
                      <span>{task.title}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {task.unit} • ₽{parseFloat(task.costPrice || "0").toFixed(2)}
                    </div>
                    {isConfigured && config && (
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {config.areaType}
                        </Badge>
                        {config.areaMultiplier !== 1.0 && (
                          <Badge variant="outline" className="text-xs">
                            ×{config.areaMultiplier}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isConfigured && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Привязано: {config?.areaType} ({config?.areaMultiplier || 1}×{config?.areaMultiplier || 1})
                      </Badge>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigureTask(task)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {filteredTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "Работы не найдены" : "Нет доступных работ"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Диалог настройки */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Настройка привязки площадей</DialogTitle>
            <DialogDescription>
              Настройте автоматическое заполнение объема работы на основе площадей помещений
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div>
                <Label className="text-sm font-medium text-gray-700">Работа</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{selectedTask.index} {selectedTask.title}</div>
                  <div className="text-gray-500">{selectedTask.unit} • ₽{parseFloat(selectedTask.costPrice || "0").toFixed(2)}</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedTask.autoFillFromArea || false}
                    onCheckedChange={(checked) => 
                      setSelectedTask(prev => prev ? { ...prev, autoFillFromArea: checked } : null)
                    }
                  />
                  <Label>Автоматически заполнять объем</Label>
                </div>
                
                {selectedTask.autoFillFromArea && (
                  <div className="space-y-3">
                    <div>
                      <Label>Тип площади</Label>
                      <Select
                        value={selectedTask.areaType || "ручной"}
                        onValueChange={(value) => 
                          setSelectedTask(prev => prev ? { ...prev, areaType: value as AreaType } : null)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="пол">Пол</SelectItem>
                          <SelectItem value="потолок">Потолок</SelectItem>
                          <SelectItem value="стены">Стены</SelectItem>
                          <SelectItem value="окна">Окна</SelectItem>
                          <SelectItem value="двери">Двери</SelectItem>
                          <SelectItem value="ручной">Ручной ввод</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Коэффициент (множитель)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={selectedTask.areaMultiplier || 1.0}
                        onChange={(e) => 
                          setSelectedTask(prev => prev ? { 
                            ...prev, 
                            areaMultiplier: parseFloat(e.target.value) || 1.0 
                          } : null)
                        }
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Для учета запаса материала или особенностей работы
                      </div>
                    </div>
                    
                    {projectAreas && selectedTask.areaType && selectedTask.areaType !== "ручной" && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          <div>Базовая площадь: {formatArea(getAreaByType(projectAreas, selectedTask.areaType))}</div>
                          <div className="font-medium">
                            Итоговый объем: {formatArea(getAreaByType(projectAreas, selectedTask.areaType) * (selectedTask.areaMultiplier || 1.0), selectedTask.unit)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
              
              {/* Кнопки всегда видны внизу */}
              <div className="flex-shrink-0 border-t pt-4 mt-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsConfigDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleSaveConfig}
                    disabled={saveConfigMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveConfigMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}