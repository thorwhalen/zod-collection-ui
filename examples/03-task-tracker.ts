/**
 * Example 03: Task Tracker
 *
 * A more complex example showing Zod .meta() annotations,
 * custom operations, state management, and the full pipeline
 * from schema → data provider → state store.
 *
 * Run: npx tsx examples/03-task-tracker.ts
 */

import { z } from 'zod';
import {
  defineCollection,
  toColumnDefs,
  toFormConfig,
  toFilterConfig,
  createCollectionStore,
  createInMemoryProvider,
  toPrompt,
} from '../src/index.js';

// ============================================================================
// Schema with .meta() annotations (Zod v4 native metadata)
// ============================================================================

const TaskSchema = z.object({
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

type Task = z.infer<typeof TaskSchema>;

// ============================================================================
// Collection definition
// ============================================================================

const tasks = defineCollection(TaskSchema, {
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
      { name: 'overdue', label: 'Overdue', filters: {}, icon: 'Clock' },
    ],
  },
  operations: [
    {
      name: 'markDone',
      label: 'Mark Done',
      scope: 'item',
      icon: 'Check',
      variant: 'default',
    },
    {
      name: 'assign',
      label: 'Assign To...',
      scope: 'item',
      icon: 'User',
    },
    {
      name: 'bulkAssign',
      label: 'Assign Selected',
      scope: 'selection',
      icon: 'Users',
    },
    {
      name: 'bulkMove',
      label: 'Move to Status...',
      scope: 'selection',
      icon: 'ArrowRight',
    },
    {
      name: 'sprint',
      label: 'Sprint Report',
      scope: 'collection',
      icon: 'BarChart',
    },
  ],
});

// ============================================================================
// Sample data
// ============================================================================

const sampleTasks: Task[] = [
  { id: '1', title: 'Implement login flow', description: 'OAuth2 + JWT', status: 'in_progress', priority: 'high', assignee: 'alice', labels: ['auth', 'frontend'], storyPoints: 8, dueDate: new Date('2024-09-15'), completedAt: undefined, createdAt: new Date('2024-08-01'), updatedAt: new Date('2024-08-20') },
  { id: '2', title: 'Design system audit', description: 'Review all components', status: 'todo', priority: 'medium', assignee: 'bob', labels: ['design', 'cleanup'], storyPoints: 5, dueDate: new Date('2024-09-30'), completedAt: undefined, createdAt: new Date('2024-08-05'), updatedAt: new Date('2024-08-05') },
  { id: '3', title: 'Fix pagination bug', description: 'Off-by-one on last page', status: 'review', priority: 'critical', assignee: 'alice', labels: ['bug', 'backend'], storyPoints: 3, dueDate: new Date('2024-09-10'), completedAt: undefined, createdAt: new Date('2024-08-10'), updatedAt: new Date('2024-08-25') },
  { id: '4', title: 'Write API docs', description: 'OpenAPI spec for v2', status: 'done', priority: 'low', assignee: 'charlie', labels: ['docs'], storyPoints: 5, dueDate: undefined, completedAt: new Date('2024-08-15'), createdAt: new Date('2024-07-20'), updatedAt: new Date('2024-08-15') },
  { id: '5', title: 'Database migration', description: 'PostgreSQL 16 upgrade', status: 'blocked', priority: 'high', assignee: undefined, labels: ['backend', 'infra'], storyPoints: 13, dueDate: new Date('2024-10-01'), completedAt: undefined, createdAt: new Date('2024-08-12'), updatedAt: new Date('2024-08-22') },
  { id: '6', title: 'Mobile responsive tables', description: undefined, status: 'todo', priority: 'medium', assignee: 'bob', labels: ['frontend', 'mobile'], storyPoints: 8, dueDate: undefined, completedAt: undefined, createdAt: new Date('2024-08-18'), updatedAt: new Date('2024-08-18') },
];

// ============================================================================
// Demo
// ============================================================================

