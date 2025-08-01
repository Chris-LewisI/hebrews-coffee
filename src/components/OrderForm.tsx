'use client';

import { useState, useEffect } from 'react';
import { OrderFormData, MenuConfig, Order } from '@/types';
import { Plus, Printer, X } from 'lucide-react';

export default function OrderForm() {
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    drink: '',
    milk: '',
    syrup: '',
    foam: '',
    temperature: 'Hot',
    extraShots: 0,
    notes: '',
  });

  const [menuItems, setMenuItems] = useState<{
    drinks: MenuConfig[];
    milks: MenuConfig[];
    syrups: MenuConfig[];
    foams: MenuConfig[];
    temperatures: MenuConfig[];
  }>({
    drinks: [],
    milks: [],
    syrups: [],
    foams: [],
    temperatures: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Load menu items
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const grouped = data.data.reduce((acc: Record<string, MenuConfig[]>, item: MenuConfig) => {
            const key = `${item.itemType.toLowerCase()}s`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          }, {});
          setMenuItems(grouped);
          
          // Set defaults
          if (grouped.milks?.length > 0) {
            setFormData(prev => ({ ...prev, milk: grouped.milks[0].itemName }));
          }
          if (grouped.foams?.length > 0) {
            setFormData(prev => ({ ...prev, foam: grouped.foams[0].itemName }));
          }
        }
      });

  }, []);


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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.drink) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setCreatedOrder(result.data);
        setShowOrderConfirmation(true);
        
        // Trigger active orders refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('orderCreated'));
        
        // Reset form
        setFormData({
          customerName: '',
          drink: '',
          milk: menuItems.milks[0]?.itemName || '',
          syrup: '',
          foam: menuItems.foams[0]?.itemName || '',
          temperature: 'Hot',
          extraShots: 0,
          notes: '',
        });
      } else {
        console.error('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeConfirmation = () => {
    setShowOrderConfirmation(false);
    setCreatedOrder(null);
  };

  const getCurrentPrice = () => {
    const drinkPrice = menuItems.drinks.find(d => d.itemName === formData.drink)?.price || 0;
    const extraShotsPrice = formData.extraShots * 1.0;
    return drinkPrice + extraShotsPrice;
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="min-h-screen md:h-screen md:overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 h-full p-2 md:p-4 pb-20 md:pb-4">
        
        {/* Left Column - Customer & Drink */}
        <div className="space-y-3">
          {/* Customer Name */}
          <div className="relative">
            <label htmlFor="customerName" className="block text-sm font-semibold text-gray-900 mb-2">
              Customer Name
            </label>
            <input
              id="customerName"
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm"
              placeholder="Enter customer name"
            />
          </div>

          {/* Drink Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Drink
            </label>
            <div className="scroll-container border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 gap-2 max-h-48 md:max-h-96 overflow-y-auto p-2 scrollbar-thin">
                {menuItems.drinks.map((drink) => (
                  <button
                    key={drink.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, drink: drink.itemName })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      formData.drink === drink.itemName
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-gray-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div className="font-semibold text-sm">{drink.itemName}</div>
                    <div className="text-base font-bold text-amber-600">${drink.price?.toFixed(2)}</div>
                  </button>
                ))}
              </div>
              <div className="scroll-fade-bottom"></div>
            </div>
          </div>
        </div>

        {/* Middle Column - Options */}
        <div className="space-y-3">
          {/* Milk Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Milk Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {menuItems.milks.map((milk) => (
                <button
                  key={milk.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, milk: milk.itemName })}
                  className={`p-2 rounded-lg border-2 text-center transition-all ${
                    formData.milk === milk.itemName
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="font-medium text-xs">{milk.itemName}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Temperature Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Temperature
            </label>
            <div className="grid grid-cols-3 gap-2">
              {menuItems.temperatures.map((temp) => (
                <button
                  key={temp.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, temperature: temp.itemName })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    formData.temperature === temp.itemName
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="font-bold text-sm">{temp.itemName}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Syrup Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Syrup
            </label>
            <div className="scroll-container border border-gray-200 rounded-lg">
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, syrup: '' })}
                  className={`p-2 rounded-lg border-2 text-center transition-all ${
                    formData.syrup === ''
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="font-medium text-xs">None</div>
                </button>
                {menuItems.syrups.map((syrup) => (
                  <button
                    key={syrup.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, syrup: syrup.itemName })}
                    className={`p-2 rounded-lg border-2 text-center transition-all ${
                      formData.syrup === syrup.itemName
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-gray-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div className="font-medium text-xs">{syrup.itemName}</div>
                  </button>
                ))}
              </div>
              <div className="scroll-fade-bottom"></div>
            </div>
          </div>

          {/* Foam Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Foam
            </label>
            <div className="grid grid-cols-2 gap-2">
              {menuItems.foams.map((foam) => (
                <button
                  key={foam.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, foam: foam.itemName })}
                  className={`p-2 rounded-lg border-2 text-center transition-all ${
                    formData.foam === foam.itemName
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="font-medium text-xs">{foam.itemName}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Extras & Submit */}
        <div className="space-y-3">
          {/* Extra Shots */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Extra Shots
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, extraShots: Math.max(0, formData.extraShots - 1) })}
                className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white hover:border-amber-300 flex items-center justify-center text-gray-600 hover:text-amber-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formData.extraShots <= 0}
              >
                −
              </button>
              
              <div className="flex-1 text-center p-2 border-2 border-gray-200 rounded-lg bg-gray-50">
                <div className="font-bold text-base text-gray-900">
                  {formData.extraShots} {formData.extraShots === 1 ? 'Shot' : 'Shots'}
                </div>
                <div className="text-xs text-green-600 font-semibold">
                  {formData.extraShots > 0 ? `+$${(formData.extraShots * 1.0).toFixed(2)}` : 'No extra shots'}
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setFormData({ ...formData, extraShots: Math.min(5, formData.extraShots + 1) })}
                className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white hover:border-amber-300 flex items-center justify-center text-gray-600 hover:text-amber-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={formData.extraShots >= 5}
              >
                +
              </button>
            </div>
            
            {/* Quick Selection Buttons */}
            <div className="grid grid-cols-3 gap-1">
              {[0, 1, 2].map((shots) => (
                <button
                  key={shots}
                  type="button"
                  onClick={() => setFormData({ ...formData, extraShots: shots })}
                  className={`p-2 rounded-lg border-2 text-center transition-all ${
                    formData.extraShots === shots
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="text-xs font-medium">
                    {shots === 0 ? 'None' : `${shots} Shot${shots > 1 ? 's' : ''}`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm"
              placeholder="Special requests..."
            />
          </div>

          {/* Price Display */}
          {formData.drink && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-3">
              <div className="text-xl font-bold text-amber-800">
                Total: ${getCurrentPrice().toFixed(2)}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.customerName || !formData.drink}
            className="w-full flex justify-center items-center py-3 px-4 border-2 border-transparent rounded-lg shadow-lg text-base font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </div>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </>
            )}
          </button>
        </div>
        </div>
      </form>

      {/* Order Confirmation Popup */}
      {showOrderConfirmation && createdOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Order Created Successfully!</h3>
                <button
                  onClick={closeConfirmation}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Order #{createdOrder.orderNumber || createdOrder.id.slice(-6).toUpperCase()}</div>
                  <div className="font-semibold text-gray-900">{createdOrder.customerName}</div>
                  <div className="text-sm text-gray-700">{createdOrder.drink}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {createdOrder.milk}, {createdOrder.syrup || 'No syrup'}, {createdOrder.foam}, {createdOrder.temperature}
                    {createdOrder.extraShots > 0 && <span className="ml-1 text-amber-600">+ {createdOrder.extraShots} Extra Shot{createdOrder.extraShots > 1 ? 's' : ''}</span>}
                  </div>
                  {createdOrder.notes && (
                    <div className="text-xs text-gray-500 mt-1">
                      <em>Note: {createdOrder.notes}</em>
                    </div>
                  )}
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="text-xl font-bold text-amber-800">
                    Total: ${createdOrder.price.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => printLabel(createdOrder.id, createdOrder.orderNumber)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Label
                </button>
                <button
                  onClick={closeConfirmation}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}