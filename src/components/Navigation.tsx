'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  Coffee,
  Home, 
  ListOrdered, 
  BarChart3, 
  Menu as MenuIcon, 
  LogOut,
  User,
  Bell,
  Volume2,
  VolumeX,
  Package,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavigationProps {
  orderCounts?: {
    pending: number;
    inProgress: number;
    completed: number;
  };
}

export default function Navigation({ orderCounts }: NavigationProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('soundEnabled');
    setSoundEnabled(stored !== 'false');
  }, []);

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('soundEnabled', String(newValue));
  };

  const navigation = [
    {
      name: 'New Order',
      href: '/',
      icon: Home,
      current: pathname === '/',
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ListOrdered,
      current: pathname === '/orders',
      badge: orderCounts ? orderCounts.pending + orderCounts.inProgress : 0,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      current: pathname === '/analytics',
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: Package,
      current: pathname === '/inventory',
    },
    {
      name: 'Menu Config',
      href: '/menu',
      icon: MenuIcon,
      current: pathname === '/menu',
    },
  ];

  const activeOrders = orderCounts ? orderCounts.pending + orderCounts.inProgress : 0;

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Coffee className="h-6 w-6 text-amber-600" />
                </div>
                <span className="text-xl font-bold text-gray-900">HeBrews Coffee</span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      item.current
                        ? 'border-amber-500 text-gray-900'
                        : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {/* Active Orders Indicator */}
            {activeOrders > 0 && (
              <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                <Bell className="h-4 w-4" />
                <span>{activeOrders} active</span>
              </div>
            )}

            {/* Sound Toggle */}
            {mounted && (
              <button
                onClick={toggleSound}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900"
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-gray-700" />
                ) : (
                  <VolumeX className="h-5 w-5 text-gray-700" />
                )}
              </button>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-gray-900 font-medium">
                <User className="h-4 w-4" />
                <span>{session?.user?.username}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-2 text-base font-medium ${
                    item.current
                      ? 'text-amber-600 bg-amber-50 border-r-4 border-amber-600'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* Mobile menu footer */}
          <div className="pt-4 pb-3 border-t border-gray-200 bg-white">
            <div className="flex items-center px-4">
              <div className="flex items-center space-x-2 text-base font-medium text-gray-800">
                <User className="h-5 w-5" />
                <span>{session?.user?.username}</span>
              </div>
            </div>
            <div className="mt-3 space-y-1 px-4">
              {/* Sound Toggle */}
              {mounted && (
                <button
                  onClick={toggleSound}
                  className="flex items-center w-full px-0 py-2 text-base font-medium text-gray-700 hover:text-gray-900"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-5 w-5 mr-3" />
                  ) : (
                    <VolumeX className="h-5 w-5 mr-3" />
                  )}
                  {soundEnabled ? 'Disable Sound' : 'Enable Sound'}
                </button>
              )}
              
              {/* Sign Out */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center w-full px-0 py-2 text-base font-medium text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}