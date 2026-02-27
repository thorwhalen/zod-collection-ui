import { z } from 'zod';
import { defineCollection, createInMemoryProvider } from 'zod-collection-ui';

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).meta({
    title: 'Task Title',
    description: 'Short description of the task',
    searchable: true,
    inlineEditable: true,
    summaryField: true,
  }),
  description: z.string().optional().meta({
    editWidget: 'richtext',
    detailOnly: true,
  }),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'blocked']).meta({
    badge: {
      todo: 'secondary',
      in_progress: 'default',
      review: 'warning',
      done: 'success',
      blocked: 'destructive',
    },
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical']).meta({
    badge: {
      low: 'ghost',
      medium: 'secondary',
      high: 'default',
      critical: 'destructive',
    },
  }),
  assignee: z.string().optional().meta({
    title: 'Assigned To',
    filterable: 'select',
    searchable: true,
  }),
  labels: z.array(z.string()).meta({
    title: 'Labels',
    filterable: 'contains',
  }),
  storyPoints: z.number().int().min(1).max(13).optional().meta({
    title: 'Points',
    columnWidth: 80,
  }),
  dueDate: z.date().optional().meta({
    title: 'Due Date',
    sortable: 'both',
    filterable: 'range',
  }),
  completedAt: z.date().optional().meta({
    editable: false,
    visible: false,
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

export const tasksCollection = defineCollection(TaskSchema, {
  affordances: {
    create: true,
    bulkDelete: true,
    bulkEdit: ['status', 'priority', 'assignee'],
    search: { debounce: 200, placeholder: 'Search tasks...' },
    pagination: { defaultPageSize: 25, style: 'pages' },
    defaultSort: { field: 'createdAt', direction: 'desc' },
    selectable: 'multi',
    groupBy: { defaultField: 'status', collapsible: true },
    views: ['table', 'kanban', 'list'],
    defaultView: 'table',
    filterPresets: [
      { name: 'my-tasks', label: 'My Tasks', filters: { assignee: 'current-user' } },
      { name: 'blocked', label: 'Blocked', filters: { status: 'blocked' }, icon: 'AlertCircle' },
    ],
  },
  operations: [
    { name: 'markDone', label: 'Mark Done', scope: 'item', icon: 'Check', variant: 'default' },
    { name: 'assign', label: 'Assign To...', scope: 'item', icon: 'User' },
    { name: 'bulkAssign', label: 'Assign Selected', scope: 'selection', icon: 'Users' },
    { name: 'bulkMove', label: 'Move to Status...', scope: 'selection', icon: 'ArrowRight' },
    { name: 'sprint', label: 'Sprint Report', scope: 'collection', icon: 'BarChart' },
  ],
});

export const sampleTasks: Task[] = [
  { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', title: 'Implement login flow', description: 'OAuth2 + JWT', status: 'in_progress', priority: 'high', assignee: 'alice', labels: ['auth', 'frontend'], storyPoints: 8, dueDate: new Date('2024-09-15'), completedAt: undefined, createdAt: new Date('2024-08-01'), updatedAt: new Date('2024-08-20') },
  { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', title: 'Design system audit', description: 'Review all components', status: 'todo', priority: 'medium', assignee: 'bob', labels: ['design', 'cleanup'], storyPoints: 5, dueDate: new Date('2024-09-30'), completedAt: undefined, createdAt: new Date('2024-08-05'), updatedAt: new Date('2024-08-05') },
  { id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', title: 'Fix pagination bug', description: 'Off-by-one on last page', status: 'review', priority: 'critical', assignee: 'alice', labels: ['bug', 'backend'], storyPoints: 3, dueDate: new Date('2024-09-10'), completedAt: undefined, createdAt: new Date('2024-08-10'), updatedAt: new Date('2024-08-25') },
  { id: 'd4e5f6a7-b8c9-0123-defa-234567890123', title: 'Write API docs', description: 'OpenAPI spec for v2', status: 'done', priority: 'low', assignee: 'charlie', labels: ['docs'], storyPoints: 5, dueDate: undefined, completedAt: new Date('2024-08-15'), createdAt: new Date('2024-07-20'), updatedAt: new Date('2024-08-15') },
  { id: 'e5f6a7b8-c9d0-1234-efab-345678901234', title: 'Database migration', description: 'PostgreSQL 16 upgrade', status: 'blocked', priority: 'high', assignee: undefined, labels: ['backend', 'infra'], storyPoints: 13, dueDate: new Date('2024-10-01'), completedAt: undefined, createdAt: new Date('2024-08-12'), updatedAt: new Date('2024-08-22') },
  { id: 'f6a7b8c9-d0e1-2345-fabc-456789012345', title: 'Mobile responsive tables', description: undefined, status: 'todo', priority: 'medium', assignee: 'bob', labels: ['frontend', 'mobile'], storyPoints: 8, dueDate: undefined, completedAt: undefined, createdAt: new Date('2024-08-18'), updatedAt: new Date('2024-08-18') },
];

export const tasksProvider = createInMemoryProvider(sampleTasks, {
  searchFields: ['title', 'description'],
});
