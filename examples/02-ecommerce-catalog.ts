/**
 * Example 02: E-Commerce Product Catalog
 *
 * A realistic example showing explicit affordance overrides,
 * custom operations, and all three config generators.
 *
 * Run: npx tsx examples/02-ecommerce-catalog.ts
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
// Schema with explicit affordance metadata
// ============================================================================

const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(3).max(20),
  name: z.string().min(1).max(200),
  description: z.string(),
  price: z.number().min(0),
  category: z.enum(['electronics', 'clothing', 'food', 'books', 'home']),
  inStock: z.boolean().default(true),
  quantity: z.number().int().min(0).default(0),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()),
  rating: z.number().min(0).max(5).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type Product = z.infer<typeof ProductSchema>;

// ============================================================================
// Collection with overrides and operations
// ============================================================================

const products = defineCollection(ProductSchema, {
  affordances: {
    create: true,
    bulkDelete: true,
    bulkEdit: ['category', 'inStock', 'price'],
    search: { debounce: 300, placeholder: 'Search products...' },
    export: ['csv', 'json'],
    pagination: { defaultPageSize: 50, style: 'pages' },
    defaultSort: { field: 'createdAt', direction: 'desc' },
    selectable: 'multi',
    filterPanel: true,
    columnVisibility: true,
  },
  fields: {
    sku: { copyable: true, immutableAfterCreate: true, columnWidth: 120 },
    name: { inlineEditable: true, summaryField: true, columnWidth: 250 },
    description: { detailOnly: true, editWidget: 'textarea' },
    price: { displayFormat: 'currency', columnWidth: 100 },
    category: {
      badge: {
        electronics: 'blue',
        clothing: 'green',
        food: 'orange',
        books: 'purple',
        home: 'yellow',
      },
    },
    quantity: { columnWidth: 80 },
    imageUrl: { detailOnly: true },
    rating: { displayFormat: 'stars' },
  },
  operations: [
    {
      name: 'discount',
      label: 'Apply Discount',
      scope: 'selection',
      icon: 'Percent',
      variant: 'secondary',
    },
    {
      name: 'restock',
      label: 'Restock',
      scope: 'item',
      icon: 'Package',
    },
    {
      name: 'discontinue',
      label: 'Discontinue',
      scope: 'item',
      icon: 'Trash',
      variant: 'destructive',
      confirm: {
        title: 'Discontinue product?',
        message: 'This will remove the product from the catalog.',
        confirmLabel: 'Discontinue',
        variant: 'destructive',
      },
    },
    {
      name: 'exportReport',
      label: 'Export Report',
      scope: 'collection',
      icon: 'Download',
    },
  ],
});

// ============================================================================
// Output: show what the library generates
// ============================================================================

console.log('╔══════════════════════════════════════════════╗');
console.log('║   E-Commerce Product Catalog Collection      ║');
console.log('╚══════════════════════════════════════════════╝');
console.log();

// Describe
console.log('=== Human Description ===');
console.log(products.describe());
console.log();

// Column defs
const columns = toColumnDefs(products);
console.log(`=== Column Definitions (${columns.length} columns) ===`);
for (const col of columns) {
  const extras: string[] = [];
  if (col.meta.inlineEditable) extras.push('inline-editable');
  if (col.meta.badge) extras.push('badge');
  if (col.meta.copyable) extras.push('copyable');
  if (col.meta.displayFormat) extras.push(`format:${col.meta.displayFormat}`);
  if (col.meta.enumValues) extras.push(`enum:[${col.meta.enumValues.join(',')}]`);
  if (col.meta.numericBounds) extras.push(`range:[${col.meta.numericBounds.min ?? '?'}-${col.meta.numericBounds.max ?? '?'}]`);
  console.log(`  ${col.id}: "${col.header}" | sort=${col.enableSorting} filter=${col.enableColumnFilter} ${extras.length ? '| ' + extras.join(', ') : ''}`);
}
console.log();

// Form configs
const createForm = toFormConfig(products, 'create');
const editForm = toFormConfig(products, 'edit');
console.log(`=== Create Form (${createForm.length} fields) ===`);
for (const f of createForm) {
  console.log(`  ${f.name}: type=${f.type}, required=${f.required}${f.options ? ` options=${f.options.length}` : ''}`);
}
console.log();
console.log(`=== Edit Form (${editForm.length} fields) ===`);
for (const f of editForm) {
  console.log(`  ${f.name}: type=${f.type}, disabled=${f.disabled}`);
}
console.log();

// Filter config
const filters = toFilterConfig(products);
console.log(`=== Filters (${filters.length} fields) ===`);
for (const f of filters) {
  let detail = `  ${f.name}: ${f.filterType}`;
  if (f.options) detail += ` [${f.options.map(o => o.value).join(', ')}]`;
  if (f.bounds) detail += ` [${f.bounds.min ?? '?'}..${f.bounds.max ?? '?'}]`;
  console.log(detail);
}
console.log();

// Operations by scope
console.log('=== Operations ===');
console.log('  Item:', products.getOperations('item').map(o => o.label).join(', '));
console.log('  Selection:', products.getOperations('selection').map(o => o.label).join(', '));
console.log('  Collection:', products.getOperations('collection').map(o => o.label).join(', '));
console.log();

// ============================================================================
// State management
// ============================================================================

const store = createCollectionStore<Product>(products);
console.log('=== State Store ===');
console.log('Initial pagination:', store.initialState.pagination);
console.log('Initial sorting:', store.initialState.sorting);
console.log('Hidden columns:', Object.entries(store.initialState.columnVisibility)
  .filter(([_, v]) => v === false).map(([k]) => k));
console.log();

// ============================================================================
// Data provider with sample data
// ============================================================================

const sampleProducts: Product[] = [
  { id: '1', sku: 'ELEC-001', name: 'Wireless Headphones', description: 'Noise-cancelling BT headphones', price: 79.99, category: 'electronics', inStock: true, quantity: 150, tags: ['audio', 'wireless'], rating: 4.5, createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-06-01'), imageUrl: undefined },
  { id: '2', sku: 'CLOTH-001', name: 'Cotton T-Shirt', description: 'Organic cotton basic tee', price: 24.99, category: 'clothing', inStock: true, quantity: 500, tags: ['basics', 'organic'], rating: 4.2, createdAt: new Date('2024-02-10'), updatedAt: new Date('2024-05-20'), imageUrl: undefined },
  { id: '3', sku: 'BOOK-001', name: 'Design Patterns', description: 'GoF classic reprint', price: 49.99, category: 'books', inStock: false, quantity: 0, tags: ['programming', 'classic'], rating: 4.8, createdAt: new Date('2024-03-05'), updatedAt: new Date('2024-03-05'), imageUrl: undefined },
  { id: '4', sku: 'HOME-001', name: 'Ceramic Mug', description: 'Hand-thrown 12oz mug', price: 18.00, category: 'home', inStock: true, quantity: 75, tags: ['kitchen', 'handmade'], rating: 4.0, createdAt: new Date('2024-04-12'), updatedAt: new Date('2024-07-15'), imageUrl: undefined },
  { id: '5', sku: 'FOOD-001', name: 'Organic Coffee Beans', description: '1lb bag, medium roast', price: 15.99, category: 'food', inStock: true, quantity: 200, tags: ['organic', 'coffee'], rating: 4.7, createdAt: new Date('2024-05-20'), updatedAt: new Date('2024-08-01'), imageUrl: undefined },
];

const provider = createInMemoryProvider(sampleProducts);

(async () => {
  console.log('=== Data Provider Demo ===');

  // Sorted by price, paginated
  const page1 = await provider.getList({
    sort: [{ id: 'price', desc: true }],
    pagination: { page: 1, pageSize: 3 },
  });
  console.log(`Most expensive (page 1 of ${Math.ceil(page1.total / 3)}):`);
  for (const p of page1.data) {
    console.log(`  $${p.price.toFixed(2)} — ${p.name} (${p.category})`);
  }
  console.log();

  // Filtered by category + in stock
  const electronics = await provider.getList({
    filter: [
      { id: 'category', value: ['electronics', 'books'] },
      { id: 'inStock', value: true },
    ],
  });
  console.log(`In-stock electronics & books (${electronics.total}):`);
  for (const p of electronics.data) {
    console.log(`  ${p.sku}: ${p.name} — $${p.price.toFixed(2)}`);
  }
  console.log();

  // Search
  const searchResult = await provider.getList({ search: 'organic' });
  console.log(`Search "organic" (${searchResult.total} results):`);
  for (const p of searchResult.data) {
    console.log(`  ${p.name}: ${p.description}`);
  }
  console.log();

  // State management demo
  let state = store.initialState;
  state = store.actions.setItems(state, page1.data, page1.total);
  state = store.actions.setRowSelection(state, { '0': true, '2': true });
  console.log('Selected items:', store.selectors.getSelectedItems(state).map(p => p.name));
  console.log('Selection count:', store.selectors.getSelectedCount(state));
  console.log('Page count:', store.selectors.getPageCount(state));
  console.log();

  // AI Prompt
  console.log('=== AI Prompt (for LLM consumption) ===');
  console.log(toPrompt(products));
})();
