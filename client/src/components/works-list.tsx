import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Plus, Edit, Trash2, Hammer } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkItemWithMaterials } from "@shared/schema";

interface WorksListProps {
  workItems: WorkItemWithMaterials[];
  selectedWorkId: string | null;
  onWorkSelect: (workId: string) => void;
  onAddWork: () => void;
  onEditWork: (workId: string) => void;
  onCalculate: () => void;
  projectId: string;
}

export function WorksList({
  workItems,
  selectedWorkId,
  onWorkSelect,
  onAddWork,
  onEditWork,
  onCalculate,
  projectId,
}: WorksListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateWorkItemMutation = useMutation({
    mutationFn: async ({ id, volume }: { id: string; volume: string }) => {
      return apiRequest("PUT", `/api/work-items/${id}`, {
        volume: parseFloat(volume) || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить объём работы",
        variant: "destructive",
      });
    },
  });

  const deleteWorkItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/work-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
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

  const handleVolumeChange = (workItemId: string, volume: string) => {
    updateWorkItemMutation.mutate({ id: workItemId, volume });
  };

  const handleDeleteWork = (workItemId: string) => {
    if (window.confirm("Вы уверены, что хотите удалить эту работу?")) {
      deleteWorkItemMutation.mutate(workItemId);
    }
  };

  const calculateWorkCost = (volume: string, pricePerUnit: string) => {
    return (parseFloat(volume) || 0) * (parseFloat(pricePerUnit) || 0);
  };

  const totalWorksCost = workItems.reduce((total, item) => {
    return total + calculateWorkCost(item.volume || "0", item.pricePerUnit || "0");
  }, 0);

  return (
    <Card className="lg:col-span-2 overflow-hidden">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Hammer className="h-5 w-5 text-primary" />
            <span>Перечень работ</span>
          </CardTitle>
          <div className="flex items-center space-x-3">
            <Button
              onClick={onCalculate}
              className="bg-success hover:bg-green-600 text-white flex items-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>Рассчитать</span>
            </Button>
            <Button
              onClick={onAddWork}
              className="bg-primary hover:bg-primary-dark text-white flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить работу</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {workItems.length === 0 ? (
          <div className="p-8 text-center">
            <Hammer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Нет добавленных работ
            </p>
            <Button onClick={onAddWork} className="bg-primary hover:bg-primary-dark text-white">
              <Plus className="h-4 w-4 mr-2" />
              Добавить первую работу
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-700">
                    <TableHead className="text-left">Наименование</TableHead>
                    <TableHead className="text-left">Ед. изм.</TableHead>
                    <TableHead className="text-right">Объём</TableHead>
                    <TableHead className="text-right">Цена за ед.</TableHead>
                    <TableHead className="text-right">Стоимость</TableHead>
                    <TableHead className="text-center">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workItems.map((item) => {
                    const isSelected = selectedWorkId === item.id;
                    const workCost = calculateWorkCost(item.volume || "0", item.pricePerUnit || "0");

                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                          isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                        onClick={() => onWorkSelect(item.id)}
                      >
                        <TableCell>
                          <div className="font-medium text-sm">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{item.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            className="w-20 text-right text-sm"
                            value={item.volume || "0"}
                            onChange={(e) => handleVolumeChange(item.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ₽ {parseFloat(item.pricePerUnit || "0").toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-primary">
                          ₽ {workCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditWork(item.id)}
                              className="text-primary hover:text-primary-dark p-1"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWork(item.id)}
                              className="text-red-500 hover:text-red-600 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Totals Row */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="font-medium">Итого по работам:</span>
                <span className="text-lg font-bold text-primary">
                  ₽ {totalWorksCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
