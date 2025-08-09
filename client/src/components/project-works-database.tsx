import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  Calculator,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithWorkItems, WorkItem, InsertWorkItem } from "@shared/schema";

interface ProjectWorksDatabaseProps {
  projectId: string;
}

export function ProjectWorksDatabase({ projectId }: ProjectWorksDatabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [newWork, setNewWork] = useState({
    name: "",
    unit: "",
    costPrice: "",
    volume: "",
    description: "",
    sectionName: "",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Загружаем проект с работами
  const { data: project, isLoading } = useQuery<ProjectWithWorkItems>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Загружаем иерархическую структуру для синхронизации
  const { data: hierarchy } = useQuery({
    queryKey: ["/api/hierarchy"],
  });

  // Мутация для создания работы
  const createWorkMutation = useMutation({
    mutationFn: async (workData: InsertWorkItem) => {
      return apiRequest("POST", `/api/projects/${projectId}/work-items`, workData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Работа добавлена",
        description: "Новая работа успешно добавлена в проект",
      });
    },
  });

  // Мутация для обновления работы
  const updateWorkMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<WorkItem>) => {
      return apiRequest("PATCH", `/api/work-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setEditingWork(null);
      resetForm();
      toast({
        title: "Работа обновлена",
        description: "Изменения успешно сохранены",
      });
    },
  });

  // Мутация для удаления работы
  const deleteWorkMutation = useMutation({
    mutationFn: async (workId: string) => {
      return apiRequest("DELETE", `/api/work-items/${workId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Работа удалена",
        description: "Работа успешно удалена из проекта",
      });
    },
  });

  // Мутация для синхронизации с базой работ
  const syncWithHierarchyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${projectId}/sync-hierarchy`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Синхронизация завершена",
        description: `Добавлено работ: ${(data as any).syncedWorks}`,
      });
    },
  });

  const resetForm = () => {
    setNewWork({
      name: "",
      unit: "",
      costPrice: "",
      volume: "",
      description: "",
      sectionName: "",
    });
  };

  // Получаем все разделы для фильтрации
  const sections = useMemo(() => {
    if (!project?.workItems) return [];
    const sectionSet = new Set(
      project.workItems
        .map(work => work.sectionName || "Без раздела")
        .filter(Boolean)
    );
    return Array.from(sectionSet).sort();
  }, [project?.workItems]);

  // Фильтрация работ
  const filteredWorks = useMemo(() => {
    if (!project?.workItems) return [];

    return project.workItems.filter((work) => {
      const matchesSearch = work.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        work.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (work.sectionName || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSection = selectedSection === "all" || 
        (work.sectionName || "Без раздела") === selectedSection;

      return matchesSearch && matchesSection;
    });
  }, [project?.workItems, searchTerm, selectedSection]);

  // Подсчет общей стоимости
  const totalCost = useMemo(() => {
    return filteredWorks.reduce((total, work) => {
      const volume = parseFloat(work.volume || "0");
      const pricePerUnit = parseFloat(work.pricePerUnit || "0");
      return total + (volume * pricePerUnit);
    }, 0);
  }, [filteredWorks]);

  const handleAddWork = () => {
    if (!newWork.name.trim() || !newWork.unit.trim() || !newWork.costPrice) {
      toast({
        title: "Заполните обязательные поля",
        description: "Название, единица измерения и цена обязательны",
        variant: "destructive",
      });
      return;
    }

    const workData: InsertWorkItem = {
      projectId: projectId,
      name: newWork.name.trim(),
      unit: newWork.unit.trim(),
      pricePerUnit: newWork.costPrice,
      costPrice: newWork.costPrice,
      volume: newWork.volume || "0",
      description: newWork.description.trim() || null,
      sectionName: newWork.sectionName.trim() || null,
      workCode: null,
      hierarchyTaskId: null,
    };

    createWorkMutation.mutate(workData);
  };

  const handleEditWork = (work: WorkItem) => {
    setEditingWork(work);
    setNewWork({
      name: work.name,
      unit: work.unit,
      costPrice: work.costPrice || work.pricePerUnit || "",
      volume: work.volume || "",
      description: work.description || "",
      sectionName: work.sectionName || "",
    });
  };

  const handleUpdateWork = () => {
    if (!editingWork || !newWork.name.trim() || !newWork.unit.trim() || !newWork.costPrice) {
      toast({
        title: "Заполните обязательные поля",
        description: "Название, единица измерения и цена обязательны",
        variant: "destructive",
      });
      return;
    }

    updateWorkMutation.mutate({
      id: editingWork.id,
      name: newWork.name.trim(),
      unit: newWork.unit.trim(),
      pricePerUnit: newWork.costPrice,
      costPrice: newWork.costPrice,
      volume: newWork.volume || "0",
      description: newWork.description.trim() || null,
      sectionName: newWork.sectionName.trim() || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Загрузка работ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Виды работ в проекте
              </CardTitle>
              <CardDescription>
                Управление видами работ с количеством и суммами для текущего проекта
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => syncWithHierarchyMutation.mutate()}
                disabled={syncWithHierarchyMutation.isPending}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Синхронизировать с базой
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить работу
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Добавить новую работу</DialogTitle>
                    <DialogDescription>
                      Заполните информацию о новом виде работы
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название работы *</Label>
                      <Input
                        id="name"
                        value={newWork.name}
                        onChange={(e) => setNewWork({ ...newWork, name: e.target.value })}
                        placeholder="Например: Демонтаж перегородок"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sectionName">Раздел</Label>
                      <Input
                        id="sectionName"
                        value={newWork.sectionName}
                        onChange={(e) => setNewWork({ ...newWork, sectionName: e.target.value })}
                        placeholder="Например: Демонтажные работы"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="unit">Ед. измерения *</Label>
                        <Input
                          id="unit"
                          value={newWork.unit}
                          onChange={(e) => setNewWork({ ...newWork, unit: e.target.value })}
                          placeholder="м², шт, кг"
                        />
                      </div>
                      <div>
                        <Label htmlFor="costPrice">Цена за единицу *</Label>
                        <Input
                          id="costPrice"
                          type="number"
                          step="0.01"
                          value={newWork.costPrice}
                          onChange={(e) => setNewWork({ ...newWork, costPrice: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="volume">Количество</Label>
                      <Input
                        id="volume"
                        type="number"
                        step="0.01"
                        value={newWork.volume}
                        onChange={(e) => setNewWork({ ...newWork, volume: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Input
                        id="description"
                        value={newWork.description}
                        onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                        placeholder="Дополнительная информация о работе"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleAddWork}
                      disabled={createWorkMutation.isPending}
                    >
                      Добавить
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Поиск и фильтры */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск работ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Выберите раздел" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все разделы</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredWorks.length}
                </div>
                <p className="text-sm text-gray-600">Всего работ</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {filteredWorks.reduce((total, work) => total + parseFloat(work.volume || "0"), 0).toFixed(2)}
                </div>
                <p className="text-sm text-gray-600">Общий объем</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  ₽ {totalCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-gray-600">Общая стоимость</p>
              </CardContent>
            </Card>
          </div>

          {/* Таблица работ */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900">
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>Название работы</TableHead>
                  <TableHead>Раздел</TableHead>
                  <TableHead className="text-center">Ед.изм</TableHead>
                  <TableHead className="text-center">Количество</TableHead>
                  <TableHead className="text-center">Цена за ед.</TableHead>
                  <TableHead className="text-center">Сумма</TableHead>
                  <TableHead className="text-center w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm || selectedSection !== "all" ? 
                        "Работы не найдены по заданным критериям" : 
                        "Нет работ в проекте. Добавьте первую работу или синхронизируйтесь с базой работ."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorks.map((work, index) => {
                    const volume = parseFloat(work.volume || "0");
                    const pricePerUnit = parseFloat(work.pricePerUnit || work.costPrice || "0");
                    const total = volume * pricePerUnit;

                    return (
                      <TableRow key={work.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{work.name}</div>
                            {work.description && (
                              <div className="text-sm text-gray-500 mt-1">{work.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {work.sectionName || "Без раздела"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{work.unit}</TableCell>
                        <TableCell className="text-center font-mono">
                          {parseFloat(work.volume || "0").toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          ₽ {pricePerUnit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          ₽ {total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditWork(work)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteWorkMutation.mutate(work.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Диалог редактирования */}
      <Dialog open={!!editingWork} onOpenChange={() => setEditingWork(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать работу</DialogTitle>
            <DialogDescription>
              Изменить параметры выбранной работы
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Название работы *</Label>
              <Input
                id="edit-name"
                value={newWork.name}
                onChange={(e) => setNewWork({ ...newWork, name: e.target.value })}
                placeholder="Например: Демонтаж перегородок"
              />
            </div>
            <div>
              <Label htmlFor="edit-sectionName">Раздел</Label>
              <Input
                id="edit-sectionName"
                value={newWork.sectionName}
                onChange={(e) => setNewWork({ ...newWork, sectionName: e.target.value })}
                placeholder="Например: Демонтажные работы"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-unit">Ед. измерения *</Label>
                <Input
                  id="edit-unit"
                  value={newWork.unit}
                  onChange={(e) => setNewWork({ ...newWork, unit: e.target.value })}
                  placeholder="м², шт, кг"
                />
              </div>
              <div>
                <Label htmlFor="edit-costPrice">Цена за единицу *</Label>
                <Input
                  id="edit-costPrice"
                  type="number"
                  step="0.01"
                  value={newWork.costPrice}
                  onChange={(e) => setNewWork({ ...newWork, costPrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-volume">Количество</Label>
              <Input
                id="edit-volume"
                type="number"
                step="0.01"
                value={newWork.volume}
                onChange={(e) => setNewWork({ ...newWork, volume: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Описание</Label>
              <Input
                id="edit-description"
                value={newWork.description}
                onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                placeholder="Дополнительная информация о работе"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingWork(null);
                resetForm();
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpdateWork}
              disabled={updateWorkMutation.isPending}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}