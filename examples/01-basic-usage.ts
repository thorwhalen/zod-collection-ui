/**
 * Example 01: Basic Usage
 *
 * Shows the simplest possible usage: define a Zod schema, get a collection
 * with auto-inferred affordances, and generate table/form/filter configs.
 *
 * Run: npx tsx examples/01-basic-usage.ts
 */

import { z } from 'zod';
import { defineCollection, toColumnDefs, toFormConfig, toFilterConfig } from '../src/index.js';

// 1. Define your data schema — that's it, no annotations needed
const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  status: z.enum(['draft', 'active', 'archived']),
  priority: z.number().int().min(1).max(5),
  tags: z.array(z.string()),
  createdAt: z.date(),
});

// 2. Create a collection — affordances are auto-inferred from Zod types + field names
const projects = defineCollection(ProjectSchema);

// 3. See what was inferred
console.log('=== Collection Description ===');
console.log(projects.describe());
console.log();

// 4. See the auto-inferred field affordances
console.log('=== Field Affordances ===');
for (const [key, fa] of Object.entries(projects.fieldAffordances)) {
  console.log(`  ${key} (${fa.zodType}): sortable=${fa.sortable}, filterable=${fa.filterable}, searchable=${fa.searchable}, editable=${fa.editable}, visible=${fa.visible}`);
}
console.log();

// 5. Generate table column definitions (TanStack Table compatible)
const columns = toColumnDefs(projects);
console.log('=== Column Definitions ===');
for (const col of columns) {
  console.log(`  ${col.id}: header="${col.header}", sort=${col.enableSorting}, filter=${col.enableColumnFilter}, sortFn=${col.sortingFn}`);
}
console.log();

// 6. Generate form field configurations
const createForm = toFormConfig(projects, 'create');
console.log('=== Create Form Fields ===');
for (const field of createForm) {
  console.log(`  ${field.name}: type=${field.type}, required=${field.required}, disabled=${field.disabled}`);
}
console.log();

// 7. Generate filter panel configurations
const filters = toFilterConfig(projects);
console.log('=== Filter Configuration ===');
for (const filter of filters) {
  let detail = `  ${filter.name}: ${filter.filterType}`;
  if (filter.options) detail += ` (options: ${filter.options.map(o => o.value).join(', ')})`;
  if (filter.bounds) detail += ` (range: ${filter.bounds.min}-${filter.bounds.max})`;
  console.log(detail);
}
console.log();

// 8. Query methods
console.log('=== Query Methods ===');
console.log('Visible fields:', projects.getVisibleFields());
console.log('Searchable fields:', projects.getSearchableFields());
console.log('Sortable fields:', projects.getSortableFields().map(f => f.key));
console.log('Groupable fields:', projects.getGroupableFields().map(f => f.key));
console.log('ID field:', projects.idField);
console.log('Label field:', projects.labelField);
