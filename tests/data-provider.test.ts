import { describe, it, expect } from 'vitest';
import { createInMemoryProvider } from '../src/data-provider.js';

// ============================================================================
// Test Data
// ============================================================================

interface Project {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  priority: number;
  tags: string[];
}

const sampleData: Project[] = [
  { id: '1', name: 'Alpha Project', status: 'active', priority: 3, tags: ['web', 'frontend'] },
  { id: '2', name: 'Beta API', status: 'draft', priority: 1, tags: ['api'] },
  { id: '3', name: 'Gamma Platform', status: 'archived', priority: 5, tags: ['web', 'api', 'backend'] },
  { id: '4', name: 'Delta Service', status: 'active', priority: 2, tags: ['api', 'microservice'] },
  { id: '5', name: 'Epsilon UI', status: 'draft', priority: 4, tags: ['web', 'frontend', 'design'] },
];

function freshProvider() {
  return createInMemoryProvider<Project>([...sampleData.map(d => ({ ...d }))]);
}

// ============================================================================
// getList - basic
// ============================================================================

describe('createInMemoryProvider - getList', () => {
  it('returns all items when no params', async () => {
    const provider = freshProvider();
    const result = await provider.getList({});
    expect(result.data).toHaveLength(5);
    expect(result.total).toBe(5);
  });

  it('supports pagination', async () => {
    const provider = freshProvider();
    const page1 = await provider.getList({ pagination: { page: 1, pageSize: 2 } });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(5); // total is unaffected by pagination
    expect(page1.data[0].name).toBe('Alpha Project');

    const page2 = await provider.getList({ pagination: { page: 2, pageSize: 2 } });
    expect(page2.data).toHaveLength(2);
    expect(page2.data[0].name).toBe('Gamma Platform');

    const page3 = await provider.getList({ pagination: { page: 3, pageSize: 2 } });
    expect(page3.data).toHaveLength(1);
  });

  it('supports sorting ascending', async () => {
    const provider = freshProvider();
    const result = await provider.getList({ sort: [{ id: 'priority', desc: false }] });
    const priorities = result.data.map(d => d.priority);
    expect(priorities).toEqual([1, 2, 3, 4, 5]);
  });

  it('supports sorting descending', async () => {
    const provider = freshProvider();
    const result = await provider.getList({ sort: [{ id: 'priority', desc: true }] });
    const priorities = result.data.map(d => d.priority);
    expect(priorities).toEqual([5, 4, 3, 2, 1]);
  });

  it('supports multi-column sorting', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      sort: [
        { id: 'status', desc: false },
        { id: 'priority', desc: false },
      ],
    });
    // active items (priority 2, 3), archived (5), draft (1, 4)
    const statuses = result.data.map(d => d.status);
    expect(statuses).toEqual(['active', 'active', 'archived', 'draft', 'draft']);
    // Within active: priority 2, 3
    expect(result.data[0].priority).toBe(2);
    expect(result.data[1].priority).toBe(3);
  });
});

// ============================================================================
// getList - filtering
// ============================================================================

describe('createInMemoryProvider - filtering', () => {
  it('filters by string contains (case-insensitive)', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      filter: [{ id: 'name', value: 'alpha' }],
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alpha Project');
    expect(result.total).toBe(1);
  });

  it('filters by exact enum value via array', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      filter: [{ id: 'status', value: ['active'] }],
    });
    expect(result.data).toHaveLength(2);
    expect(result.data.every(d => d.status === 'active')).toBe(true);
  });

  it('filters by multiple enum values', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      filter: [{ id: 'status', value: ['active', 'draft'] }],
    });
    expect(result.data).toHaveLength(4);
  });

  it('filters by numeric range', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      filter: [{ id: 'priority', value: { min: 2, max: 4 } }],
    });
    expect(result.data).toHaveLength(3);
    expect(result.data.every(d => d.priority >= 2 && d.priority <= 4)).toBe(true);
  });

  it('filters by boolean value', async () => {
    // Add boolean field test
    const data = [
      { id: '1', name: 'A', active: true },
      { id: '2', name: 'B', active: false },
      { id: '3', name: 'C', active: true },
    ];
    const provider = createInMemoryProvider(data);
    const result = await provider.getList({
      filter: [{ id: 'active', value: true }],
    });
    expect(result.data).toHaveLength(2);
  });

  it('ignores empty/null filter values', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      filter: [
        { id: 'name', value: '' },
        { id: 'status', value: null },
        { id: 'priority', value: undefined },
      ],
    });
    expect(result.data).toHaveLength(5); // all items
  });

  it('filters by array containment', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      filter: [{ id: 'tags', value: ['api'] }],
    });
    // Items with 'api' in tags: Beta, Gamma, Delta
    expect(result.data).toHaveLength(3);
  });

  it('combines multiple filters', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      filter: [
        { id: 'status', value: ['active'] },
        { id: 'priority', value: { min: 3 } },
      ],
    });
    // Active items with priority >= 3: Alpha (priority 3)
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alpha Project');
  });
});

