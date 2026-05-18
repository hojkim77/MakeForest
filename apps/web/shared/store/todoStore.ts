import { create } from 'zustand';
import type { Todo } from '@makeforest/types';

interface TodoState {
  todos: Todo[];
  savedTodos: Todo[];
  open: boolean;
  init: (todos: Todo[]) => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  setOpen: (open: boolean) => void;
  markSaved: () => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  savedTodos: [],
  open: false,

  addTodo: (text) =>
    set((s) => ({
      todos: [...s.todos, { id: crypto.randomUUID(), text, done: false }],
    })),

  toggleTodo: (id) =>
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),

  removeTodo: (id) =>
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),

  setOpen: (open) => set({ open }),

  init: (todos) => set({ todos, savedTodos: todos }),

  markSaved: () => set((s) => ({ savedTodos: s.todos })),
}));

export function selectIsDirty(s: TodoState): boolean {
  return JSON.stringify(s.todos) !== JSON.stringify(s.savedTodos);
}
