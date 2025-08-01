import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface OrderCostCalculation {
  orderId: string;
  revenue: number;
  estimatedCost: number;
  profit: number;
  margin: number;
}

// GET /api/analytics/profit - Get profit analysis
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all completed orders
    const orders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    // Get all inventory costs
    const inventoryCosts = await prisma.inventoryCost.findMany();

    // Create cost lookup maps
    const coffeeCosts = inventoryCosts.filter(cost => cost.category === 'COFFEE_BEANS');
    const milkCosts = inventoryCosts.filter(cost => cost.category === 'MILK');
    const syrupCosts = inventoryCosts.filter(cost => cost.category === 'SYRUP');
    // Remove labor costs as requested
    const supplyCosts = inventoryCosts.filter(cost => cost.category === 'SUPPLIES');

    // Calculate costs for each order
    const orderCalculations: OrderCostCalculation[] = orders.map(order => {
      let estimatedCost = 0;

      // Base coffee cost (assume 1-2 shots per drink)
      const baseShotsNeeded = 1 + order.extraShots;
      const coffeeCost = coffeeCosts.find(cost => 
        cost.itemName.toLowerCase().includes('coffee') || 
        cost.itemName.toLowerCase().includes('bean')
      );
      if (coffeeCost) {
        estimatedCost += coffeeCost.unitCost * baseShotsNeeded;
      }

      // Milk cost (assume 6oz for most drinks)
      const milkCost = milkCosts.find(cost => 
        cost.itemName.toLowerCase().includes(order.milk.toLowerCase())
      );
      if (milkCost) {
        estimatedCost += milkCost.unitCost * 0.75; // 6oz = ~0.75 cups
      }

      // Syrup cost
      if (order.syrup) {
        const syrupCost = syrupCosts.find(cost => 
          cost.itemName.toLowerCase().includes(order.syrup!.toLowerCase())
        );
        if (syrupCost) {
          estimatedCost += syrupCost.unitCost * 0.5; // ~0.5oz of syrup
        }
      }

      // Labor cost removed as requested

      // Supply costs (cups, lids, etc. - fixed cost per order)
      const supplyCost = supplyCosts.find(cost => 
        cost.itemName.toLowerCase().includes('cup') || 
        cost.itemName.toLowerCase().includes('supply')
      );
      if (supplyCost) {
        estimatedCost += supplyCost.unitCost;
      }

      const profit = order.price - estimatedCost;
      const margin = order.price > 0 ? (profit / order.price) * 100 : 0;

      return {
        orderId: order.id,
        revenue: order.price,
        estimatedCost,
        profit,
        margin,
      };
    });

    // Calculate summary statistics
    const totalRevenue = orderCalculations.reduce((sum, calc) => sum + calc.revenue, 0);
    const totalCosts = orderCalculations.reduce((sum, calc) => sum + calc.estimatedCost, 0);
    const totalProfit = totalRevenue - totalCosts;
    const averageMargin = orderCalculations.length > 0 
      ? orderCalculations.reduce((sum, calc) => sum + calc.margin, 0) / orderCalculations.length
      : 0;

    // Calculate profit by time periods
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentOrders = orders.filter(order => order.createdAt >= thirtyDaysAgo);
    const weeklyOrders = orders.filter(order => order.createdAt >= sevenDaysAgo);

    const monthlyRevenue = recentOrders.reduce((sum, order) => sum + order.price, 0);
    const weeklyRevenue = weeklyOrders.reduce((sum, order) => sum + order.price, 0);

    // Estimate monthly and weekly costs
    const monthlyCostEstimate = recentOrders.length > 0 
      ? (totalCosts / orderCalculations.length) * recentOrders.length
      : 0;
    const weeklyCostEstimate = weeklyOrders.length > 0 
      ? (totalCosts / orderCalculations.length) * weeklyOrders.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalCosts,
          totalProfit,
          averageMargin,
          totalOrders: orderCalculations.length,
        },
        periods: {
          monthly: {
            revenue: monthlyRevenue,
            estimatedCosts: monthlyCostEstimate,
            estimatedProfit: monthlyRevenue - monthlyCostEstimate,
            orders: recentOrders.length,
          },
          weekly: {
            revenue: weeklyRevenue,
            estimatedCosts: weeklyCostEstimate,
            estimatedProfit: weeklyRevenue - weeklyCostEstimate,
            orders: weeklyOrders.length,
          },
        },
        costBreakdown: {
          coffee: coffeeCosts.reduce((sum, cost) => sum + cost.unitCost, 0),
          milk: milkCosts.reduce((sum, cost) => sum + cost.unitCost, 0),
          syrups: syrupCosts.reduce((sum, cost) => sum + cost.unitCost, 0),
          supplies: supplyCosts.reduce((sum, cost) => sum + cost.unitCost, 0),
        },
        inventory: {
          totalInventoryCost: inventoryCosts.reduce((sum, cost) => sum + cost.unitCost, 0),
          totalItems: inventoryCosts.length,
          byCategory: {
            coffee: coffeeCosts.length,
            milk: milkCosts.length,
            syrups: syrupCosts.length,
            supplies: supplyCosts.length,
            equipment: inventoryCosts.filter(cost => cost.category === 'EQUIPMENT').length,
            other: inventoryCosts.filter(cost => cost.category === 'OTHER').length,
          },
        },
        recentOrders: orderCalculations.slice(0, 10), // Last 10 orders
      },
    });
  } catch (error) {
    console.error('Error calculating profit analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate profit analytics' },
      { status: 500 }
    );
  }
}