(async () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Task Tracker — Full Pipeline Demo          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  // 1. Schema description
  console.log('=== Collection Description ===');
  console.log(tasks.describe());
  console.log();

  // 2. Column defs for the table
  const cols = toColumnDefs(tasks);
  console.log(`=== Table Columns (${cols.length}) ===`);
  for (const col of cols) {
    if (col.id === 'select' || col.id === 'actions') {
      console.log(`  [${col.id}]`);
      continue;
    }
    const meta = [];
    if (col.meta.badge) meta.push('badge');
    if (col.meta.inlineEditable) meta.push('inline-edit');
    if (col.meta.enumValues) meta.push(`enum:${col.meta.enumValues.length}`);
    console.log(`  ${col.id}: "${col.header}" sort=${col.enableSorting} filter=${col.meta.filterType} ${meta.join(' ')}`);
  }
  console.log();

  // 3. Create and edit forms
  const createForm = toFormConfig(tasks, 'create');
  const editForm = toFormConfig(tasks, 'edit');
  console.log(`=== Create Form (${createForm.length} fields) ===`);
  for (const f of createForm) {
    console.log(`  ${f.name}: ${f.type}${f.options ? ` [${f.options.length} options]` : ''}`);
  }
  console.log();
  console.log(`=== Edit Form (${editForm.length} fields) ===`);
  for (const f of editForm) {
    console.log(`  ${f.name}: ${f.type} disabled=${f.disabled}`);
  }
  console.log();

  // 4. Data provider operations
  const provider = createInMemoryProvider(sampleTasks, {
    searchFields: ['title', 'description'],
  });

  // Filter: in-progress + high priority
  const urgent = await provider.getList({
    filter: [
      { id: 'status', value: ['in_progress', 'blocked'] },
      { id: 'priority', value: ['high', 'critical'] },
    ],
    sort: [{ id: 'priority', desc: false }],
  });
  console.log(`=== Urgent Tasks (${urgent.total}) ===`);
  for (const t of urgent.data) {
    console.log(`  [${t.priority.toUpperCase()}] ${t.title} — ${t.status} (${t.assignee ?? 'unassigned'})`);
  }
  console.log();

  // Search
  const searchResult = await provider.getList({ search: 'bug' });
  console.log(`=== Search "bug" (${searchResult.total} results) ===`);
  for (const t of searchResult.data) {
    console.log(`  ${t.title}: ${t.description ?? '(no description)'}`);
  }
  console.log();

  // 5. State management: simulate a user session
  const store = createCollectionStore<Task>(tasks);
  let state = store.initialState;

  // Load data
  const allTasks = await provider.getList({
    sort: state.sorting,
    pagination: { page: state.pagination.pageIndex + 1, pageSize: state.pagination.pageSize },
  });
  state = store.actions.setItems(state, allTasks.data, allTasks.total);
  console.log(`=== State: Loaded ${allTasks.total} tasks ===`);

  // Apply a filter
  state = store.actions.setColumnFilters(state, [{ id: 'assignee', value: 'alice' }]);
  console.log(`Filtered by assignee=alice → page reset to ${state.pagination.pageIndex}`);

  // Select some items
  state = store.actions.setRowSelection(state, { '0': true, '2': true });
  console.log(`Selected ${store.selectors.getSelectedCount(state)} items:`,
    store.selectors.getSelectedItems(state).map(t => t.title));

  // Reset
  state = store.actions.reset(state);
  console.log('After reset: filters=', state.columnFilters.length, 'selection=', store.selectors.getSelectedCount(state));
  console.log();

  // 6. AI prompt
  console.log('=== AI Prompt (truncated) ===');
  const prompt = toPrompt(tasks);
  // Show first 40 lines
  const lines = prompt.split('\n');
  console.log(lines.slice(0, 40).join('\n'));
  if (lines.length > 40) {
    console.log(`... (${lines.length - 40} more lines)`);
  }
})();
