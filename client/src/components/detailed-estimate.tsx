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
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  FileSpreadsheet,
  Calculator,
  Package,
  HardHat,
  RefreshCw,
  Link,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithWorkItems } from "@shared/schema";

interface DetailedEstimateProps {
  projectId: string;
}

export function DetailedEstimate({ projectId }: DetailedEstimateProps) {
  const [projectTitle, setProjectTitle] = useState("Сметный расчет по объекту: г. Москва, Шмитовский проезд");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery<ProjectWithWorkItems>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Синхронизация с иерархической структурой
  const syncHierarchyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${projectId}/sync-hierarchy`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Синхронизация завершена",
        description: `Синхронизировано работ: ${data.syncedWorks}, связано с материалами: ${data.linkedWorks}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка синхронизации",
        description: "Не удалось синхронизировать с иерархической структурой",
        variant: "destructive",
      });
    },
  });

  // Группировка работ по разделам на основе иерархической структуры и кодов работ
  const groupedWorks = useMemo(() => {
    if (!project?.workItems) return {};
    
    const groups: Record<string, typeof project.workItems> = {};
    
    project.workItems.forEach(work => {
      // Используем sectionName из базы данных, если есть
      let section = work.sectionName || "Прочие работы";
      
      // Если нет sectionName, определяем раздел по коду работы
      if (!work.sectionName && work.workCode) {
        const codePrefix = work.workCode.split('.')[0];
        switch (codePrefix) {
          case "1":
            section = "Работы по потолкам (Демонтаж)";
            break;
          case "2":
            section = "Демонтаж конструкций";
            break;
          case "3":
            section = "Работы по стенам";
            break;
          default:
            section = "Прочие работы";
        }
      }
      
      // Если все еще нет раздела, определяем по названию
      if (section === "Прочие работы") {
        const workName = work.name.toLowerCase();
        if (workName.includes("потолок") || workName.includes("демонтаж")) {
          section = "Работы по потолкам (Демонтаж)";
        } else if (workName.includes("штукатур")) {
          section = "Демонтаж штукатурки с потолка";
        } else if (workName.includes("стен")) {
          section = "Работы по стенам";
        } else if (workName.includes("пол")) {
          section = "Работы по полам";
        }
      }
      
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(work);
    });
    
    return groups;
  }, [project?.workItems]);

  // Расчет общей стоимости
  const totalEstimate = useMemo(() => {
    if (!project?.workItems) return { worksCost: 0, materialsCost: 0, laborCost: 0 };
    
    const worksCost = project.workItems.reduce((total, item) => {
      return total + ((parseFloat(item.volume || "0")) * (parseFloat(item.pricePerUnit || "0")));
    }, 0);

    const materialsCost = project.workItems.reduce((total, workItem) => {
      return total + workItem.workMaterials.reduce((materialTotal, workMaterial) => {
        const quantity = (parseFloat(workItem.volume || "0")) * (parseFloat(workMaterial.consumptionNorm || "0"));
        return materialTotal + (quantity * (parseFloat(workMaterial.material.pricePerUnit || "0")));
      }, 0);
    }, 0);

    const laborCost = worksCost * 0.3; // 30% от стоимости работ как оплата труда

    return { worksCost, materialsCost, laborCost };
  }, [project]);

  const exportToExcel = () => {
    toast({
      title: "Экспорт в Excel",
      description: "Функция экспорта будет реализована в следующей версии",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calculator className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Подготовка сметы...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Проект не найден</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок сметы */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                placeholder="Введите название объекта..."
              />
              <CardDescription className="mt-2">
                Проект: {project.name}
              </CardDescription>
            </div>
            <div className="flex space-x-2 ml-4">
              <Button 
                onClick={() => syncHierarchyMutation.mutate()}
                disabled={syncHierarchyMutation.isPending}
                variant="outline"
              >
                {syncHierarchyMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Синхронизировать
              </Button>
              <Button onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Экспорт в Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <HardHat className="h-4 w-4 mr-2" />
              Работы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₽ {totalEstimate.worksCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Материалы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₽ {totalEstimate.materialsCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Оплата труда</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₽ {totalEstimate.laborCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Общая стоимость</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ₽ {(totalEstimate.worksCost + totalEstimate.materialsCost + totalEstimate.laborCost).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Детальная смета по разделам */}
      <Card>
        <CardHeader>
          <CardTitle>Детальная смета</CardTitle>
          <CardDescription>
            Расчет стоимости работ и материалов по разделам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-blue-50 dark:bg-blue-950/20">
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>Наименование работ</TableHead>
                  <TableHead className="text-center w-24">Изображение</TableHead>
                  <TableHead className="text-center w-24">Ед.изм</TableHead>
                  <TableHead className="text-center w-24">Кол-во</TableHead>
                  <TableHead className="text-center w-32">Стоимость, рублей</TableHead>
                  <TableHead className="text-center w-32">На единицу</TableHead>
                  <TableHead className="text-center w-32">Материалы</TableHead>
                  <TableHead className="text-center w-32">Оплата труда</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedWorks).map(([sectionName, works], sectionIndex) => (
                  <>
                    {/* Заголовок раздела */}
                    <TableRow key={`section-${sectionIndex}`} className="bg-gray-100 dark:bg-gray-800">
                      <TableCell className="font-bold">{sectionIndex + 1}</TableCell>
                      <TableCell colSpan={8} className="font-bold text-blue-700 dark:text-blue-300">
                        {sectionName}
                      </TableCell>
                    </TableRow>
                    
                    {/* Работы в разделе */}
                    {works.map((work, workIndex) => {
                      const workCost = (parseFloat(work.volume || "0")) * (parseFloat(work.pricePerUnit || "0"));
                      const materialsCost = work.workMaterials.reduce((total, workMaterial) => {
                        const quantity = (parseFloat(work.volume || "0")) * (parseFloat(workMaterial.consumptionNorm || "0"));
                        return total + (quantity * (parseFloat(workMaterial.material.pricePerUnit || "0")));
                      }, 0);
                      const laborCost = workCost * 0.3;

                      return (
                        <TableRow key={work.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <TableCell className="font-medium">
                            {sectionIndex + 1}.{workIndex + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{work.name}</div>
                            {work.description && (
                              <div className="text-xs text-gray-500 mt-1">{work.description}</div>
                            )}
                            {/* Показать материалы в работе */}
                            {work.workMaterials.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {work.workMaterials.map((wm) => (
                                  <div key={wm.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                                    <Package className="h-3 w-3 mr-1" />
                                    {wm.material.name} ({wm.consumptionNorm} {wm.consumptionUnit})
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {work.workMaterials.length > 0 && work.workMaterials[0].material.imageUrl ? (
                              <div className="flex flex-wrap gap-1">
                                {work.workMaterials.slice(0, 2).map((wm, idx) => 
                                  wm.material.imageUrl ? (
                                    <img 
                                      key={idx}
                                      src={wm.material.imageUrl} 
                                      alt={wm.material.name}
                                      className="w-8 h-8 object-cover rounded border"
                                    />
                                  ) : (
                                    <div key={idx} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded border flex items-center justify-center">
                                      <Package className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded border flex items-center justify-center mx-auto">
                                <HardHat className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{work.unit}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {parseFloat(work.volume || "0").toLocaleString('ru-RU', { maximumFractionDigits: 3 })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₽ {(workCost + materialsCost + laborCost).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            ₽ {parseFloat(work.pricePerUnit || "0").toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            ₽ {materialsCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            ₽ {laborCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Итого по разделу */}
                    <TableRow className="bg-blue-50 dark:bg-blue-950/20 font-medium">
                      <TableCell></TableCell>
                      <TableCell>Итого по разделу:</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">
                        ₽ {works.reduce((total, work) => {
                          const workCost = (parseFloat(work.volume || "0")) * (parseFloat(work.pricePerUnit || "0"));
                          const materialsCost = work.workMaterials.reduce((materialTotal, workMaterial) => {
                            const quantity = (parseFloat(work.volume || "0")) * (parseFloat(workMaterial.consumptionNorm || "0"));
                            return materialTotal + (quantity * (parseFloat(workMaterial.material.pricePerUnit || "0")));
                          }, 0);
                          const laborCost = workCost * 0.3;
                          return total + workCost + materialsCost + laborCost;
                        }, 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        ₽ {works.reduce((total, work) => {
                          const materialsCost = work.workMaterials.reduce((materialTotal, workMaterial) => {
                            const quantity = (parseFloat(work.volume || "0")) * (parseFloat(workMaterial.consumptionNorm || "0"));
                            return materialTotal + (quantity * (parseFloat(workMaterial.material.pricePerUnit || "0")));
                          }, 0);
                          return total + materialsCost;
                        }, 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        ₽ {works.reduce((total, work) => {
                          const workCost = (parseFloat(work.volume || "0")) * (parseFloat(work.pricePerUnit || "0"));
                          const laborCost = workCost * 0.3;
                          return total + laborCost;
                        }, 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </>
                ))}
                
                {/* Общий итог */}
                <TableRow className="bg-green-50 dark:bg-green-950/20 font-bold text-lg">
                  <TableCell></TableCell>
                  <TableCell>ВСЕГО ПО СМЕТЕ:</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-green-700 dark:text-green-300">
                    ₽ {(totalEstimate.worksCost + totalEstimate.materialsCost + totalEstimate.laborCost).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">
                    ₽ {totalEstimate.materialsCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    ₽ {totalEstimate.laborCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}