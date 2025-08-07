import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Package, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MaterialEditModal } from "./material-edit-modal";
import type { Material } from "@shared/schema";

export function MaterialsDatabase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Успех",
        description: "Материал удален",
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

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleDeleteMaterial = (material: Material) => {
    if (window.confirm(`Вы уверены, что хотите удалить материал "${material.name}"?`)) {
      deleteMaterialMutation.mutate(material.id);
    }
  };

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка материалов...</div>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <span>База данных материалов</span>
          </CardTitle>
          <Button
            onClick={handleAddMaterial}
            className="bg-primary hover:bg-primary-dark text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить материал
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Поиск по названию, поставщику или единице измерения..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredMaterials.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? "Материалы не найдены" : "Нет добавленных материалов"}
            </p>
            {!searchTerm && (
              <Button onClick={handleAddMaterial} className="bg-primary hover:bg-primary-dark text-white">
                <Plus className="h-4 w-4 mr-2" />
                Добавить первый материал
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-700">
                  <TableHead className="text-left">Наименование</TableHead>
                  <TableHead className="text-left">Единица измерения</TableHead>
                  <TableHead className="text-right">Цена за единицу</TableHead>
                  <TableHead className="text-left">Поставщик</TableHead>
                  <TableHead className="text-left">Примечания</TableHead>
                  <TableHead className="text-center">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => (
                  <TableRow
                    key={material.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <TableCell>
                      <div className="font-medium">{material.name}</div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {material.unit}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold text-primary">
                      ₽ {parseFloat(material.pricePerUnit).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {material.supplier || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {material.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMaterial(material)}
                          className="text-primary hover:text-primary-dark p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMaterial(material)}
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

      {/* Material Edit Modal */}
      <MaterialEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingMaterial={editingMaterial}
      />
    </Card>
  );
}