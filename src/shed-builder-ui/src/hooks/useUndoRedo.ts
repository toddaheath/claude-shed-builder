import { useState, useCallback, useRef } from 'react';

interface UndoRedoState<T> {
  current: T;
  canUndo: boolean;
  canRedo: boolean;
  push: (state: T) => void;
  undo: () => T | undefined;
  redo: () => T | undefined;
  reset: (state: T) => void;
}

export function useUndoRedo<T>(initialState: T, maxHistory = 50): UndoRedoState<T> {
  const [current, setCurrent] = useState(initialState);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);

  const push = useCallback((state: T) => {
    setCurrent(prev => {
      undoStack.current.push(prev);
      if (undoStack.current.length > maxHistory) {
        undoStack.current.shift();
      }
      redoStack.current = [];
      return state;
    });
    setCanUndo(true);
    setCanRedo(false);
  }, [maxHistory]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev !== undefined) {
      setCurrent(c => {
        redoStack.current.push(c);
        return prev;
      });
      setCanUndo(undoStack.current.length > 0);
      setCanRedo(true);
      return prev;
    }
    return undefined;
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next !== undefined) {
      setCurrent(c => {
        undoStack.current.push(c);
        return next;
      });
      setCanUndo(true);
      setCanRedo(redoStack.current.length > 0);
      return next;
    }
    return undefined;
  }, []);

  const reset = useCallback((state: T) => {
    undoStack.current = [];
    redoStack.current = [];
    setCurrent(state);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return {
    current,
    canUndo,
    canRedo,
    push,
    undo,
    redo,
    reset,
  };
}
