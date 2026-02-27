import { z } from 'zod';
import { defineCollection, createInMemoryProvider } from 'zod-collection-ui';

export const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(3).max(20),
  name: z.string().min(1).max(200),
  description: z.string(),
  price: z.number().min(0),
  category: z.enum(['electronics', 'clothing', 'food', 'books', 'home']),
  inStock: z.boolean().default(true),
  quantity: z.number().int().min(0).default(0),
  tags: z.array(z.string()),
  rating: z.number().min(0).max(5).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

export const productsCollection = defineCollection(ProductSchema, {
  affordances: {
    create: true,
    bulkDelete: true,
    bulkEdit: ['category', 'inStock', 'price'],
    search: { debounce: 300, placeholder: 'Search products...' },
    pagination: { defaultPageSize: 10, style: 'pages' },
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
        home: 'secondary',
      },
    },
    quantity: { columnWidth: 80 },
    rating: { displayFormat: 'stars' },
  },
  operations: [
    { name: 'discount', label: 'Apply Discount', scope: 'selection', icon: 'Percent', variant: 'secondary' },
    { name: 'restock', label: 'Restock', scope: 'item', icon: 'Package' },
    { name: 'discontinue', label: 'Discontinue', scope: 'item', icon: 'Trash', variant: 'destructive' },
  ],
});

export const sampleProducts: Product[] = [
  { id: '1', sku: 'ELEC-001', name: 'Wireless Headphones', description: 'Noise-cancelling BT headphones', price: 79.99, category: 'electronics', inStock: true, quantity: 150, tags: ['audio', 'wireless'], rating: 4.5, createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-06-01') },
  { id: '2', sku: 'CLOTH-001', name: 'Cotton T-Shirt', description: 'Organic cotton basic tee', price: 24.99, category: 'clothing', inStock: true, quantity: 500, tags: ['basics', 'organic'], rating: 4.2, createdAt: new Date('2024-02-10'), updatedAt: new Date('2024-05-20') },
  { id: '3', sku: 'BOOK-001', name: 'Design Patterns', description: 'GoF classic reprint', price: 49.99, category: 'books', inStock: false, quantity: 0, tags: ['programming', 'classic'], rating: 4.8, createdAt: new Date('2024-03-05'), updatedAt: new Date('2024-03-05') },
  { id: '4', sku: 'HOME-001', name: 'Ceramic Mug', description: 'Hand-thrown 12oz mug', price: 18.00, category: 'home', inStock: true, quantity: 75, tags: ['kitchen', 'handmade'], rating: 4.0, createdAt: new Date('2024-04-12'), updatedAt: new Date('2024-07-15') },
  { id: '5', sku: 'FOOD-001', name: 'Organic Coffee Beans', description: '1lb bag, medium roast', price: 15.99, category: 'food', inStock: true, quantity: 200, tags: ['organic', 'coffee'], rating: 4.7, createdAt: new Date('2024-05-20'), updatedAt: new Date('2024-08-01') },
  { id: '6', sku: 'ELEC-002', name: 'USB-C Hub', description: '7-port hub with HDMI', price: 39.99, category: 'electronics', inStock: true, quantity: 300, tags: ['accessories', 'usb-c'], rating: 4.3, createdAt: new Date('2024-06-01'), updatedAt: new Date('2024-08-15') },
  { id: '7', sku: 'CLOTH-002', name: 'Denim Jacket', description: 'Classic fit, medium wash', price: 89.99, category: 'clothing', inStock: true, quantity: 45, tags: ['outerwear', 'denim'], rating: 4.6, createdAt: new Date('2024-06-15'), updatedAt: new Date('2024-07-20') },
  { id: '8', sku: 'BOOK-002', name: 'Clean Code', description: 'Robert C. Martin classic', price: 34.99, category: 'books', inStock: true, quantity: 120, tags: ['programming', 'classic'], rating: 4.4, createdAt: new Date('2024-07-01'), updatedAt: new Date('2024-07-01') },
];

export const productsProvider = createInMemoryProvider(sampleProducts);
