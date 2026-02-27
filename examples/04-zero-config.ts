/**
 * Example 04: Zero Configuration
 *
 * Demonstrates the "convention over configuration" principle:
 * a plain Zod schema with no .meta() and no config produces
 * a fully-functional collection with sensible defaults.
 *
 * This is the simplest way to use the library.
 *
 * Run: npx tsx examples/04-zero-config.ts
 */

import { z } from 'zod';
import {
  defineCollection,
  toColumnDefs,
  toFormConfig,
  toFilterConfig,
  createCollectionStore,
  createInMemoryProvider,
} from '../src/index.js';

// ============================================================================
// Just a plain Zod schema — NO annotations, NO config
// ============================================================================

const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  company: z.string().optional(),
  role: z.enum(['customer', 'partner', 'lead', 'vendor']),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type Contact = z.infer<typeof ContactSchema>;

// ============================================================================
// Zero config: just pass the schema
// ============================================================================

const contacts = defineCollection(ContactSchema);

console.log('╔══════════════════════════════════════════════╗');
console.log('║   Zero Config Demo — Just a Zod Schema       ║');
console.log('╚══════════════════════════════════════════════╝');
console.log();

// Show what was auto-inferred
console.log('=== Auto-detected ===');
console.log('ID field:', contacts.idField);           // 'id' (detected from name)
console.log('Label field:', contacts.labelField);     // 'name' (detected from name pattern)
console.log();

// Show field-level inference
console.log('=== Field Inference ===');
const fieldSummaries = Object.entries(contacts.fieldAffordances).map(([key, fa]) => {
  const flags: string[] = [];
  if (fa.sortable && fa.sortable !== 'none') flags.push('sortable');
  if (fa.filterable && fa.filterable !== false) flags.push(`filter:${fa.filterable}`);
  if (fa.searchable) flags.push('searchable');
  if (fa.editable) flags.push('editable');
  if (fa.groupable) flags.push('groupable');
  if (fa.visible === false) flags.push('HIDDEN');
  if (fa.summaryField) flags.push('SUMMARY');
  if (fa.detailOnly) flags.push('detail-only');
  return `  ${key.padEnd(12)} (${fa.zodType.padEnd(8)}): ${flags.join(', ')}`;
});
console.log(fieldSummaries.join('\n'));
console.log();

// The library auto-detects:
// - id → hidden, not editable, exact filter
// - name → searchable, summary field
// - email → searchable, email widget
// - phone → searchable
// - role → enum → select filter, groupable
// - isActive → boolean → toggle filter, groupable
// - notes → textarea, truncated, not sortable
// - createdAt → not editable, range filter
// - updatedAt → hidden, not editable

// Show generated configs
const columns = toColumnDefs(contacts);
console.log(`=== Auto-generated: ${columns.length} columns ===`);
for (const col of columns) {
  if (col.accessorKey) {
    console.log(`  ${col.header.padEnd(15)} sort=${String(col.enableSorting).padEnd(5)} filter=${col.meta.filterType || 'none'}`);
  }
}
console.log();

const form = toFormConfig(contacts, 'create');
console.log(`=== Auto-generated: ${form.length} form fields ===`);
for (const f of form) {
  console.log(`  ${f.label.padEnd(15)} type=${f.type}`);
}
console.log();

const filters = toFilterConfig(contacts);
console.log(`=== Auto-generated: ${filters.length} filters ===`);
for (const f of filters) {
  let detail = `  ${f.label.padEnd(15)} ${f.filterType}`;
  if (f.options) detail += ` [${f.options.map(o => o.value).join(', ')}]`;
  console.log(detail);
}
console.log();

// ============================================================================
// Wire up with sample data
// ============================================================================

const sampleContacts: Contact[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', phone: '555-0101', company: 'Acme Corp', role: 'customer', isActive: true, notes: 'Key account', createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-06-01') },
  { id: '2', name: 'Bob Smith', email: 'bob@partner.io', phone: undefined, company: 'Partner Inc', role: 'partner', isActive: true, notes: undefined, createdAt: new Date('2024-02-20'), updatedAt: new Date('2024-05-15') },
  { id: '3', name: 'Carol Williams', email: 'carol@lead.com', phone: '555-0303', company: undefined, role: 'lead', isActive: false, notes: 'Contacted in March, follow up needed', createdAt: new Date('2024-03-10'), updatedAt: new Date('2024-04-01') },
];

(async () => {
  const provider = createInMemoryProvider(sampleContacts);
  const store = createCollectionStore<Contact>(contacts);

  // Load and display
  const { data, total } = await provider.getList({
    sort: [{ id: 'name', desc: false }],
  });

  let state = store.initialState;
  state = store.actions.setItems(state, data, total);

  console.log('=== Data Provider ===');
  console.log(`Loaded ${total} contacts:`);
  for (const c of data) {
    console.log(`  ${c.name} <${c.email}> — ${c.role}${c.isActive ? '' : ' [INACTIVE]'}`);
  }
  console.log();

  // Search
  const searchResult = await provider.getList({ search: 'alice' });
  console.log(`Search "alice": ${searchResult.total} result(s) → ${searchResult.data.map(c => c.name).join(', ')}`);

  // Filter by role
  const partners = await provider.getList({
    filter: [{ id: 'role', value: ['partner', 'vendor'] }],
  });
  console.log(`Partners & vendors: ${partners.total} → ${partners.data.map(c => c.name).join(', ')}`);
  console.log();

  console.log('Done! The library inferred everything from the Zod schema alone.');
})();
