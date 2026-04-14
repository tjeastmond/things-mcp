export type TodoSummary = {
  id: string;
  title: string;
  notes?: string;
  when?: string;
  deadline?: string;
  tags?: string[];
  project?: string;
  area?: string;
};

export type TodoDetail = TodoSummary & {
  status?: string;
};

export type ListTodosResult = {
  items: TodoSummary[];
  count: number;
};
