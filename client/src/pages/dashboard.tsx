import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { WorksList } from "@/components/works-list";
import { WorkDetails } from "@/components/work-details";
import { ProjectSummary } from "@/components/project-summary";
import { WorkModal } from "@/components/work-modal";
import { MaterialModal } from "@/components/material-modal";

import { MaterialPrices } from "@/components/material-prices";
import { HierarchyDatabase } from "@/components/hierarchy-database";
import { DetailedEstimate } from "@/components/detailed-estimate";
import { WorksEstimate } from "@/components/works-estimate";
import { RoomParametersTable } from "@/components/room-parameters-table";
import { SummaryTable } from "@/components/summary-table";
import AreaWorkLinking from "@/components/area-work-linking";
import { useToast } from "@/hooks/use-toast";
import type { ProjectWithWorkItems, WorkItem, Project } from "@shared/schema";

interface RoomData {
  length: number;
  height: number;
  floorArea: number;
  window1_a: number;
  window1_b: number;
  window2_a: number;
  window2_b: number;
  window3_a: number;
  window3_b: number;
  portal_a: number;
  portal_b: number;
  doors: number;
}

export default function Dashboard() {
  const [currentProjectId, setCurrentProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("project-params");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [roomsData, setRoomsData] = useState<RoomData[]>(Array.from({ length: 12 }, () => ({
    length: 0,
    height: 0,
    floorArea: 0,
    window1_a: 0,
    window1_b: 0,
    window2_a: 0,
    window2_b: 0,
    window3_a: 0,
    window3_b: 0,
    portal_a: 0,
    portal_b: 0,
    doors: 0,
  })));
  
  const { toast } = useToast();

  // Get projects list for selector
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Get current project with work items
  const { data: currentProject = null, isLoading } = useQuery<ProjectWithWorkItems>({
    queryKey: ["/api/projects", currentProjectId],
    enabled: !!currentProjectId,
  });

  // Auto-select first project if none selected
  useEffect(() => {
    if (!currentProjectId && projects.length > 0) {
      setCurrentProjectId(projects[0].id);
    }
  }, [projects, currentProjectId]);

  const handleProjectChange = (projectId: string) => {
    setCurrentProjectId(projectId);
    setSelectedWorkId(null);
  };

  const handleWorkSelect = (workId: string) => {
    setSelectedWorkId(workId);
  };

  const handleAddWork = () => {
    setEditingWork(null);
    setIsWorkModalOpen(true);
  };

  const handleEditWork = (workId: string) => {
    const work = currentProject?.workItems.find(w => w.id === workId);
    if (work) {
      setEditingWork(work);
      setIsWorkModalOpen(true);
    }
  };

  const handleAddMaterial = () => {
    if (selectedWorkId && currentProject) {
      const selectedWork = currentProject.workItems.find(w => w.id === selectedWorkId);
      if (selectedWork) {
        setIsMaterialModalOpen(true);
      }
    } else {
      toast({
        title: "Выберите работу",
        description: "Сначала выберите работу для добавления материала",
        variant: "destructive",
      });
    }
  };

  const handleCalculate = () => {
    toast({
      title: "Расчёт выполнен",
      description: "Все стоимости пересчитаны",
    });
  };

  const handleExportPDF = useCallback(() => {
    toast({
      title: "Экспорт PDF",
      description: "Функция экспорта в PDF будет реализована",
    });
  }, [toast]);

  const handleExportExcel = useCallback(() => {
    toast({
      title: "Экспорт Excel", 
      description: "Функция экспорта в Excel будет реализована",
    });
  }, [toast]);

  const handleNewProject = () => {
    toast({
      title: "Новый проект",
      description: "Функция создания нового проекта будет реализована",
    });
  };

  const handleOpenProject = () => {
    toast({
      title: "Открыть проект",
      description: "Функция открытия проекта будет реализована",
    });
  };

  const handleSaveProject = () => {
    toast({
      title: "Проект сохранён",
      description: "Все изменения автоматически сохраняются",
    });
  };

  const handleRoomDataChange = (roomIndex: number, newData: RoomData) => {
    const newRoomsData = [...roomsData];
    newRoomsData[roomIndex] = newData;
    setRoomsData(newRoomsData);
  };

  const selectedWork = currentProject?.workItems.find(w => w.id === selectedWorkId) || null;

  if (isLoading && currentProjectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка проекта...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark">
      <Header
        currentProject={currentProject}
        onProjectChange={handleProjectChange}
      />

      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={handleSaveProject}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />

        <main className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {activeTab === "project-params" && "Параметры объекта"}
                  {activeTab === "works" && "Виды работ"}
                  {activeTab === "materials" && "Материалы"}
                  {activeTab === "estimate" && "Смета"}
                  {activeTab === "reports" && "Отчеты"}
                  {activeTab === "material-prices" && "Цены на материалы"}
                  {activeTab === "hierarchy-db" && "База работ"}
                  {activeTab === "area-linking" && "Привязка площадей к работам"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeTab === "project-params" && "Настройка параметров объекта строительства"}
                  {activeTab === "works" && "Управление видами работ проекта с количеством и суммами"}
                  {activeTab === "materials" && "Управление материалами проекта"}
                  {activeTab === "estimate" && "Просмотр и экспорт сметы"}
                  {activeTab === "reports" && "Отчёты и аналитика"}
                  {activeTab === "material-prices" && "Управление ценами материалов и ссылками"}
                  {activeTab === "hierarchy-db" && "Управление иерархической структурой работ"}
                  {activeTab === "area-linking" && "Автоматическое заполнение объемов работ на основе площадей помещений"}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "project-params" && (
                <div className="space-y-6">
                  {/* Верхняя секция с двумя колонками */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Основные параметры */}
                    <div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold mb-4">Основные параметры объекта</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Название объекта</label>
                            <input 
                              type="text" 
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                              placeholder="Введите название объекта"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Адрес объекта</label>
                            <input 
                              type="text" 
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                              placeholder="Введите адрес объекта"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Номер договора</label>
                              <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                placeholder="№ 001/2025"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Срок выполнения (рабочих дней)</label>
                              <input 
                                type="number" 
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                placeholder="30"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Заказчик</label>
                              <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                placeholder="Наименование заказчика"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Подрядчик</label>
                              <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                placeholder="Наименование подрядчика"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Общая площадь (м²)</label>
                              <input 
                                type="number" 
                                value={roomsData.reduce((sum, room) => sum + (room.floorArea || 0), 0).toFixed(2)}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Количество этажей</label>
                              <input 
                                type="number" 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                                placeholder="1"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Тип объекта</label>
                            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                              <option value="">Выберите тип объекта</option>
                              <option value="residential">Жилой дом</option>
                              <option value="commercial">Коммерческое здание</option>
                              <option value="industrial">Промышленное здание</option>
                              <option value="other">Другое</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Примечания</label>
                            <textarea 
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                              placeholder="Дополнительная информация об объекте"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Сводная таблица габаритов */}
                    <div>
                      <SummaryTable roomsData={roomsData} />
                    </div>
                  </div>

                  {/* Таблица габаритов помещений */}
                  <RoomParametersTable onDataChange={handleRoomDataChange} />
                </div>
              )}

              {activeTab === "works" && (
                !currentProject ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <h3 className="text-lg font-medium mb-2">Нет выбранного проекта</h3>
                      <p>Выберите проект из списка выше</p>
                    </div>
                  </div>
                ) : (
                  <WorksEstimate projectId={currentProjectId} />
                )
              )}

              {activeTab === "material-prices" && (
                <MaterialPrices />
              )}

              {activeTab === "hierarchy-db" && (
                <HierarchyDatabase />
              )}

              {activeTab === "area-linking" && (
                <AreaWorkLinking 
                  roomsData={roomsData}
                  onAreaLinkingChange={(taskId, config) => {
                    // Обновление конфигурации привязки площадей
                    console.log("Area linking updated:", taskId, config);
                  }}
                />
              )}

              {activeTab === "estimate" && (
                <DetailedEstimate projectId={currentProjectId} />
              )}

              {(activeTab === "materials" || activeTab === "reports") && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <h3 className="text-lg font-medium mb-2">Раздел в разработке</h3>
                    <p>Этот раздел будет добавлен в следующих версиях</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Project Summary */}
      <ProjectSummary
        project={currentProject}
        onGenerateReport={() => toast({ title: "Генерация отчёта", description: "Функция будет реализована" })}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      />

      {/* Modals */}
      {currentProject && (
        <>
          <WorkModal
            isOpen={isWorkModalOpen}
            onClose={() => setIsWorkModalOpen(false)}
            projectId={currentProjectId}
            editingWork={editingWork}
          />

          {selectedWork && (
            <MaterialModal
              isOpen={isMaterialModalOpen}
              onClose={() => setIsMaterialModalOpen(false)}
              workItem={selectedWork}
              projectId={currentProjectId}
            />
          )}
        </>
      )}
    </div>
  );
}
