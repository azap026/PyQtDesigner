import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Package, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkItemWithMaterials } from "@shared/schema";

interface WorkDetailsProps {
  selectedWork: WorkItemWithMaterials | null;
  onAddMaterial: () => void;
  projectId: string;
}

export function WorkDetails({ selectedWork, onAddMaterial, projectId }: WorkDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteWorkMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/work-materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Успех",
        description: "Материал удален из работы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить материал",
        variant: "destructive",
      });
    },
  });

  const handleRemoveMaterial = (materialId: string) => {
    if (window.confirm("Удалить материал из работы?")) {
      deleteWorkMaterialMutation.mutate(materialId);
    }
  };

  const calculateMaterialQuantity = (volume: string, consumptionNorm: string) => {
    return (parseFloat(volume) || 0) * (parseFloat(consumptionNorm) || 0);
  };

  const calculateMaterialCost = (quantity: number, pricePerUnit: string) => {
    return quantity * (parseFloat(pricePerUnit) || 0);
  };

  const selectedWorkMaterialsCost = selectedWork?.workMaterials.reduce((total, workMaterial) => {
    const quantity = calculateMaterialQuantity(
      selectedWork.volume || "0",
      workMaterial.consumptionNorm || "0"
    );
    return total + calculateMaterialCost(quantity, workMaterial.material.pricePerUnit || "0");
  }, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Selected Work Info */}
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-primary" />
            <span>Выбранная работа</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {selectedWork ? (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Наименование:</span>
                <div className="font-medium">{selectedWork.name}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Единица измерения:</span>
                <div className="font-medium">{selectedWork.unit}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Объём:</span>
                <div className="font-medium text-primary">
                  {parseFloat(selectedWork.volume || "0").toLocaleString('ru-RU', { maximumFractionDigits: 3 })} {selectedWork.unit}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Стоимость:</span>
                <div className="font-bold text-lg text-primary">
                  ₽ {((parseFloat(selectedWork.volume || "0")) * (parseFloat(selectedWork.pricePerUnit || "0"))).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              Выберите работу для просмотра деталей
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials for Selected Work */}
      {selectedWork && (
        <Card>
          <CardHeader className="border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-primary" />
              <span>Материалы</span>
            </CardTitle>
            <Button
              onClick={onAddMaterial}
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary-dark"
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {selectedWork.workMaterials.length === 0 ? (
              <div className="p-6 text-center">
                <Package className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  Нет добавленных материалов
                </p>
                <Button
                  onClick={onAddMaterial}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить материал
                </Button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedWork.workMaterials.map((workMaterial) => {
                    const quantity = calculateMaterialQuantity(
                      selectedWork.volume || "0",
                      workMaterial.consumptionNorm || "0"
                    );
                    const materialCost = calculateMaterialCost(quantity, workMaterial.material.pricePerUnit || "0");

                    return (
                      <div key={workMaterial.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{workMaterial.material.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <span>{parseFloat(workMaterial.consumptionNorm || "0").toLocaleString('ru-RU', { maximumFractionDigits: 6 })} {workMaterial.consumptionUnit}</span>
                              <span className="mx-2">•</span>
                              <span>₽ {parseFloat(workMaterial.material.pricePerUnit || "0").toLocaleString('ru-RU', { minimumFractionDigits: 2 })}/{workMaterial.material.unit}</span>
                            </div>
                            <div className="text-sm font-medium text-primary mt-1">
                              Требуется: <span>{quantity.toLocaleString('ru-RU', { maximumFractionDigits: 3 })} {workMaterial.material.unit}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-bold text-sm">
                              ₽ {materialCost.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMaterial(workMaterial.id)}
                              className="text-gray-400 hover:text-red-500 mt-1 p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Материалы для работы:</span>
                    <span className="font-bold text-primary">
                      ₽ {selectedWorkMaterialsCost.toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
