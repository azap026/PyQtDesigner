import { useTheme } from "./theme-provider";
import { Moon, Sun, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";

interface HeaderProps {
  currentProject: Project | null;
  onProjectChange: (projectId: string) => void;
}

export function Header({ currentProject, onProjectChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-full px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-primary">СметаПро</h1>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Система расчёта строительных смет
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Project Selector */}
            <Select
              value={currentProject?.id || ""}
              onValueChange={onProjectChange}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Выберите проект" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    Проект: {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                <span>ИП</span>
              </div>
              <span className="text-sm font-medium">Иван Петров</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
