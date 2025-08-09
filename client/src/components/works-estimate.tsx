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
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

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
  const [expandedWorks, setExpandedWorks] = useState<Set<string>>(new Set());
  const [editingWork, setEditingWork] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [editingMaterial, setEditingMaterial] = useState<{ sectionId: number; workIndex: string; materialIndex: number } | null>(null);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [undoHistory, setUndoHistory] = useState<any[]>([]);
  const [currentData, setCurrentData] = useState(estimateData);
  const [estimateWorks, setEstimateWorks] = useState<any[]>([]);
  
  const { toast } = useToast();

  // Сохранение состояния в историю для отмены
  const saveToHistory = (description: string) => {
    const newHistory = [...undoHistory, { 
      data: JSON.parse(JSON.stringify(currentData)), 
      description,
      timestamp: Date.now()
    }];
    // Ограничиваем историю до 10 последних действий
    if (newHistory.length > 10) {
      newHistory.shift();
    }
    setUndoHistory(newHistory);
  };

  // Отмена последнего действия
  const handleUndo = () => {
    if (undoHistory.length > 0) {
      const lastState = undoHistory[undoHistory.length - 1];
      setCurrentData(lastState.data);
      setUndoHistory(prev => prev.slice(0, -1));
      
      toast({
        title: "Действие отменено",
        description: `Отменено: ${lastState.description}`,
      });
    }
  };

  // Обработка горячих клавиш
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        handleUndo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoHistory]);

  // Поиск материалов для автозаполнения
  const { data: searchResults = [] } = useQuery({
    queryKey: ['materials', 'search', materialSearchTerm],
    queryFn: async () => {
      if (!materialSearchTerm || materialSearchTerm.length < 2) return [];
      const response = await fetch(`/api/materials/search?q=${encodeURIComponent(materialSearchTerm)}`);
      return response.json();
    },
    enabled: !!materialSearchTerm && materialSearchTerm.length >= 2,
  });

  // Поиск материала в базе данных по названию для получения изображения
  const { data: allMaterials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const response = await fetch('/api/materials');
      return response.json();
    },
  });

  // Функция поиска изображения материала
  const findMaterialImage = useMemo(() => {
    return (materialName: string) => {
      // Ищем точное совпадение
      let foundMaterial = allMaterials.find((m: any) => 
        m.name.toLowerCase() === materialName.toLowerCase()
      );
      
      // Если точного совпадения нет, ищем по частичному совпадению
      if (!foundMaterial) {
        foundMaterial = allMaterials.find((m: any) => 
          m.name.toLowerCase().includes(materialName.toLowerCase()) ||
          materialName.toLowerCase().includes(m.name.toLowerCase())
        );
      }
      
      return foundMaterial?.imageUrl || null;
    };
  }, [allMaterials, currentData]); // Добавляем currentData как зависимость

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

  // Управление раскрытием материалов в работах
  const toggleWorkMaterials = (workKey: string) => {
    const newExpanded = new Set(expandedWorks);
    if (newExpanded.has(workKey)) {
      newExpanded.delete(workKey);
    } else {
      newExpanded.add(workKey);
    }
    setExpandedWorks(newExpanded);
  };

  // Получаем все разделы для фильтрации
  const sections = useMemo(() => {
    return currentData.sections.map(section => section.title);
  }, [currentData]);

  // Фильтрация работ
  const filteredSections = useMemo(() => {
    return currentData.sections.map(section => ({
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
      saveToHistory(`Изменение количества "${editingWork.title}"`);
      
      const quantity = parseFloat(newQuantity) || 0;
      const newData = JSON.parse(JSON.stringify(currentData));
      
      // Находим и обновляем работу
      for (const section of newData.sections) {
        const work = section.works.find((w: any) => w.index === editingWork.index);
        if (work) {
          work.quantity = quantity;
          break;
        }
      }
      
      setCurrentData(newData);
      setEditingWork(null);
      setNewQuantity("");
      
      toast({
        title: "Количество обновлено",
        description: `Количество для "${editingWork.title}" изменено на ${quantity}`,
      });
    }
  };

  const handleEditMaterial = (sectionId: number, workIndex: string, materialIndex: number, currentMaterial: any) => {
    setEditingMaterial({ sectionId, workIndex, materialIndex });
    setMaterialSearchTerm(currentMaterial.name);
    setSelectedMaterial(currentMaterial);
  };

  const handleSelectMaterial = (material: any) => {
    if (editingMaterial) {
      saveToHistory(`Замена материала на "${material.name}"`);
      
      const newData = JSON.parse(JSON.stringify(currentData));
      const section = newData.sections.find((s: any) => s.id === editingMaterial.sectionId);
      if (section) {
        const work = section.works.find((w: any) => w.index === editingMaterial.workIndex);
        if (work && work.materials[editingMaterial.materialIndex]) {
          const newPrice = parseFloat(material.pricePerUnit) || 0;
          console.log('Обновление материала:', {
            materialName: material.name,
            originalPrice: material.pricePerUnit,
            parsedPrice: newPrice,
            unit: material.unit
          });
          
          work.materials[editingMaterial.materialIndex] = {
            ...work.materials[editingMaterial.materialIndex],
            name: material.name,
            unit: material.unit,
            unitPrice: newPrice,
            costPrice: newPrice // Обновляем оба поля для совместимости
          };
        }
      }
      
      setCurrentData(newData);
      setEditingMaterial(null);
      setMaterialSearchTerm("");
      setSelectedMaterial(null);
      
      toast({
        title: "Материал обновлен",
        description: `Материал заменен на "${material.name}" по цене ₽${parseFloat(material.pricePerUnit).toFixed(2)}`,
      });
    }
  };

  const handleCancelMaterialEdit = () => {
    setEditingMaterial(null);
    setMaterialSearchTerm("");
    setSelectedMaterial(null);
  };

  // Добавление работы и материалов в смету
  const handleAddWorkToEstimate = (work: any, sectionTitle: string) => {
    console.log('Добавление работы в смету:', { work, sectionTitle });
    saveToHistory(`Добавление работы "${work.title}" в смету`);
    
    // Сохраняем работу в localStorage для передачи в раздел "Смета"
    const existingEstimate = JSON.parse(localStorage.getItem('projectEstimate') || '[]');
    
    const workWithMaterials = {
      id: `estimate-${Date.now()}-${Math.random()}`,
      sectionTitle,
      stage: work.stage,
      index: work.index,
      title: work.title,
      unit: work.unit,
      quantity: 1, // По умолчанию 1 единица
      costPrice: work.costPrice,
      unitPrice: work.unitPrice,
      materials: work.materials.map((material: any) => ({
        ...material,
        id: `material-${Date.now()}-${Math.random()}`,
        quantity: material.quantity || 1
      }))
    };

    const updatedEstimate = [...existingEstimate, workWithMaterials];
    localStorage.setItem('projectEstimate', JSON.stringify(updatedEstimate));
    
    // Также добавляем в локальный стейт для отображения
    setEstimateWorks(prev => [...prev, workWithMaterials]);
    
    // Диспетчим событие для обновления других компонентов
    window.dispatchEvent(new CustomEvent('estimateUpdated', { 
      detail: { estimate: updatedEstimate, action: 'add', work: workWithMaterials }
    }));
    
    console.log('Работа сохранена в смету:', workWithMaterials);
    
    toast({
      title: "Работа добавлена в смету",
      description: `"${work.title}" добавлена в раздел "Смета". Перейдите в боковое меню > Смета для просмотра.`,
      duration: 4000,
    });
  };

  // Удаление работы из сметы
  const handleRemoveFromEstimate = (workId: string) => {
    saveToHistory("Удаление работы из сметы");
    setEstimateWorks(prev => prev.filter(w => w.id !== workId));
    
    toast({
      title: "Работа удалена из сметы",
      description: "Работа и все материалы удалены",
    });
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
                {currentData.sections.length} разделов, {currentData.sections.reduce((sum: number, s: any) => sum + s.works.length, 0)} работ, {currentData.sections.reduce((sum: number, s: any) => sum + s.works.reduce((workSum: number, w: any) => workSum + w.materials.length, 0), 0)} материалов
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleUndo}
                disabled={undoHistory.length === 0}
                title="Отменить последнее действие (Ctrl+Z)"
              >
                <X className="h-4 w-4 mr-2" />
                Отменить ({undoHistory.length})
              </Button>
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
                        const workTotal = work.quantity * (work.unitPrice || work.costPrice || 0);
                        
                        return (
                          <React.Fragment key={`work-${section.id}-${work.index}`}>
                            {/* Работа */}
                            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-blue-200">
                              <TableCell className="font-medium text-center">{work.stage}</TableCell>
                              <TableCell className="font-medium">{work.index}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddWorkToEstimate(work, section.title)}
                                    className="h-6 w-6 p-0 shrink-0"
                                    title="Добавить в смету"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  {work.materials.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleWorkMaterials(`${section.id}-${work.index}`)}
                                      className="h-6 w-6 p-0 shrink-0"
                                      title={expandedWorks.has(`${section.id}-${work.index}`) ? "Скрыть материалы" : "Показать материалы"}
                                    >
                                      {expandedWorks.has(`${section.id}-${work.index}`) ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                  <div className="font-medium">{work.title}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {/* Пустая колонка для работ */}
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
                            
                            {/* Материалы (показываем только если работа развернута) */}
                            {expandedWorks.has(`${section.id}-${work.index}`) && work.materials.map((material, materialIndex) => {
                              const isEditing = editingMaterial && 
                                editingMaterial.sectionId === section.id && 
                                editingMaterial.workIndex === work.index && 
                                editingMaterial.materialIndex === materialIndex;
                              
                              return (
                                <TableRow 
                                  key={`${section.id}-${work.index}-material-${materialIndex}`}
                                  className="bg-gray-50/50 dark:bg-gray-800/30 border-l-4 border-gray-300"
                                >
                                  <TableCell className="text-center text-gray-500">{material.unit}</TableCell>
                                  <TableCell className="text-gray-500">{work.index}</TableCell>
                                  <TableCell className="pl-8 text-gray-700 dark:text-gray-300">
                                    {isEditing ? (
                                      <div className="relative">
                                        <Input
                                          value={materialSearchTerm}
                                          onChange={(e) => setMaterialSearchTerm(e.target.value)}
                                          placeholder="Поиск материала..."
                                          className="text-sm"
                                          autoFocus
                                        />
                                        {searchResults.length > 0 && (
                                          <div className="absolute top-full left-0 z-50 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-y-auto min-w-[400px] w-max">
                                            {searchResults.map((result: any) => (
                                              <div
                                                key={result.id}
                                                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                                                onClick={() => handleSelectMaterial(result)}
                                              >
                                                <div className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[380px]" title={result.name}>
                                                  {result.name}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {result.unit} • ₽{parseFloat(result.pricePerUnit).toFixed(2)}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        <div className="flex gap-1 mt-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={handleCancelMaterialEdit}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div 
                                        className="text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                                        onClick={() => handleEditMaterial(section.id, work.index, materialIndex, material)}
                                      >
                                        {material.name}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {(() => {
                                      const imageUrl = findMaterialImage(material.name);
                                      return imageUrl ? (
                                        <img 
                                          src={imageUrl} 
                                          alt={material.name}
                                          className="w-12 h-12 object-cover rounded border mx-auto"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center text-xs text-gray-500 mx-auto">
                                          Нет фото
                                        </div>
                                      );
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-center text-gray-500">—</TableCell>
                                  <TableCell className="text-center font-mono text-gray-600">
                                    {material.quantity.toFixed(3)}
                                  </TableCell>
                                  <TableCell className="text-center text-gray-500">—</TableCell>
                                  <TableCell className="text-center font-mono text-gray-600">
                                    ₽ {(material.unitPrice || material.costPrice || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-center font-mono text-gray-600">
                                    ₽ {(material.quantity * (material.unitPrice || material.costPrice || 0)).toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    {!isEditing && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditMaterial(section.id, work.index, materialIndex, material)}
                                        className="h-8 w-8 p-0"
                                        title="Изменить материал"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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
                            ₽ {section.works.reduce((total, work) => total + (work.quantity * (work.unitPrice || work.costPrice || 0)), 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
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

      {/* Смета - показываем всегда для отладки */}
      <Card id="estimate-section" className="border-2 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Calculator className="h-5 w-5" />
            Смета проекта
            {estimateWorks.length > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {estimateWorks.length} работ
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {estimateWorks.length === 0 
              ? "Нажмите кнопку '+' рядом с работой чтобы добавить её в смету"
              : `Добавлено ${estimateWorks.length} работ в смету проекта`
            }
          </CardDescription>
        </CardHeader>
        {estimateWorks.length === 0 ? (
          <CardContent>
            <p className="text-gray-500 text-center py-4">
              Нажмите кнопку "+" рядом с работой чтобы добавить её в смету
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="w-12">Этап</TableHead>
                    <TableHead className="w-16">№</TableHead>
                    <TableHead>Наименование работ</TableHead>
                    <TableHead className="text-center w-20">Изображение</TableHead>
                    <TableHead className="text-center w-20">Ед.изм</TableHead>
                    <TableHead className="text-center w-20">Количество</TableHead>
                    <TableHead className="text-center w-20">Норма</TableHead>
                    <TableHead className="text-center w-24">Цена за ед.</TableHead>
                    <TableHead className="text-center w-24">Сумма</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimateWorks.map((work) => (
                    <React.Fragment key={work.id}>
                      {/* Заголовок раздела */}
                      <TableRow className="bg-blue-50 dark:bg-blue-950/20">
                        <TableCell colSpan={10} className="font-bold text-blue-700 dark:text-blue-300">
                          {work.sectionTitle}
                        </TableCell>
                      </TableRow>
                      
                      {/* Работа */}
                      <TableRow className="border-l-4 border-blue-200">
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
                          <Input
                            type="number"
                            value={work.quantity}
                            onChange={(e) => {
                              const newWorks = [...estimateWorks];
                              const workIndex = newWorks.findIndex(w => w.id === work.id);
                              if (workIndex !== -1) {
                                newWorks[workIndex].quantity = parseFloat(e.target.value) || 0;
                                setEstimateWorks(newWorks);
                              }
                            }}
                            className="w-20 text-center"
                            step="0.01"
                            min="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">—</TableCell>
                        <TableCell className="text-center font-mono">
                          ₽ {(work.unitPrice || work.costPrice || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          ₽ {(work.quantity * (work.unitPrice || work.costPrice || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromEstimate(work.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="Удалить из сметы"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Материалы */}
                      {work.materials.map((material: any, materialIndex: number) => (
                        <TableRow 
                          key={`${work.id}-material-${materialIndex}`}
                          className="bg-gray-50/50 dark:bg-gray-800/30 border-l-4 border-gray-300"
                        >
                          <TableCell className="text-center text-gray-500">{material.unit}</TableCell>
                          <TableCell className="text-gray-500">{work.index}</TableCell>
                          <TableCell className="pl-8 text-gray-700 dark:text-gray-300">
                            <div className="text-sm">{material.name}</div>
                          </TableCell>
                          <TableCell className="text-center text-gray-500">—</TableCell>
                          <TableCell className="text-center text-gray-500">—</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => {
                                const newWorks = [...estimateWorks];
                                const workIndex = newWorks.findIndex(w => w.id === work.id);
                                if (workIndex !== -1) {
                                  newWorks[workIndex].materials[materialIndex].quantity = parseFloat(e.target.value) || 0;
                                  setEstimateWorks(newWorks);
                                }
                              }}
                              className="w-20 text-center text-sm"
                              step="0.001"
                              min="0"
                            />
                          </TableCell>
                          <TableCell className="text-center text-gray-500">—</TableCell>
                          <TableCell className="text-center font-mono text-gray-600">
                            ₽ {(material.unitPrice || material.costPrice || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-gray-600">
                            ₽ {(material.quantity * (material.unitPrice || material.costPrice || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* Итого */}
                  <TableRow className="bg-green-50 dark:bg-green-950/20 border-t-2 font-bold">
                    <TableCell colSpan={8} className="text-right text-lg">
                      Итого по смете:
                    </TableCell>
                    <TableCell className="text-center font-mono text-lg font-bold text-green-700 dark:text-green-300">
                      ₽ {estimateWorks.reduce((total, work) => {
                        const workTotal = work.quantity * (work.unitPrice || work.costPrice || 0);
                        const materialsTotal = work.materials.reduce((matTotal: number, material: any) => 
                          matTotal + (material.quantity * (material.unitPrice || material.costPrice || 0)), 0
                        );
                        return total + workTotal + materialsTotal;
                      }, 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Старая версия для сравнения */}
      {estimateWorks.length > 0 && false && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Смета проекта
            </CardTitle>
            <CardDescription>
              {estimateWorks.length} работ в смете
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="w-12">Этап</TableHead>
                    <TableHead className="w-16">№</TableHead>
                    <TableHead>Наименование работ</TableHead>
                    <TableHead className="text-center w-20">Изображение</TableHead>
                    <TableHead className="text-center w-20">Ед.изм</TableHead>
                    <TableHead className="text-center w-20">Количество</TableHead>
                    <TableHead className="text-center w-20">Норма</TableHead>
                    <TableHead className="text-center w-24">Цена за ед.</TableHead>
                    <TableHead className="text-center w-24">Сумма</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimateWorks.map((work) => (
                    <React.Fragment key={work.id}>
                      {/* Заголовок раздела */}
                      <TableRow className="bg-blue-50 dark:bg-blue-950/20">
                        <TableCell colSpan={10} className="font-bold text-blue-700 dark:text-blue-300">
                          {work.sectionTitle}
                        </TableCell>
                      </TableRow>
                      
                      {/* Работа */}
                      <TableRow className="border-l-4 border-blue-200">
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
                          <Input
                            type="number"
                            value={work.quantity}
                            onChange={(e) => {
                              const newWorks = [...estimateWorks];
                              const workIndex = newWorks.findIndex(w => w.id === work.id);
                              if (workIndex !== -1) {
                                newWorks[workIndex].quantity = parseFloat(e.target.value) || 0;
                                setEstimateWorks(newWorks);
                              }
                            }}
                            className="w-20 text-center"
                            step="0.01"
                            min="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">—</TableCell>
                        <TableCell className="text-center font-mono">
                          ₽ {(work.unitPrice || work.costPrice || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          ₽ {(work.quantity * (work.unitPrice || work.costPrice || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromEstimate(work.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            title="Удалить из сметы"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Материалы */}
                      {work.materials.map((material: any, materialIndex: number) => (
                        <TableRow 
                          key={`${work.id}-material-${materialIndex}`}
                          className="bg-gray-50/50 dark:bg-gray-800/30 border-l-4 border-gray-300"
                        >
                          <TableCell className="text-center text-gray-500">{material.unit}</TableCell>
                          <TableCell className="text-gray-500">{work.index}</TableCell>
                          <TableCell className="pl-8 text-gray-700 dark:text-gray-300">
                            <div className="text-sm">{material.name}</div>
                          </TableCell>
                          <TableCell className="text-center text-gray-500">—</TableCell>
                          <TableCell className="text-center text-gray-500">—</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => {
                                const newWorks = [...estimateWorks];
                                const workIndex = newWorks.findIndex(w => w.id === work.id);
                                if (workIndex !== -1) {
                                  newWorks[workIndex].materials[materialIndex].quantity = parseFloat(e.target.value) || 0;
                                  setEstimateWorks(newWorks);
                                }
                              }}
                              className="w-20 text-center text-sm"
                              step="0.001"
                              min="0"
                            />
                          </TableCell>
                          <TableCell className="text-center text-gray-500">—</TableCell>
                          <TableCell className="text-center font-mono text-gray-600">
                            ₽ {(material.unitPrice || material.costPrice || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-gray-600">
                            ₽ {(material.quantity * (material.unitPrice || material.costPrice || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* Итого */}
                  <TableRow className="bg-green-50 dark:bg-green-950/20 border-t-2 font-bold">
                    <TableCell colSpan={8} className="text-right text-lg">
                      Итого по смете:
                    </TableCell>
                    <TableCell className="text-center font-mono text-lg font-bold text-green-700 dark:text-green-300">
                      ₽ {estimateWorks.reduce((total, work) => {
                        const workTotal = work.quantity * (work.unitPrice || work.costPrice || 0);
                        const materialsTotal = work.materials.reduce((matTotal: number, material: any) => 
                          matTotal + (material.quantity * (material.unitPrice || material.costPrice || 0)), 0
                        );
                        return total + workTotal + materialsTotal;
                      }, 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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