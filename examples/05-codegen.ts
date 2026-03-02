/**
 * Example 05: Code Generation (Hybrid Approach)
 *
 * Demonstrates the three approaches to using zod-collection-ui:
 *
 * 1. Runtime-only:  defineCollection(schema) — infers everything on the fly
 * 2. Codegen-only:  toCode() snapshots inference into an explicit config file
 * 3. Hybrid:        Start with inference, generate code, hand-edit, re-run
 *
 * The hybrid approach is recommended for production use:
 * - Start fast with zero config
 * - Generate a config file when you need to customize
 * - Only writes to disk when content actually changes (preserves mtimes)
 *
 * Run: npx tsx examples/05-codegen.ts
 */

import { z } from 'zod';
import {
  defineCollection,
  toCode,
  toColumnDefs,
} from '../src/index.js';

// ============================================================================
// Schema
// ============================================================================

const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.enum(['electronics', 'clothing', 'food', 'books']),
  inStock: z.boolean().default(true),
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Approach 1: Runtime-only (zero config)
// ============================================================================

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   Code Generation Demo — Hybrid Approach         ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log();

console.log('=== Approach 1: Runtime-only ===');
console.log('defineCollection(schema) — everything inferred at runtime');
console.log();

const products = defineCollection(ProductSchema);
const columns = toColumnDefs(products);
console.log(`Generated ${columns.length} columns from inference alone.`);
console.log();

// ============================================================================
// Approach 2: Generate full config (snapshot all inference)
// ============================================================================

console.log('=== Approach 2: Full codegen ===');
console.log('toCode(collection) — snapshot all inference into TypeScript');
console.log();

const fullCode = toCode(products, {
  exportName: 'productsConfig',
  importFrom: 'zod-collection-ui',
});
console.log(fullCode);

// ============================================================================
// Approach 3: Hybrid — customize, then generate diff-only config
// ============================================================================

console.log('=== Approach 3: Hybrid (diff-only mode) ===');
console.log('Start with inference, add overrides, generate only the delta');
console.log();

const customProducts = defineCollection(ProductSchema, {
  affordances: { bulkDelete: true, export: ['csv', 'json'] },
  fields: {
    name: { inlineEditable: true, columnWidth: 300 },
    price: { displayFormat: 'currency' },
    category: { badge: { electronics: 'blue', clothing: 'green', food: 'orange', books: 'purple' } },
  },
  operations: [
    { name: 'discount', label: 'Apply Discount', scope: 'selection' },
    { name: 'discontinue', label: 'Discontinue', scope: 'item', variant: 'destructive', confirm: true },
  ],
});

const diffCode = toCode(customProducts, {
  diffOnly: true,
  exportName: 'productsConfig',
  importFrom: 'zod-collection-ui',
});
console.log('Diff-only output (only what differs from inference):');
console.log(diffCode);

// ============================================================================
// Smart writing: only touch the file if content changed
// ============================================================================

console.log('=== Smart File Writing ===');
console.log();
console.log('In a real project, you would use writeIfChanged or generateAndWrite:');
console.log();
console.log('  // First run: creates the file');
console.log("  await generateAndWrite(products, './products.config.ts');");
console.log("  // → { written: true, reason: 'created' }");
console.log();
console.log('  // Second run (same schema, no changes): skips the write');
console.log("  await generateAndWrite(products, './products.config.ts');");
console.log("  // → { written: false, reason: 'unchanged' }");
console.log();
console.log('  // After schema change: updates the file');
console.log("  await generateAndWrite(productsV2, './products.config.ts');");
console.log("  // → { written: true, reason: 'updated' }");
console.log();
console.log('This preserves file timestamps, so build tools (tsc --watch,');
console.log('vite, webpack) only rebuild when something actually changed.');
