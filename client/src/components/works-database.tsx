import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Hammer, Search, Upload, AlertTriangle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WorkTemplateModal } from "./work-template-modal";
import { WorkImportModal } from "./work-import-modal";
import type { WorkItem, Project } from "@shared/schema";

export function WorksDatabase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получаем все проекты для работ
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Получаем все работы из всех проектов
  const { data: allWorkItems = [], isLoading } = useQuery({
    queryKey: ["/api/work-items", "all"],
    queryFn: async () => {
      const allWorks: WorkItem[] = [];
      
      for (const project of projects) {
        try {
          const response = await fetch(`/api/projects/${project.id}/work-items`);
          if (response.ok) {
            const works = await response.json();
            allWorks.push(...works.map((work: any) => ({ ...work, projectName: project.name })));
          }
        } catch (error) {
          console.error(`Error loading works for project ${project.id}:`, error);
        }
      }
      
      return allWorks;
    },
    enabled: projects.length > 0,
  });

  const deleteWorkMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/work-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-items", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Успех",
        description: "Работа удалена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить работу",
        variant: "destructive",
      });
    },
  });

  const clearWorksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/work-items/clear");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-items", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "База очищена",
        description: `Удалено ${data.deleted} работ`,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось очистить базу работ",
        variant: "destructive",
      });
    },
  });

  const handleAddWork = () => {
    setEditingWork(null);
    setIsModalOpen(true);
  };

  const handleEditWork = (work: WorkItem) => {
    setEditingWork(work);
    setIsModalOpen(true);
  };

  const handleDeleteWork = (work: WorkItem) => {
    if (window.confirm(`Вы уверены, что хотите удалить работу "${work.name}"?`)) {
      deleteWorkMutation.mutate(work.id);
    }
  };

  const filteredWorks = allWorkItems.filter((work: any) =>
    work.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    work.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    work.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    work.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка работ...</div>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Hammer className="h-5 w-5 text-primary" />
            <span>База данных работ</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                if (window.confirm("Вы уверены, что хотите очистить всю базу работ? Это действие нельзя отменить.")) {
                  clearWorksMutation.mutate();
                }
              }}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
              disabled={clearWorksMutation.isPending}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {clearWorksMutation.isPending ? "Очистка..." : "Очистить базу"}
            </Button>
            <Button
              onClick={() => setIsImportModalOpen(true)}
              variant="outline"
              className="text-primary border-primary hover:bg-primary hover:text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Импорт Excel
            </Button>
            <Button
              onClick={handleAddWork}
              className="bg-primary hover:bg-primary-dark text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить работу
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Поиск по названию, описанию, единице измерения или проекту..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredWorks.length === 0 ? (
          <div className="p-8 text-center">
            <Hammer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? "Работы не найдены" : "Нет добавленных работ"}
            </p>
            {!searchTerm && (
              <Button onClick={handleAddWork} className="bg-primary hover:bg-primary-dark text-white">
                <Plus className="h-4 w-4 mr-2" />
                Добавить первую работу
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-700">
                  <TableHead className="text-left">Наименование</TableHead>
                  <TableHead className="text-left">Проект</TableHead>
                  <TableHead className="text-left">Ед. изм.</TableHead>
                  <TableHead className="text-right">Цена за ед.</TableHead>
                  <TableHead className="text-right">Себестоимость</TableHead>
                  <TableHead className="text-right">Объём</TableHead>
                  <TableHead className="text-center">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorks.map((work: any) => (
                  <TableRow
                    key={work.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <TableCell>
                      <div className="font-medium">{work.name}</div>
                      {work.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {work.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                      {work.projectName}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {work.unit}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-primary">
                      ₽ {parseFloat(work.pricePerUnit || "0").toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {work.costPrice 
                        ? `₽ ${parseFloat(work.costPrice).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`
                        : "—"
                      }
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {parseFloat(work.volume || "0").toLocaleString('ru-RU', { maximumFractionDigits: 3 })} {work.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditWork(work)}
                          className="text-primary hover:text-primary-dark p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWork(work)}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Work Template Modal */}
      <WorkTemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingWork={editingWork}
        projects={projects}
      />

      {/* Work Import Modal */}
      <WorkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </Card>
  );
}