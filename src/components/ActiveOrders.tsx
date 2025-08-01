'use client';

import { useState, useEffect } from 'react';
import { Order, WaitTimeThresholds } from '@/types';
import { Clock, Play, CheckCircle, Trash2, Printer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ActiveOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [thresholds, setThresholds] = useState<WaitTimeThresholds>({ yellow: 5, red: 10 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    loadThresholds();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(loadOrders, 10000);
    
    // Listen for order creation events
    const handleOrderCreated = () => {
      loadOrders();
    };
    
    window.addEventListener('orderCreated', handleOrderCreated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('orderCreated', handleOrderCreated);
    };
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=active');
      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadThresholds = async () => {
    try {
      const response = await fetch('/api/settings/wait-time-thresholds');
      const data = await response.json();
      if (data.success) {
        setThresholds(data.data);
      }
    } catch (error) {
      console.error('Error loading thresholds:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        loadOrders(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadOrders(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const printLabel = async (orderId: string, orderNumber?: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/label`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Open PDF in new window/tab and attempt to auto-print
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            // Small delay to ensure PDF is loaded, then trigger print
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        } else {
          // Fallback: create downloadable link if popup blocked
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `order-${orderNumber || orderId}-label.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        
        // Clean up the URL after a delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 5000);
      }
    } catch (error) {
      console.error('Error printing label:', error);
    }
  };

  const getWaitTime = (createdAt: Date) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60));
    return minutes;
  };

  const getWaitTimeClass = (minutes: number) => {
    if (minutes >= thresholds.red) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (minutes >= thresholds.yellow) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No active orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const waitMinutes = getWaitTime(order.createdAt);
        
        return (
          <div
            key={order.id}
            className={`border rounded-lg p-4 ${
              order.status === 'PENDING' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {order.customerName}&apos;s {order.drink}
                </h3>
                <p className="text-sm text-gray-600">
                  {order.milk}, {order.syrup || 'No syrup'}, {order.foam}, {order.temperature}
                  {order.extraShots > 0 && <span className="ml-1 text-amber-600">+ {order.extraShots} Extra Shot{order.extraShots > 1 ? 's' : ''}</span>}
                </p>
                {order.notes && (
                  <p className="text-sm text-gray-500 mt-1">
                    <em>Note: {order.notes}</em>
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <span className="text-lg font-bold text-gray-900">
                  ${order.price.toFixed(2)}
                </span>
                
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getWaitTimeClass(waitMinutes)}`}>
                  {waitMinutes}m ago
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => printLabel(order.id, order.orderNumber)}
                  className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Label
                </button>
                
                {order.status === 'PENDING' ? (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'IN_PROGRESS')}
                    className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                    className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </button>
                )}
                
                <button
                  onClick={() => deleteOrder(order.id)}
                  className="inline-flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}