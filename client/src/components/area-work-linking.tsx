import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator,
  Link2,
  Settings,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  HelpCircle
} from "lucide-react";
import type { HierarchicalWorkStructure, AreaType, ProjectAreas } from "@shared/schema";
import { calculateProjectAreas, getAreaByType, suggestAreaType, formatArea } from "@/utils/areaCalculations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface AreaWorkLinkingProps {
  roomsData: any[]; // Room data from parameters table
  onAreaLinkingChange?: (taskId: string, config: AreaLinkConfig) => void;
}

interface AreaLinkConfig {
  areaType: AreaType;
  autoFillFromArea: boolean;
  areaMultiplier: number;
}

interface TaskWithAreaConfig {
  id: string;
  title: string;
  index: string;
  unit: string;
  costPrice: string;
  areaType?: AreaType;
  autoFillFromArea?: boolean;
  areaMultiplier?: number;
  suggestedAreaType?: AreaType;
  calculatedVolume?: number;
}

export function AreaWorkLinking({ roomsData, onAreaLinkingChange }: AreaWorkLinkingProps) {
  const [showOnlyLinked, setShowOnlyLinked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectAreas, setProjectAreas] = useState<ProjectAreas | null>(null);
  const [tasksWithConfig, setTasksWithConfig] = useState<TaskWithAreaConfig[]>([]);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithAreaConfig | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Загружаем иерархическую структуру работ
  const { data: hierarchy, isLoading } = useQuery<HierarchicalWorkStructure>({
    queryKey: ["/api/hierarchy"],
  });

  // Рассчитываем площади проекта при изменении данных помещений
  useEffect(() => {
    if (roomsData?.length > 0) {
      const areas = calculateProjectAreas(roomsData);
      setProjectAreas(areas);
    }
  }, [roomsData]);

  // Подготавливаем список работ с конфигурацией площадей
  useEffect(() => {
    if (hierarchy?.sections && projectAreas) {
      const allTasks: TaskWithAreaConfig[] = [];
      
      const collectTasks = (sections: any[]) => {
        sections.forEach(section => {
          section.tasks?.forEach((task: any) => {
            const suggestedType = suggestAreaType(task.title);
            const currentArea = getAreaByType(projectAreas, task.areaType || suggestedType);
            const multiplier = parseFloat(task.areaMultiplier || "1.0");
            
            allTasks.push({
              id: task.id,
              title: task.title,
              index: task.index || task.displayIndex,
              unit: task.unit,
              costPrice: task.costPrice,
              areaType: task.areaType || undefined,
              autoFillFromArea: task.autoFillFromArea || false,
              areaMultiplier: multiplier,
              suggestedAreaType: suggestedType,
              calculatedVolume: currentArea * multiplier
            });
          });
          
          if (section.children) {
            collectTasks(section.children);
          }
        });
      };
      
      collectTasks(hierarchy.sections);
      setTasksWithConfig(allTasks);
    }
  }, [hierarchy, projectAreas]);

  // Мутация для обновления конфигурации работы
  const updateTaskConfigMutation = useMutation({
    mutationFn: async ({ taskId, config }: { taskId: string; config: AreaLinkConfig }) => {
      const response = await fetch(`/api/hierarchy/tasks/${taskId}/area-config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy"] });
      
      // Обновляем локальное состояние
      setTasksWithConfig(prev => prev.map(task => 
        task.id === variables.taskId 
          ? { ...task, ...variables.config }
          : task
      ));
      
      toast({
        title: "Настройки сохранены",
        description: "Конфигурация привязки площадей обновлена",
      });
      
      onAreaLinkingChange?.(variables.taskId, variables.config);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
      console.error("Update error:", error);
    },
  });

  // Фильтрация работ
  const filteredTasks = tasksWithConfig.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.index.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = !showOnlyLinked || task.autoFillFromArea;
    
    return matchesSearch && matchesFilter;
  });

  // Статистика
  const linkedTasksCount = tasksWithConfig.filter(task => task.autoFillFromArea).length;
  const totalTasksCount = tasksWithConfig.length;

  const handleConfigureTask = (task: TaskWithAreaConfig) => {
    setSelectedTask(task);
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!selectedTask) return;
    
    const config: AreaLinkConfig = {
      areaType: selectedTask.areaType || "ручной",
      autoFillFromArea: selectedTask.autoFillFromArea || false,
      areaMultiplier: selectedTask.areaMultiplier || 1.0,
    };
    
    updateTaskConfigMutation.mutate({ taskId: selectedTask.id, config });
    setIsConfigDialogOpen(false);
  };

  const handleApplySuggestion = (task: TaskWithAreaConfig) => {
    if (!task.suggestedAreaType) return;
    
    const config: AreaLinkConfig = {
      areaType: task.suggestedAreaType,
      autoFillFromArea: true,
      areaMultiplier: 1.0,
    };
    
    updateTaskConfigMutation.mutate({ taskId: task.id, config });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-500">Загрузка структуры работ...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Привязка площадей к работам
              </CardTitle>
              <CardDescription>
                Автоматическое заполнение объемов работ на основе площадей помещений
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                Привязано: {linkedTasksCount} из {totalTasksCount}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        {projectAreas && (
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-gray-500">Пол</div>
                <div className="font-mono font-bold">{formatArea(projectAreas.totalFloorArea)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Потолок</div>
                <div className="font-mono font-bold">{formatArea(projectAreas.totalCeilingArea)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Стены</div>
                <div className="font-mono font-bold">{formatArea(projectAreas.totalWallArea)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Окна</div>
                <div className="font-mono font-bold">{formatArea(projectAreas.totalWindowArea)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Двери</div>
                <div className="font-mono font-bold">{formatArea(projectAreas.totalDoorArea)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Периметр</div>
                <div className="font-mono font-bold">{formatArea(projectAreas.totalPerimeter, "м.п.")}</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Фильтры и поиск */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск работ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showOnlyLinked}
                onCheckedChange={setShowOnlyLinked}
              />
              <Label>Только привязанные</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список работ */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  task.autoFillFromArea ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-gray-500">{task.index}</span>
                    <span className="font-medium">{task.title}</span>
                    {task.autoFillFromArea && (
                      <Badge variant="outline" className="text-xs">
                        {task.areaType}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {task.unit} • ₽{parseFloat(task.costPrice).toFixed(2)}
                    {task.autoFillFromArea && task.calculatedVolume !== undefined && (
                      <span className="ml-2 font-mono">
                        → {task.calculatedVolume.toFixed(2)} {task.unit}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {task.suggestedAreaType && task.suggestedAreaType !== "ручной" && !task.autoFillFromArea && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplySuggestion(task)}
                      className="text-xs"
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Авто: {task.suggestedAreaType}
                    </Button>
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
            ))}
            
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Настройка привязки площадей</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Работа</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{selectedTask.index} {selectedTask.title}</div>
                  <div className="text-gray-500">{selectedTask.unit} • ₽{parseFloat(selectedTask.costPrice).toFixed(2)}</div>
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
                  <>
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
                  </>
                )}
              </div>
              
              <Separator />
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsConfigDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveConfig}>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}