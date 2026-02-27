import { z } from 'zod';
import { defineCollection, createInMemoryProvider } from 'zod-collection-ui';

export const ContactSchema = z.object({
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

export type Contact = z.infer<typeof ContactSchema>;

export const contactsCollection = defineCollection(ContactSchema);

export const sampleContacts: Contact[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', phone: '555-0101', company: 'Acme Corp', role: 'customer', isActive: true, notes: 'Key account', createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-06-01') },
  { id: '2', name: 'Bob Smith', email: 'bob@partner.io', phone: undefined, company: 'Partner Inc', role: 'partner', isActive: true, notes: undefined, createdAt: new Date('2024-02-20'), updatedAt: new Date('2024-05-15') },
  { id: '3', name: 'Carol Williams', email: 'carol@lead.com', phone: '555-0303', company: undefined, role: 'lead', isActive: false, notes: 'Contacted in March, follow up needed', createdAt: new Date('2024-03-10'), updatedAt: new Date('2024-04-01') },
  { id: '4', name: 'Dave Brown', email: 'dave@vendor.co', phone: '555-0404', company: 'Supplies R Us', role: 'vendor', isActive: true, notes: undefined, createdAt: new Date('2024-04-05'), updatedAt: new Date('2024-07-12') },
  { id: '5', name: 'Eve Davis', email: 'eve@example.com', phone: '555-0505', company: 'Acme Corp', role: 'customer', isActive: true, notes: 'Referred by Alice', createdAt: new Date('2024-05-18'), updatedAt: new Date('2024-08-01') },
  { id: '6', name: 'Frank Miller', email: 'frank@partner.io', phone: undefined, company: 'Partner Inc', role: 'partner', isActive: false, notes: 'Contract ended Q2', createdAt: new Date('2024-01-25'), updatedAt: new Date('2024-06-30') },
];

export const contactsProvider = createInMemoryProvider(sampleContacts);
