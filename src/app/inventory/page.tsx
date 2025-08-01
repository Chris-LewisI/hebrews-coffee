import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';
import InventoryManager from '@/components/InventoryManager';

export default async function InventoryPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-background rounded-lg shadow-sm border border-border p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">Inventory Cost Management</h1>
            <p className="text-muted-foreground mb-6">
              Manage your inventory costs to track expenses and calculate profit margins. 
              Add costs for coffee beans, milk, syrups, equipment, and other supplies.
            </p>
            <InventoryManager />
          </div>
        </div>
      </main>
    </div>
  );
}