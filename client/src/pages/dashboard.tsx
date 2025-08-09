import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { WorksList } from "@/components/works-list";
import { WorkDetails } from "@/components/work-details";
import { ProjectSummary } from "@/components/project-summary";
import { WorkModal } from "@/components/work-modal";
import { MaterialModal } from "@/components/material-modal";
import { MaterialsDatabase } from "@/components/materials-database";
import { MaterialPrices } from "@/components/material-prices";
import { HierarchyDatabase } from "@/components/hierarchy-database";
import { useToast } from "@/hooks/use-toast";
import type { ProjectWithWorkItems, WorkItem, Project } from "@shared/schema";

export default function Dashboard() {
  const [currentProjectId, setCurrentProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("works");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  
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
                  {activeTab === "works" && "Виды работ"}
                  {activeTab === "materials" && "Материалы"}
                  {activeTab === "estimate" && "Смета"}
                  {activeTab === "reports" && "Отчеты"}
                  {activeTab === "materials-db" && "База данных материалов"}
                  {activeTab === "material-prices" && "Цены на материалы"}
                  {activeTab === "hierarchy-db" && "База работ"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeTab === "works" && "Управление видами работ и расчёт стоимости"}
                  {activeTab === "materials" && "Управление материалами проекта"}
                  {activeTab === "estimate" && "Просмотр и экспорт сметы"}
                  {activeTab === "reports" && "Отчёты и аналитика"}
                  {activeTab === "materials-db" && "Управление справочником материалов"}
                  {activeTab === "material-prices" && "Управление ценами материалов и ссылками"}
                  {activeTab === "hierarchy-db" && "Управление иерархической структурой работ"}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "works" && (
                !currentProject ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <h3 className="text-lg font-medium mb-2">Нет выбранного проекта</h3>
                      <p>Выберите проект из списка выше</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    <WorksList
                      workItems={currentProject.workItems}
                      selectedWorkId={selectedWorkId}
                      onWorkSelect={handleWorkSelect}
                      onAddWork={handleAddWork}
                      onEditWork={handleEditWork}
                      onCalculate={handleCalculate}
                      projectId={currentProjectId}
                    />

                    <WorkDetails
                      selectedWork={selectedWork}
                      onAddMaterial={handleAddMaterial}
                      projectId={currentProjectId}
                    />
                  </div>
                )
              )}

              {activeTab === "materials-db" && (
                <MaterialsDatabase />
              )}

              {activeTab === "material-prices" && (
                <MaterialPrices />
              )}

              {activeTab === "hierarchy-db" && (
                <HierarchyDatabase />
              )}

              {(activeTab === "materials" || activeTab === "estimate" || activeTab === "reports") && (
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
