import { useState } from 'react';
import { CollectionView } from '@/components/collection/collection-view';
import { contactsCollection, contactsProvider } from '@/data/contacts';
import { tasksCollection, tasksProvider } from '@/data/tasks';
import { productsCollection, productsProvider } from '@/data/products';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';

const DEMOS = [
  {
    key: 'contacts',
    label: 'Contacts',
    collection: contactsCollection,
    provider: contactsProvider,
    title: 'Contacts (Zero Config)',
    description:
      'No annotations, no config — everything inferred from the Zod schema alone. The library auto-detects ID, label, searchable, filterable, and sortable fields.',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    collection: tasksCollection,
    provider: tasksProvider,
    title: 'Task Tracker',
    description:
      'Rich affordances with .meta() annotations, colored status/priority badges, custom operations (Mark Done, Assign), and bulk actions.',
  },
  {
    key: 'products',
    label: 'Products',
    collection: productsCollection,
    provider: productsProvider,
    title: 'Product Catalog',
    description:
      'E-commerce catalog with explicit field overrides — currency formatting, star ratings, copyable SKUs, and category badges.',
  },
] as const;

function App() {
  const [activeTab, setActiveTab] = useState<string>('contacts');
  const activeDemo = DEMOS.find((d) => d.key === activeTab)!;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b px-6 py-4">
          <h1 className="text-2xl font-bold">zod-collection-ui</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schema-driven collection UIs — declare once, render anywhere
          </p>
        </header>

        <div className="px-6 py-4">
          {/* Tab navigation */}
          <div className="flex gap-1 mb-4">
            {DEMOS.map((demo) => (
              <Button
                key={demo.key}
                variant={activeTab === demo.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(demo.key)}
              >
                {demo.label}
              </Button>
            ))}
          </div>

          <Separator className="mb-4" />

          {/* Active demo */}
          <CollectionView
            key={activeDemo.key}
            collection={activeDemo.collection}
            provider={activeDemo.provider as any}
            title={activeDemo.title}
            description={activeDemo.description}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
