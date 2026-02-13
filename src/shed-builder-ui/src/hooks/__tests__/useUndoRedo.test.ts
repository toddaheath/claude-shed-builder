import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';

describe('useUndoRedo', () => {
  it('starts with initial state', () => {
    const { result } = renderHook(() => useUndoRedo('a'));
    expect(result.current.current).toBe('a');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('pushes and undoes', () => {
    const { result } = renderHook(() => useUndoRedo('a'));

    act(() => result.current.push('b'));
    expect(result.current.current).toBe('b');
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.current).toBe('a');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redoes after undo', () => {
    const { result } = renderHook(() => useUndoRedo('a'));

    act(() => result.current.push('b'));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.current).toBe('b');
    expect(result.current.canRedo).toBe(false);
  });

  it('clears redo stack on push', () => {
    const { result } = renderHook(() => useUndoRedo('a'));

    act(() => result.current.push('b'));
    act(() => result.current.undo());
    act(() => result.current.push('c'));

    expect(result.current.current).toBe('c');
    expect(result.current.canRedo).toBe(false);
  });

  it('respects maxHistory', () => {
    const { result } = renderHook(() => useUndoRedo(0, 3));

    act(() => result.current.push(1));
    act(() => result.current.push(2));
    act(() => result.current.push(3));
    act(() => result.current.push(4));

    // Should only keep 3 undo states
    act(() => result.current.undo());
    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(result.current.canUndo).toBe(false);
  });

  it('reset clears history', () => {
    const { result } = renderHook(() => useUndoRedo('a'));

    act(() => result.current.push('b'));
    act(() => result.current.push('c'));
    act(() => result.current.reset('x'));

    expect(result.current.current).toBe('x');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
