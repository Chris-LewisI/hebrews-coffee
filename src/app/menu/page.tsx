import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';
import MenuManager from '@/components/MenuManager';

export default async function MenuPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Menu Configuration</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage drinks, milk options, syrups, and other menu items
            </p>
          </div>
          
          <div className="p-6">
            <MenuManager />
          </div>
        </div>
      </main>
    </div>
  );
}