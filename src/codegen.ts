/**
 * Code Generation: Materialize inferred affordances as TypeScript source code.
 *
 * Two approaches to using zod-collection-ui, and a hybrid that combines them:
 *
 * 1. **Runtime-only** (current default): defineCollection(schema) infers everything
 *    at runtime from the Zod schema. Zero config, maximum convenience.
 *
 * 2. **Codegen-only**: toCode() generates a TypeScript file with all inferred
 *    affordances written out explicitly. Full visibility, hand-editable.
 *
 * 3. **Hybrid** (recommended): Start with runtime inference for rapid development.
 *    Run toCode() to "snapshot" the inference into an explicit config file.
 *    Hand-edit where needed, then pass the config to defineCollection(schema, config).
 *    Re-run codegen when the schema changes — writeIfChanged() only touches the
 *    file if the content actually differs, preserving timestamps for build tools.
 *
 * The hybrid approach gives you:
 * - Convention-over-configuration as the starting point
 * - Full visibility into what was inferred
 * - Explicit overrides that survive library updates
 * - No unnecessary file churn (preserves mtimes for build tools)
 */

import type { CollectionDefinition } from './collection.js';
import type { FieldAffordance, OperationDefinition } from './types.js';
import { inferFieldAffordances, humanizeFieldName } from './inference.js';

// ============================================================================
// Types
// ============================================================================

export interface CodegenOptions {
  /** Include a header comment with generation metadata. Default: true. */
  header?: boolean;
  /** Include TypeScript import statement. Default: true. */
  imports?: boolean;
  /** Export name for the config object. Default: 'config'. */
  exportName?: string;
  /** Number of spaces for indentation. Default: 2. */
  indent?: number;
  /**
   * Only include field affordances that differ from what runtime inference
   * would produce. Compact output — layers on top of inference rather than
   * replacing it. Default: false (full mode).
   */
  diffOnly?: boolean;
  /** Module path for the import statement. Default: 'zod-collection-ui'. */
  importFrom?: string;
}

export interface WriteResult {
  /** Whether the file was written to disk. */
  written: boolean;
  /** Why the file was or wasn't written. */
  reason: 'created' | 'updated' | 'unchanged';
  /** The absolute or relative file path. */
  filePath: string;
}

// ============================================================================
// Field property ordering for clean, consistent output
// ============================================================================

/** Properties to serialize for each field, in display order. */
const FIELD_PROP_ORDER: (keyof FieldAffordance)[] = [
  // Display
  'title', 'description',
  // Query capabilities
  'sortable', 'filterable', 'searchable', 'groupable', 'aggregatable',
  // CRUD capabilities
  'readable', 'editable', 'inlineEditable',
  'requiredOnCreate', 'requiredOnUpdate', 'immutableAfterCreate',
  // Visibility & layout
  'visible', 'hidden', 'detailOnly', 'summaryField',
  'columnWidth', 'minWidth', 'maxWidth', 'resizable', 'pinned', 'order',
  // Display formatting
  'displayFormat', 'badge', 'copyable', 'truncate', 'tooltip',
  // Edit widget
  'editWidget', 'editPlaceholder', 'editHelp',
];

/** Properties that are computed (not part of CollectionConfig.fields). */
const COMPUTED_PROPS = new Set(['zodType', 'zodDef']);

// ============================================================================
// Core: toCode
// ============================================================================

/**
 * Generate TypeScript source code that captures a collection's configuration.
 *
 * The generated code exports a `CollectionConfig` object that, when passed to
 * `defineCollection(schema, config)`, produces the same affordances as the
 * runtime inference engine.
 *
 * @example
 * ```typescript
 * const code = toCode(contacts);
 * console.log(code);
 * // → export const config: CollectionConfig = { ... };
 *
 * // Write to file (only if changed):
 * await writeIfChanged('./contacts.collection.ts', code);
 * ```
 */
