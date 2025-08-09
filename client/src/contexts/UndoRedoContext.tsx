import { createContext, useContext, ReactNode } from 'react';
import { useUndoRedo, UndoAction } from '@/hooks/useUndoRedo';

interface UndoRedoContextType {
  addAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
  undo: () => Promise<void>;
  clearHistory: () => void;
  canUndo: boolean;
  undoStack: UndoAction[];
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

export function UndoRedoProvider({ children }: { children: ReactNode }) {
  const undoRedo = useUndoRedo();

  return (
    <UndoRedoContext.Provider value={undoRedo}>
      {children}
    </UndoRedoContext.Provider>
  );
}

export function useUndoRedoContext() {
  const context = useContext(UndoRedoContext);
  if (context === undefined) {
    throw new Error('useUndoRedoContext must be used within a UndoRedoProvider');
  }
  return context;
}