// ============================================================================
// getList - search
// ============================================================================

describe('createInMemoryProvider - search', () => {
  it('searches across string fields (case-insensitive)', async () => {
    const provider = freshProvider();
    const result = await provider.getList({ search: 'api' });
    // Matches: "Beta API", "Gamma Platform" (no), "Delta Service" (no)
    // Only name field is string, so: Beta API
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Beta API');
  });

  it('searches with custom searchFields', async () => {
    const provider = createInMemoryProvider(sampleData, { searchFields: ['name', 'status'] });
    const result = await provider.getList({ search: 'active' });
    // Matches on status: Alpha, Delta
    expect(result.data).toHaveLength(2);
  });

  it('combines search with filters', async () => {
    const provider = freshProvider();
    const result = await provider.getList({
      search: 'project',
      filter: [{ id: 'status', value: ['active'] }],
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alpha Project');
  });

  it('search + sort + pagination work together', async () => {
    const provider = createInMemoryProvider(sampleData, { searchFields: ['name'] });
    // Search for items with 'platform' in name → only Gamma Platform
    const result = await provider.getList({
      search: 'platform',
      sort: [{ id: 'priority', desc: false }],
      pagination: { page: 1, pageSize: 10 },
    });
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Gamma Platform');
  });
});

// ============================================================================
// CRUD operations
// ============================================================================

describe('createInMemoryProvider - CRUD', () => {
  it('getOne returns a single item by id', async () => {
    const provider = freshProvider();
    const item = await provider.getOne('3');
    expect(item.name).toBe('Gamma Platform');
    expect(item.priority).toBe(5);
  });

  it('getOne throws for missing item', async () => {
    const provider = freshProvider();
    await expect(provider.getOne('999')).rejects.toThrow('Item not found');
  });

  it('create adds a new item', async () => {
    const provider = freshProvider();
    const created = await provider.create({ name: 'Zeta New', status: 'draft', priority: 1, tags: [] });
    expect(created.name).toBe('Zeta New');
    expect(created.id).toBeDefined();

    const { data } = await provider.getList({});
    expect(data).toHaveLength(6);
  });

  it('create uses provided id if given', async () => {
    const provider = freshProvider();
    const created = await provider.create({ id: 'custom-id', name: 'Custom', status: 'draft', priority: 1, tags: [] });
    expect(created.id).toBe('custom-id');
  });

  it('update modifies an existing item', async () => {
    const provider = freshProvider();
    const updated = await provider.update('2', { priority: 10, status: 'active' });
    expect(updated.priority).toBe(10);
    expect(updated.status).toBe('active');
    expect(updated.name).toBe('Beta API'); // unchanged fields preserved

    const item = await provider.getOne('2');
    expect(item.priority).toBe(10);
  });

  it('update throws for missing item', async () => {
    const provider = freshProvider();
    await expect(provider.update('999', { name: 'x' })).rejects.toThrow('Item not found');
  });

  it('updateMany updates multiple items', async () => {
    const provider = freshProvider();
    const updated = await provider.updateMany(['1', '3'], { status: 'archived' });
    expect(updated).toHaveLength(2);
    expect(updated[0].status).toBe('archived');
    expect(updated[1].status).toBe('archived');
  });

  it('updateMany skips missing items', async () => {
    const provider = freshProvider();
    const updated = await provider.updateMany(['1', '999'], { status: 'archived' });
    expect(updated).toHaveLength(1);
  });

  it('delete removes an item', async () => {
    const provider = freshProvider();
    await provider.delete('2');
    const { data } = await provider.getList({});
    expect(data).toHaveLength(4);
    expect(data.find(d => d.id === '2')).toBeUndefined();
  });

  it('delete throws for missing item', async () => {
    const provider = freshProvider();
    await expect(provider.delete('999')).rejects.toThrow('Item not found');
  });

  it('deleteMany removes multiple items', async () => {
    const provider = freshProvider();
    await provider.deleteMany(['1', '3', '5']);
    const { data } = await provider.getList({});
    expect(data).toHaveLength(2);
    expect(data.map(d => d.id).sort()).toEqual(['2', '4']);
  });
});

// ============================================================================
// Options
// ============================================================================

describe('createInMemoryProvider - options', () => {
  it('supports custom idField', async () => {
    const data = [
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
    ];
    const provider = createInMemoryProvider(data, { idField: 'key' });
    const item = await provider.getOne('b');
    expect(item.value).toBe(2);
  });

  it('supports simulated delay', async () => {
    const provider = createInMemoryProvider(sampleData, { simulateDelay: 50 });
    const start = Date.now();
    await provider.getList({});
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // allow some timing slack
  });
});