export function toCode(
  collection: CollectionDefinition<any>,
  options?: CodegenOptions,
): string {
  const opts = {
    header: true,
    imports: true,
    exportName: 'config',
    indent: 2,
    diffOnly: false,
    importFrom: 'zod-collection-ui',
    ...options,
  };

  const sections: string[] = [];

  // Header comment
  if (opts.header) {
    const fieldNames = Object.keys(collection.fieldAffordances).join(', ');
    sections.push(
      '/**',
      ' * Auto-generated collection configuration.',
      ' *',
      ` * Captures the result of the 4-layer inference engine for fields:`,
      ` * ${fieldNames}`,
      ' *',
      ' * Usage:',
      ` *   import { ${opts.exportName} } from './this-file';`,
      ` *   const collection = defineCollection(YourSchema, ${opts.exportName});`,
      ' */',
      '',
    );
  }

  // Import statement
  if (opts.imports) {
    sections.push(
      `import type { CollectionConfig } from '${opts.importFrom}';`,
      '',
    );
  }

  // Build and serialize the config object
  const configObj = buildConfigObject(collection, opts.diffOnly);
  const serialized = serialize(configObj, 0, opts.indent);

  sections.push(`export const ${opts.exportName}: CollectionConfig = ${serialized};`);
  sections.push('');

  return sections.join('\n');
}

// ============================================================================
// File I/O: writeIfChanged
// ============================================================================

/**
 * Write content to a file only if it differs from the existing content.
 *
 * This preserves file modification timestamps when the content hasn't changed,
 * preventing unnecessary rebuilds in watch-mode tooling.
 *
 * **Node.js only** — uses dynamic import of `node:fs/promises`.
 */
export async function writeIfChanged(filePath: string, content: string): Promise<WriteResult> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  try {
    const existing = await fs.readFile(filePath, 'utf-8');
    if (existing === content) {
      return { written: false, reason: 'unchanged', filePath };
    }
    await fs.writeFile(filePath, content, 'utf-8');
    return { written: true, reason: 'updated', filePath };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // File doesn't exist yet — create it (and parent directories)
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return { written: true, reason: 'created', filePath };
    }
    throw err;
  }
}

/**
 * Generate collection config code and write it only if the content changed.
 *
 * Convenience function combining `toCode()` + `writeIfChanged()`.
 *
 * **Node.js only** — uses `writeIfChanged` internally.
 *
 * @example
 * ```typescript
 * const result = await generateAndWrite(contacts, './contacts.config.ts');
 * console.log(result.reason); // 'created' | 'updated' | 'unchanged'
 * ```
 */
export async function generateAndWrite(
  collection: CollectionDefinition<any>,
  filePath: string,
  options?: CodegenOptions,
): Promise<WriteResult> {
  const code = toCode(collection, options);
  return writeIfChanged(filePath, code);
}

// ============================================================================
// Config object builders
// ============================================================================

function buildConfigObject(
  collection: CollectionDefinition<any>,
  diffOnly: boolean,
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  config.idField = collection.idField;
  config.labelField = collection.labelField;

  // Collection-level affordances
  const affordances = filterUndefined(collection.affordances as Record<string, unknown>);
  if (Object.keys(affordances).length > 0) {
    config.affordances = affordances;
  }

  // Field affordances
  const fields = buildFieldsObject(collection, diffOnly);
  if (Object.keys(fields).length > 0) {
    config.fields = fields;
  }

  // Operations
  if (collection.operations.length > 0) {
    config.operations = collection.operations.map(buildOperationObject);
  }

  return config;
}

