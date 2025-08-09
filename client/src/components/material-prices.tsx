import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Edit2, 
  Check, 
  X, 
  DollarSign,
  ExternalLink,
  Trash2,
  Upload
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Material } from "@shared/schema";

export function MaterialPrices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      return apiRequest("PATCH", `/api/materials/${id}`, { price });
    },
    onSuccess: () => {
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

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditPrice = (materialId: string, currentPrice: number) => {
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
    updatePriceMutation.mutate({ id: materialId, price });
  };

  const handleCancelEdit = () => {
    setEditingMaterial(null);
    setEditPrice("");
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
              {materials.filter(m => m.price && m.price > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Без цен</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {materials.filter(m => !m.price || m.price <= 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск материалов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск по названию или единице измерения..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Таблица цен */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Цены на материалы</CardTitle>
              <CardDescription>
                Показано {filteredMaterials.length} из {materials.length} материалов
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
                  {filteredMaterials.map((material, index) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={material.name}>
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
                            <span className="font-medium">
                              {material.price ? `${material.price} ₽` : "Не указана"}
                            </span>
                            {!material.price && (
                              <Badge variant="secondary" className="text-xs">
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
                        {material.consumption || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {material.weight ? `${material.weight} кг` : "—"}
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
                            onClick={() => handleEditPrice(material.id, material.price || 0)}
                          >
                            <Edit2 className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}