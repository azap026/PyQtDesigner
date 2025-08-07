import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Hammer } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertWorkItemSchema } from "@shared/schema";
import type { InsertWorkItem, WorkItem, Project } from "@shared/schema";
import { z } from "zod";

const workFormSchema = insertWorkItemSchema.extend({
  volume: z.string().optional(),
  pricePerUnit: z.string().min(1, "Цена за единицу обязательна"),
  costPrice: z.string().optional(),
});

type WorkFormData = z.infer<typeof workFormSchema>;

const unitOptions = [
  { value: "м²", label: "м² - квадратный метр" },
  { value: "м³", label: "м³ - кубический метр" },
  { value: "м", label: "м - погонный метр" },
  { value: "шт", label: "шт - штука" },
  { value: "т", label: "т - тонна" },
  { value: "кг", label: "кг - килограмм" },
];

interface WorkTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWork?: WorkItem | null;
  projects: Project[];
}

export function WorkTemplateModal({ isOpen, onClose, editingWork, projects }: WorkTemplateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<WorkFormData>({
    resolver: zodResolver(workFormSchema),
    defaultValues: {
      projectId: editingWork?.projectId || (projects.length > 0 ? projects[0].id : ""),
      name: editingWork?.name || "",
      description: editingWork?.description || "",
      unit: editingWork?.unit || "",
      pricePerUnit: editingWork?.pricePerUnit || "",
      costPrice: editingWork?.costPrice || "",
      volume: editingWork?.volume || "",
    },
  });

  const createWorkMutation = useMutation({
    mutationFn: async (data: InsertWorkItem) => {
      return apiRequest("POST", "/api/work-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-items", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Успех",
        description: "Работа создана",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать работу",
        variant: "destructive",
      });
    },
  });

  const updateWorkMutation = useMutation({
    mutationFn: async (data: Partial<InsertWorkItem>) => {
      return apiRequest("PUT", `/api/work-items/${editingWork?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-items", "all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Успех",
        description: "Работа обновлена",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить работу",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkFormData) => {
    const workData: InsertWorkItem = {
      projectId: data.projectId,
      name: data.name,
      description: data.description || null,
      unit: data.unit,
      pricePerUnit: data.pricePerUnit,
      costPrice: data.costPrice || null,
      volume: data.volume || "0",
    };

    if (editingWork) {
      updateWorkMutation.mutate(workData);
    } else {
      createWorkMutation.mutate(workData);
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
            <Hammer className="h-5 w-5 text-primary" />
            <span>{editingWork ? "Редактировать работу" : "Добавить работу"}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Проект *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите проект" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Наименование работы *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Например: Кладка кирпичная стен"
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
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Себестоимость (₽)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
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
                name="volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Объём</FormLabel>
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

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Дополнительное описание работы"
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
                disabled={createWorkMutation.isPending || updateWorkMutation.isPending}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                {editingWork ? "Обновить" : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}