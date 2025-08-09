import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUndoRedoContext } from "@/contexts/UndoRedoContext";
import { 
  Search, 
  Edit2, 
  Check, 
  X, 
  DollarSign,
  ExternalLink,
  Trash2,
  Upload,
  Download
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Material } from "@shared/schema";

export function MaterialPrices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addAction } = useUndoRedoContext();

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  // Функция для определения проблем с материалом
  const getMaterialIssues = (material: Material): string[] => {
    const issues: string[] = [];
    
    if (!material.pricePerUnit || parseFloat(material.pricePerUnit) <= 0) {
      issues.push("Без цены");
    }
    
    if (!material.name || material.name.trim() === "") {
      issues.push("Без названия");
    }
    
    if (!material.unit || material.unit.trim() === "") {
      issues.push("Без единицы измерения");
    }
    
    if (material.name && (material.name.toLowerCase().includes('ошибка') || material.name.toLowerCase().includes('error'))) {
      issues.push("Ошибка в названии");
    }
    
    return issues;
  };

  const hasMaterialIssues = (material: Material): boolean => {
    return getMaterialIssues(material).length > 0;
  };

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price, previousPrice, materialName }: { 
      id: string; 
      price: number; 
      previousPrice: string;
      materialName: string;
    }) => {
      return apiRequest("PATCH", `/api/materials/${id}`, { pricePerUnit: price.toString() });
    },
    onSuccess: (_, variables) => {
      // Добавляем действие в историю отмены
      addAction({
        description: `Изменена цена "${variables.materialName}" с ${variables.previousPrice}₽ на ${variables.price}₽`,
        undo: async () => {
          await apiRequest("PATCH", `/api/materials/${variables.id}`, { 
            pricePerUnit: variables.previousPrice 
          });
          queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
        }
      });

      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      setEditingMaterial(null);
      setEditPrice("");
      toast({
        title: "Успех",
        description: "Цена материала обновлена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить цену материала",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/materials/import", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result: any) => {
      // Добавляем действие в историю отмены
      addAction({
        description: `Импортировано ${result.imported} материалов из Excel`,
        undo: async () => {
          // Здесь можно реализовать логику отмены импорта
          // Например, удаление всех добавленных материалов
          await apiRequest("DELETE", "/api/materials/clear");
          queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
        }
      });

      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Импорт завершен",
        description: `Импортировано: ${result.imported} материалов${result.errors?.length ? `. Ошибок: ${result.errors.length}` : ""}`,
        variant: result.errors?.length ? "destructive" : "default",
      });
      
      if (result.errors?.length > 0) {
        console.error("Import errors:", result.errors);
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка импорта",
        description: "Не удалось импортировать данные материалов",
        variant: "destructive",
      });
      console.error("Import error:", error);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/materials/clear");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Успех",
        description: "База материалов очищена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось очистить базу материалов",
        variant: "destructive",
      });
      console.error("Clear error:", error);
    },
  });

  // Мемоизированная фильтрация для производительности
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      // Фильтр по поисковому запросу
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        material.name.toLowerCase().includes(searchLower) ||
        material.unit.toLowerCase().includes(searchLower);
      
      // Фильтр только с ошибками
      const matchesErrorFilter = showOnlyErrors ? hasMaterialIssues(material) : true;
      
      return matchesSearch && matchesErrorFilter;
    });
  }, [materials, searchTerm, showOnlyErrors]);

  // Пагинация
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageMaterials = filteredMaterials.slice(startIndex, endIndex);

  const handleEditPrice = (materialId: string, currentPrice: string | number) => {
    setEditingMaterial(materialId);
    setEditPrice(currentPrice?.toString() || "");
  };

  const handleSavePrice = (materialId: string) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректную цену",
        variant: "destructive",
      });
      return;
    }
    
    // Находим материал для получения текущей цены и названия
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    updatePriceMutation.mutate({ 
      id: materialId, 
      price,
      previousPrice: material.pricePerUnit || "0",
      materialName: material.name
    });
  };

  const handleCancelEdit = () => {
    setEditingMaterial(null);
    setEditPrice("");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearDatabase = () => {
    if (window.confirm("Вы уверены, что хотите очистить всю базу материалов? Это действие нельзя отменить.")) {
      clearMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка материалов...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего материалов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{materials.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">С ценами</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {materials.filter(m => m.pricePerUnit && parseFloat(m.pricePerUnit) > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors ${showOnlyErrors ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          onClick={() => {
            setShowOnlyErrors(!showOnlyErrors);
            setCurrentPage(1); // Сбрасываем на первую страницу при смене фильтра
            if (!showOnlyErrors) {
              setSearchTerm(""); // Очищаем поиск при включении фильтра ошибок
            }
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <span>С ошибками</span>
              {showOnlyErrors && (
                <Badge variant="secondary" className="text-xs">
                  Активен
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {materials.filter(m => hasMaterialIssues(m)).length}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {showOnlyErrors ? "Показаны только ошибки" : "Клик для фильтрации"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Управление данными */}
      <Card>
        <CardHeader>
          <CardTitle>Управление данными</CardTitle>
          <CardDescription>
            Импорт материалов из Excel файла и управление базой
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
              onClick={() => window.open('/api/materials/template', '_blank')}
              variant="outline"
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

      {/* Поиск и фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск и фильтры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск по названию или единице измерения..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                setCurrentPage(1); // Сбрасываем на первую страницу при поиске
                if (value && showOnlyErrors) {
                  setShowOnlyErrors(false); // Отключаем фильтр ошибок при поиске
                }
              }}
              className="flex-1"
            />
          </div>
          
          {showOnlyErrors && (
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Фильтр активен</Badge>
                <span className="text-sm text-red-700 dark:text-red-300">
                  Показаны только материалы с ошибками
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowOnlyErrors(false);
                  setCurrentPage(1);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Таблица цен */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Цены на материалы</CardTitle>
              <CardDescription>
                Показано {startIndex + 1}-{Math.min(endIndex, filteredMaterials.length)} из {filteredMaterials.length} материалов
                {filteredMaterials.length !== materials.length && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {" "}(отфильтровано из {materials.length})
                  </span>
                )}
                {showOnlyErrors && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {" "}(только с ошибками)
                  </span>
                )}
                {totalPages > 1 && (
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {" "}— Страница {currentPage} из {totalPages}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <div className="text-gray-500">Материалы не найдены</div>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>№</TableHead>
                    <TableHead>Наименование</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Ссылка на картинку</TableHead>
                    <TableHead>Ссылка на товар</TableHead>
                    <TableHead>ЕД.ИЗМ</TableHead>
                    <TableHead>Норма расхода на 1кв.м.</TableHead>
                    <TableHead>Вес на единицу</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageMaterials.map((material, index) => {
                    const hasIssues = hasMaterialIssues(material);
                    const issues = getMaterialIssues(material);
                    
                    return (
                      <TableRow 
                        key={material.id}
                        className={hasIssues ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{startIndex + index + 1}</span>
                            {hasIssues && (
                              <div className="flex flex-wrap gap-1">
                                {issues.map((issue, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="destructive" 
                                    className="text-xs"
                                    title={issue}
                                  >
                                    ⚠
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      <TableCell className="max-w-xs">
                        <div 
                          className={`truncate ${hasIssues ? "text-red-700 dark:text-red-300" : ""}`} 
                          title={hasIssues ? `${material.name} (Проблемы: ${issues.join(', ')})` : material.name}
                        >
                          {material.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingMaterial === material.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24 h-8"
                              placeholder="0.00"
                            />
                            <span className="text-sm text-gray-500">₽</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${!material.pricePerUnit || parseFloat(material.pricePerUnit) <= 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                              {material.pricePerUnit && parseFloat(material.pricePerUnit) > 0 ? `${material.pricePerUnit} ₽` : "Не указана"}
                            </span>
                            {(!material.pricePerUnit || parseFloat(material.pricePerUnit) <= 0) && (
                              <Badge variant="destructive" className="text-xs">
                                Без цены
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {material.imageUrl ? (
                          <a 
                            href={material.imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="text-xs">Картинка</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">Нет ссылки</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {material.productUrl ? (
                          <a 
                            href={material.productUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="text-xs">Товар</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">Нет ссылки</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.unit}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {material.consumptionRate || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {material.weightPerUnit ? `${material.weightPerUnit} кг` : "—"}
                      </TableCell>
                      <TableCell>
                        {editingMaterial === material.id ? (
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSavePrice(material.id)}
                              disabled={updatePriceMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditPrice(material.id, material.pricePerUnit || "0")}
                          >
                            <Edit2 className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )})}
                
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-500">
                Всего страниц: {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  ««
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ‹ Назад
                </Button>
                
                <div className="flex items-center space-x-1">
                  {/* Показываем номера страниц */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? "bg-yellow-400 text-black font-semibold hover:bg-yellow-500" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Вперед ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  »»
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}