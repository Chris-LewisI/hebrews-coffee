'use client';

import { useState, useEffect } from 'react';
import { InventoryCost, InventoryCostFormData, InventoryCategory } from '@/types';
import { Plus, Edit, Trash2, DollarSign, Package } from 'lucide-react';

export default function InventoryManager() {
  const [inventoryCosts, setInventoryCosts] = useState<InventoryCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryCost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const [formData, setFormData] = useState<InventoryCostFormData>({
    itemName: '',
    category: 'COFFEE_BEANS',
    unitCost: 0,
    unit: '',
    notes: '',
  });

  const categories: { value: InventoryCategory; label: string }[] = [
    { value: 'COFFEE_BEANS', label: 'Coffee Beans' },
    { value: 'MILK', label: 'Milk' },
    { value: 'SYRUP', label: 'Syrups' },
    { value: 'EQUIPMENT', label: 'Equipment' },
    { value: 'SUPPLIES', label: 'Supplies' },
    { value: 'LABOR', label: 'Labor' },
    { value: 'OTHER', label: 'Other' },
  ];

  useEffect(() => {
    loadInventoryCosts();
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInventoryCosts = async () => {
    try {
      const url = selectedCategory 
        ? `/api/inventory-costs?category=${selectedCategory}`
        : '/api/inventory-costs';
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setInventoryCosts(data.data);
      } else {
        console.error('Failed to load inventory costs:', data.error);
      }
    } catch (error) {
      console.error('Error loading inventory costs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingItem 
        ? `/api/inventory-costs/${editingItem.id}`
        : '/api/inventory-costs';
      
      const method = editingItem ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadInventoryCosts();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save inventory cost');
      }
    } catch (error) {
      console.error('Error saving inventory cost:', error);
      alert('Error saving inventory cost');
    }
  };

  const handleEdit = (item: InventoryCost) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      category: item.category,
      unitCost: item.unitCost,
      unit: item.unit,
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (item: InventoryCost) => {
    if (!confirm(`Are you sure you want to delete "${item.itemName}"?`)) return;

    try {
      const response = await fetch(`/api/inventory-costs/${item.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadInventoryCosts();
      } else {
        alert('Failed to delete inventory cost');
      }
    } catch (error) {
      console.error('Error deleting inventory cost:', error);
      alert('Error deleting inventory cost');
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      category: 'COFFEE_BEANS',
      unitCost: 0,
      unit: '',
      notes: '',
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const getTotalCostByCategory = () => {
    const costsByCategory = inventoryCosts.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = 0;
      acc[item.category] += item.unitCost;
      return acc;
    }, {} as Record<string, number>);
    
    return costsByCategory;
  };

  const totalInventoryValue = inventoryCosts.reduce((sum, item) => sum + item.unitCost, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          
          {/* Total Value Display */}
          <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-3 py-2 rounded-lg">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">
              Total Value: ${totalInventoryValue.toFixed(2)}
            </span>
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Cost Item</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-muted p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingItem ? 'Edit Cost Item' : 'Add New Cost Item'}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Item Name
              </label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., Arabica Coffee Beans"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as InventoryCategory })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-amber-500 focus:border-amber-500"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-amber-500 focus:border-amber-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Unit
              </label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., per lb, per oz, per shot"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:ring-amber-500 focus:border-amber-500"
                placeholder="Additional notes about this cost item..."
              />
            </div>
            
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {editingItem ? 'Update' : 'Add'} Cost Item
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-muted-foreground hover:bg-muted text-background px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory List */}
      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Unit Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventoryCosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {selectedCategory 
                        ? `No cost items found for ${categories.find(c => c.value === selectedCategory)?.label}`
                        : 'No inventory costs added yet'}
                    </p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-2 text-amber-600 hover:text-amber-700 font-medium"
                    >
                      Add your first cost item
                    </button>
                  </td>
                </tr>
              ) : (
                inventoryCosts.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-foreground">{item.itemName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                        {categories.find(c => c.value === item.category)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-foreground font-medium">${item.unitCost.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-muted-foreground">{item.unit}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-muted-foreground text-sm max-w-xs truncate">
                        {item.notes || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-muted-foreground hover:text-amber-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Summary */}
      {inventoryCosts.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Cost Summary by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(getTotalCostByCategory()).map(([category, total]) => (
              <div key={category} className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  {categories.find(c => c.value === category)?.label}
                </div>
                <div className="text-lg font-semibold text-foreground">
                  ${total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}