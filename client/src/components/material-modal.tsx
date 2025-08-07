import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertWorkMaterialSchema } from "@shared/schema";
import type { Material, InsertWorkMaterial, WorkItem } from "@shared/schema";
import { z } from "zod";

const materialFormSchema = insertWorkMaterialSchema.extend({
  consumptionNorm: z.string().min(1, "Норма расхода обязательна"),
});

type MaterialFormData = z.infer<typeof materialFormSchema>;

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: WorkItem;
  projectId: string;
}

export function MaterialModal({ isOpen, onClose, workItem, projectId }: MaterialModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/materials"],
  });

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      workItemId: workItem.id,
      materialId: "",
      consumptionNorm: "",
      consumptionUnit: "",
    },
  });

  const selectedMaterialId = form.watch("materialId");
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
  const consumptionNorm = form.watch("consumptionNorm");

  const createWorkMaterialMutation = useMutation({
    mutationFn: async (data: InsertWorkMaterial) => {
      return apiRequest("POST", "/api/work-materials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Успех",
        description: "Материал добавлен к работе",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить материал",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaterialFormData) => {
    const workMaterialData: InsertWorkMaterial = {
      workItemId: data.workItemId,
      materialId: data.materialId,
      consumptionNorm: data.consumptionNorm,
      consumptionUnit: data.consumptionUnit,
    };

    createWorkMaterialMutation.mutate(workMaterialData);
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  // Auto-set consumption unit based on material and work units
  const handleMaterialChange = (materialId: string) => {
    form.setValue("materialId", materialId);
    const material = materials.find(m => m.id === materialId);
    if (material) {
      // Generate consumption unit based on material unit and work unit
      const consumptionUnit = `${material.unit}/${workItem.unit}`;
      form.setValue("consumptionUnit", consumptionUnit);
    }
  };

  // Calculate required quantity and cost
  const calculateQuantity = () => {
    if (!selectedMaterial || !consumptionNorm || !workItem.volume) return 0;
    return parseFloat(consumptionNorm) * parseFloat(workItem.volume);
  };

  const calculateCost = () => {
    if (!selectedMaterial) return 0;
    const quantity = calculateQuantity();
    return quantity * parseFloat(selectedMaterial.pricePerUnit);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <span>Добавить материал</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="materialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Материал *</FormLabel>
                  <Select onValueChange={handleMaterialChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите материал" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="consumptionNorm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Норма расхода *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0.000000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consumptionUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Единица расхода</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="шт/м³"
                        readOnly
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedMaterial && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Цена за единицу:</span>
                    <span className="font-medium">
                      ₽ {parseFloat(selectedMaterial.pricePerUnit).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}/{selectedMaterial.unit}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Требуется на объём:</span>
                    <span className="font-medium">
                      {calculateQuantity().toLocaleString('ru-RU', { maximumFractionDigits: 3 })} {selectedMaterial.unit}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="font-medium">Стоимость материала:</span>
                    <span className="font-bold text-primary">
                      ₽ {calculateCost().toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createWorkMaterialMutation.isPending}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                Добавить
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
