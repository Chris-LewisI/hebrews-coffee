'use client';

import { useState, useEffect } from 'react';
import { Order, WaitTimeThresholds } from '@/types';
import { Search, Filter, Play, CheckCircle, Trash2, Printer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [thresholds, setThresholds] = useState<WaitTimeThresholds>({ yellow: 5, red: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress'>('all');

  useEffect(() => {
    loadOrders();
    loadThresholds();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Filter orders based on search and status
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.drink.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.status.toLowerCase() === statusFilter.replace('_', '')
      );
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

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
        loadOrders();
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
        loadOrders();
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
      return 'bg-red-100 text-red-800';
    } else if (minutes >= thresholds.yellow) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name or drink..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'in_progress')}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer & Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wait Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const waitMinutes = getWaitTime(order.createdAt);
                
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono text-gray-600">
                        #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-lg font-bold text-gray-900">
                          {order.customerName}
                        </div>
                        <div className="text-base font-medium text-gray-700">
                          {order.drink}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-base text-gray-900">
                        {order.milk}, {order.syrup || 'No syrup'}
                      </div>
                      <div className="text-base text-gray-700">
                        {order.foam}, {order.temperature}
                        {order.extraShots > 0 && <span className="ml-1 text-amber-600 font-medium">+ {order.extraShots} Extra Shot{order.extraShots > 1 ? 's' : ''}</span>}
                      </div>
                      {order.notes && (
                        <div className="text-sm text-gray-500 mt-1">
                          <em>{order.notes}</em>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getWaitTimeClass(waitMinutes)}`}>
                          {waitMinutes}m
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => printLabel(order.id, order.orderNumber)}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                          title="Print Label"
                        >
                          <Printer className="h-4 w-4 inline mr-1" />
                          Print
                        </button>
                        
                        {order.status === 'PENDING' ? (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'IN_PROGRESS')}
                            className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-base font-bold transition-colors w-full"
                            title="Start Order"
                          >
                            <Play className="h-5 w-5 inline mr-2" />
                            START
                          </button>
                        ) : (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                            className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-base font-bold transition-colors w-full"
                            title="Complete Order"
                          >
                            <CheckCircle className="h-5 w-5 inline mr-2" />
                            COMPLETE
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="h-4 w-4 inline mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => o.status === 'PENDING').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'IN_PROGRESS').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {orders.length}
            </div>
            <div className="text-sm text-gray-600">Total Active</div>
          </div>
        </div>
      </div>
    </div>
  );
}