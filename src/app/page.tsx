import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OrderForm from '@/components/OrderForm';
import Navigation from '@/components/Navigation';
import ActiveOrders from '@/components/ActiveOrders';

export default async function HomePage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Form - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">New Order</h1>
              <OrderForm />
            </div>
          </div>

          {/* Active Orders - Takes 1 column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Orders</h2>
              <ActiveOrders />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