function buildFieldsObject(
  collection: CollectionDefinition<any>,
  diffOnly: boolean,
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  const shape = collection.schema.shape as Record<string, any>;

  for (const [key, fa] of Object.entries(collection.fieldAffordances)) {
    const props: Record<string, unknown> = {};

    if (diffOnly) {
      // Compare against what inference alone would produce
      const fieldSchema = shape[key];
      if (!fieldSchema) continue;
      const inferred = inferFieldAffordances(key, fieldSchema);
      const inferredTitle = inferred.title ?? humanizeFieldName(key);

      for (const prop of FIELD_PROP_ORDER) {
        const resolved = (fa as any)[prop];
        if (resolved === undefined) continue;
        const baseline = prop === 'title' ? inferredTitle : (inferred as any)[prop];
        if (!valueEqual(resolved, baseline)) {
          props[prop] = resolved;
        }
      }
    } else {
      // Full mode: include all non-undefined, non-computed props in canonical order
      for (const prop of FIELD_PROP_ORDER) {
        const value = (fa as any)[prop];
        if (value !== undefined) {
          props[prop] = value;
        }
      }
      // Also include any extra props not in the standard order
      for (const [prop, value] of Object.entries(fa)) {
        if (
          value !== undefined &&
          !COMPUTED_PROPS.has(prop) &&
          !FIELD_PROP_ORDER.includes(prop as keyof FieldAffordance)
        ) {
          props[prop] = value;
        }
      }
    }

    if (Object.keys(props).length > 0) {
      result[key] = props;
    }
  }

  return result;
}

function buildOperationObject(op: OperationDefinition): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  result.name = op.name;
  result.label = op.label;
  result.scope = op.scope;
  if (op.icon !== undefined) result.icon = op.icon;
  if (op.variant !== undefined) result.variant = op.variant;
  if (op.confirm !== undefined) result.confirm = op.confirm;
  if (op.keyboardShortcut !== undefined) result.keyboardShortcut = op.keyboardShortcut;
  return result;
}

// ============================================================================
// Serialization: JavaScript values → TypeScript source text
// ============================================================================

/**
 * Serialize a JavaScript value to TypeScript source code with proper indentation.
 *
 * - Strings → single-quoted
 * - Objects with ≤60 char one-line form → inline
 * - Objects/arrays exceeding 60 chars → multi-line with indentation
 * - undefined values in objects are filtered out
 */
function serialize(value: unknown, depth: number, indent: number): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return serializeArray(value, depth, indent);
  }

  if (typeof value === 'object') {
    return serializeObject(value as Record<string, unknown>, depth, indent);
  }

  return String(value);
}

function serializeArray(arr: unknown[], depth: number, indent: number): string {
  if (arr.length === 0) return '[]';

  const items = arr.map(v => serialize(v, depth + 1, indent));

  // Try one-line form
  const oneLine = `[${items.join(', ')}]`;
  if (oneLine.length <= 60 && !oneLine.includes('\n')) return oneLine;

  // Multi-line form
  const pad = ' '.repeat((depth + 1) * indent);
  const closePad = ' '.repeat(depth * indent);
  return `[\n${items.map(item => `${pad}${item},`).join('\n')}\n${closePad}]`;
}

function serializeObject(obj: Record<string, unknown>, depth: number, indent: number): string {
  const entries = Object.entries(obj).filter(([_, v]) => v !== undefined);
  if (entries.length === 0) return '{}';

  const pairs = entries.map(([k, v]) => {
    const key = isValidIdentifier(k) ? k : quote(k);
    return [key, serialize(v, depth + 1, indent)] as const;
  });

  // Try one-line form
  const oneLine = `{ ${pairs.map(([k, v]) => `${k}: ${v}`).join(', ')} }`;
  if (oneLine.length <= 60 && !oneLine.includes('\n')) return oneLine;

  // Multi-line form
  const pad = ' '.repeat((depth + 1) * indent);
  const closePad = ' '.repeat(depth * indent);
  return `{\n${pairs.map(([k, v]) => `${pad}${k}: ${v},`).join('\n')}\n${closePad}}`;
}

function quote(s: string): string {
  const escaped = s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${escaped}'`;
}

function isValidIdentifier(s: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s);
}

// ============================================================================
// Utility helpers
// ============================================================================

/** Deep-ish value equality for affordance property comparison. */
function valueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/** Filter undefined values from a shallow object copy. */
function filterUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) result[k] = v;
  }
  return result;
}
