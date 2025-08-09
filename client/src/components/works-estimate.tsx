import React, { useState, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Загружаем полные данные из Excel файла
import estimateDataJson from '../../../estimate-full-data.json';
const estimateData = estimateDataJson as {
  sections: Array<{
    id: number;
    title: string;
    works: Array<{
      stage: number;
      index: string;
      title: string;
      unit: string;
      quantity: number;
      costPrice: number;
      unitPrice: number;
      materials: Array<{
        name: string;
        unit: string;
        quantity: number;
        unitPrice: number;
      }>;
    }>;
  }>;
};

interface WorksEstimateProps {
  projectId: string;
}

export function WorksEstimate({ projectId }: WorksEstimateProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([1]));
  const [editingWork, setEditingWork] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState("");
  
  const { toast } = useToast();

  // Управление раскрытием разделов
  const toggleSection = (sectionId: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Получаем все разделы для фильтрации
  const sections = useMemo(() => {
    return estimateData.sections.map(section => section.title);
  }, []);

  // Фильтрация работ
  const filteredSections = useMemo(() => {
    return estimateData.sections.map(section => ({
      ...section,
      works: section.works.filter((work) => {
        const matchesSearch = work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          work.index.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSection = selectedSection === "all" || section.title === selectedSection;

        return matchesSearch && matchesSection;
      })
    })).filter(section => section.works.length > 0);
  }, [searchTerm, selectedSection]);

  // Подсчет общей стоимости
  const totalCost = useMemo(() => {
    return filteredSections.reduce((sectionTotal, section) => {
      return sectionTotal + section.works.reduce((workTotal, work) => {
        return workTotal + (work.quantity * work.unitPrice);
      }, 0);
    }, 0);
  }, [filteredSections]);

  const handleEditQuantity = (work: any) => {
    setEditingWork(work);
    setNewQuantity(work.quantity.toString());
  };

  const handleSaveQuantity = () => {
    if (editingWork) {
      const quantity = parseFloat(newQuantity) || 0;
      // Здесь будет обновление количества в базе данных
      editingWork.quantity = quantity;
      setEditingWork(null);
      setNewQuantity("");
      toast({
        title: "Количество обновлено",
        description: `Количество для "${editingWork.title}" изменено на ${quantity}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Виды работ
              </CardTitle>
              <CardDescription>
                {estimateData.sections.length} разделов, {estimateData.sections.reduce((sum, s) => sum + s.works.length, 0)} работ, {estimateData.sections.reduce((sum, s) => sum + s.works.reduce((workSum, w) => workSum + w.materials.length, 0), 0)} материалов
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Импорт Excel
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Экспорт Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Поиск и фильтры */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск работ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Выберите раздел" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все разделы</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredSections.length}
                </div>
                <p className="text-sm text-gray-600">Разделов</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {filteredSections.reduce((total, section) => total + section.works.length, 0)}
                </div>
                <p className="text-sm text-gray-600">Работ</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredSections.reduce((total, section) => 
                    total + section.works.reduce((workTotal, work) => workTotal + work.materials.length, 0), 0
                  )}
                </div>
                <p className="text-sm text-gray-600">Материалов</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  ₽ {totalCost.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-gray-600">Общая стоимость</p>
              </CardContent>
            </Card>
          </div>

          {/* Таблица работ */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900">
                  <TableHead className="w-12">Этап</TableHead>
                  <TableHead className="w-16">№</TableHead>
                  <TableHead>Наименование работ</TableHead>
                  <TableHead className="text-center w-20">Изображение</TableHead>
                  <TableHead className="text-center w-20">Ед.изм</TableHead>
                  <TableHead className="text-center w-24">Кол-во</TableHead>
                  <TableHead className="text-center w-28">Себестоимость</TableHead>
                  <TableHead className="text-center w-28">На единицу</TableHead>
                  <TableHead className="text-center w-28">Стоимость</TableHead>
                  <TableHead className="text-center w-20">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      {searchTerm || selectedSection !== "all" ? 
                        "Работы не найдены по заданным критериям" : 
                        "Нет работ в смете"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSections.map((section) => (
                    <React.Fragment key={`section-${section.id}`}>
                      {/* Заголовок раздела */}
                      <TableRow className="bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30">
                        <TableCell 
                          colSpan={10}
                          className="font-bold text-blue-700 dark:text-blue-300 cursor-pointer"
                          onClick={() => toggleSection(section.id)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedSections.has(section.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {section.title}
                            <Badge variant="outline" className="ml-2">
                              {section.works.length} работ
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Работы в разделе */}
                      {expandedSections.has(section.id) && section.works.map((work) => {
                        const workTotal = work.quantity * work.unitPrice;
                        
                        return (
                          <React.Fragment key={`work-${section.id}-${work.index}`}>
                            {/* Работа */}
                            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-blue-200">
                              <TableCell className="font-medium text-center">{work.stage}</TableCell>
                              <TableCell className="font-medium">{work.index}</TableCell>
                              <TableCell>
                                <div className="font-medium">{work.title}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center text-xs text-gray-500">
                                  IMG
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{work.unit}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  className="h-8 px-2 font-mono hover:bg-blue-100"
                                  onClick={() => handleEditQuantity(work)}
                                >
                                  {work.quantity.toFixed(2)}
                                </Button>
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                ₽ {work.costPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                ₽ {work.unitPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center font-mono font-bold">
                                ₽ {workTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditQuantity(work)}
                                    className="h-8 w-8 p-0"
                                    title="Изменить количество"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {/* Материалы */}
                            {work.materials.map((material, materialIndex) => (
                              <TableRow 
                                key={`${section.id}-${work.index}-material-${materialIndex}`}
                                className="bg-gray-50/50 dark:bg-gray-800/30 border-l-4 border-gray-300"
                              >
                                <TableCell className="text-center text-gray-500">{material.unit}</TableCell>
                                <TableCell className="text-gray-500">{work.index}</TableCell>
                                <TableCell className="pl-8 text-gray-700 dark:text-gray-300">
                                  <div className="text-sm">{material.name}</div>
                                </TableCell>
                                <TableCell className="text-center text-gray-500">—</TableCell>
                                <TableCell className="text-center text-gray-500">—</TableCell>
                                <TableCell className="text-center font-mono text-gray-600">
                                  {material.quantity.toFixed(3)}
                                </TableCell>
                                <TableCell className="text-center text-gray-500">—</TableCell>
                                <TableCell className="text-center font-mono text-gray-600">
                                  ₽ {material.unitPrice.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-center font-mono text-gray-600">
                                  ₽ {(material.quantity * material.unitPrice).toFixed(2)}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                      
                      {/* Итого по разделу */}
                      {expandedSections.has(section.id) && (
                        <TableRow className="bg-gray-100 dark:bg-gray-800 border-b-2 font-medium">
                          <TableCell colSpan={8} className="text-right">
                            Итого по разделу "{section.title}":
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">
                            ₽ {section.works.reduce((total, work) => total + (work.quantity * work.unitPrice), 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Диалог редактирования количества */}
      <Dialog open={!!editingWork} onOpenChange={() => setEditingWork(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Изменить количество</DialogTitle>
            <DialogDescription>
              {editingWork?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Количество ({editingWork?.unit})</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {editingWork && (
              <div className="text-sm text-gray-600">
                Стоимость: ₽{((parseFloat(newQuantity) || 0) * editingWork.unitPrice).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingWork(null)}
            >
              Отмена
            </Button>
            <Button onClick={handleSaveQuantity}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}