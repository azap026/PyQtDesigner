import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertMaterialSchema } from "@shared/schema";
import type { InsertMaterial, Material } from "@shared/schema";
import { z } from "zod";

const materialFormSchema = insertMaterialSchema.extend({
  pricePerUnit: z.string().min(1, "Цена за единицу обязательна"),
  consumptionRate: z.string().optional(),
  weightPerUnit: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialFormSchema>;

const unitOptions = [
  { value: "м²", label: "м² - квадратный метр" },
  { value: "м³", label: "м³ - кубический метр" },
  { value: "м", label: "м - погонный метр" },
  { value: "шт", label: "шт - штука" },
  { value: "т", label: "т - тонна" },
  { value: "кг", label: "кг - килограмм" },
  { value: "л", label: "л - литр" },
  { value: "м²", label: "м² - квадратный метр" },
  { value: "упак", label: "упак - упаковка" },
];

interface MaterialEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMaterial?: Material | null;
}

export function MaterialEditModal({ isOpen, onClose, editingMaterial }: MaterialEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: editingMaterial?.name || "",
      unit: editingMaterial?.unit || "",
      pricePerUnit: editingMaterial?.pricePerUnit || "",
      supplier: editingMaterial?.supplier || "",
      notes: editingMaterial?.notes || "",
      imageUrl: editingMaterial?.imageUrl || "",
      productUrl: editingMaterial?.productUrl || "",
      consumptionRate: editingMaterial?.consumptionRate || "",
      consumptionUnit: editingMaterial?.consumptionUnit || "",
      weightPerUnit: editingMaterial?.weightPerUnit || "",
      weightUnit: editingMaterial?.weightUnit || "",
    },
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (data: InsertMaterial) => {
      return apiRequest("POST", "/api/materials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Успех",
        description: "Материал создан",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать материал",
        variant: "destructive",
      });
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async (data: Partial<InsertMaterial>) => {
      return apiRequest("PUT", `/api/materials/${editingMaterial?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "Успех",
        description: "Материал обновлен",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить материал",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaterialFormData) => {
    const materialData: InsertMaterial = {
      name: data.name,
      unit: data.unit,
      pricePerUnit: data.pricePerUnit,
      supplier: data.supplier || null,
      notes: data.notes || null,
      imageUrl: data.imageUrl || null,
      productUrl: data.productUrl || null,
      consumptionRate: data.consumptionRate || null,
      consumptionUnit: data.consumptionUnit || null,
      weightPerUnit: data.weightPerUnit || null,
      weightUnit: data.weightUnit || null,
    };

    if (editingMaterial) {
      updateMaterialMutation.mutate(materialData);
    } else {
      createMaterialMutation.mutate(materialData);
    }
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <span>{editingMaterial ? "Редактировать материал" : "Добавить материал"}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Наименование материала *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Например: Кирпич керамический"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Единица измерения *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите единицу" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unitOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricePerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена за единицу (₽) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ссылка на картинку</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ссылка на товар</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://shop.com/product"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consumptionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Расход на единицу измерения</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        {...field}
                        value={field.value || ""}
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
                    <FormLabel>Единица измерения расхода</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="например: шт/м², кг/м³"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weightPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Вес за единицу</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weightUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Единица измерения веса</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="например: кг/шт, кг/м"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Поставщик</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Название поставщика"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Примечания</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Дополнительная информация о материале"
                          rows={3}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createMaterialMutation.isPending || updateMaterialMutation.isPending}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                {editingMaterial ? "Обновить" : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}