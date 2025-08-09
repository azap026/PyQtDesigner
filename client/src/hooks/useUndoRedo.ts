import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface UndoAction {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  timestamp: number;
}

export function useUndoRedo() {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const { toast } = useToast();

  const addAction = useCallback((action: Omit<UndoAction, 'id' | 'timestamp'>) => {
    const undoAction: UndoAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    
    setUndoStack(prev => [...prev.slice(-9), undoAction]); // Храним последние 10 действий
  }, []);

  const undo = useCallback(async () => {
    if (undoStack.length === 0) {
      toast({
        title: "Нет действий для отмены",
        description: "История действий пуста",
        variant: "default",
      });
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    
    try {
      await lastAction.undo();
      setUndoStack(prev => prev.slice(0, -1));
      
      toast({
        title: "Действие отменено",
        description: lastAction.description,
        variant: "default",
      });
    } catch (error) {
      console.error('Ошибка при отмене действия:', error);
      toast({
        title: "Ошибка отмены",
        description: "Не удалось отменить последнее действие",
        variant: "destructive",
      });
    }
  }, [undoStack, toast]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
  }, []);

  // Глобальный обработчик Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return {
    addAction,
    undo,
    clearHistory,
    canUndo: undoStack.length > 0,
    undoStack,
  };
}