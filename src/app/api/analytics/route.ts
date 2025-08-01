import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/analytics - Get analytics data
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all completed orders
    const completedOrders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate basic metrics
    const totalOrders = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.price, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalExtraShots = completedOrders.reduce((sum, order) => sum + (order.extraShots || 0), 0);

    // Calculate average wait time (approximation based on completed orders)
    const avgWaitTime = completedOrders.length > 0 
      ? completedOrders.reduce((sum, order) => {
          const waitMinutes = Math.floor((new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60));
          return sum + Math.max(0, waitMinutes);
        }, 0) / completedOrders.length
      : 0;

    // Group by drink types
    const drinkCounts: Record<string, number> = {};
    const milkCounts: Record<string, number> = {};
    const syrupCounts: Record<string, number> = {};
    const temperatureCounts: Record<string, number> = {};
    const customerCounts: Record<string, number> = {};

    completedOrders.forEach(order => {
      // Drink counts
      drinkCounts[order.drink] = (drinkCounts[order.drink] || 0) + 1;
      
      // Milk counts
      milkCounts[order.milk] = (milkCounts[order.milk] || 0) + 1;
      
      // Syrup counts
      if (order.syrup) {
        syrupCounts[order.syrup] = (syrupCounts[order.syrup] || 0) + 1;
      }
      
      // Temperature counts
      temperatureCounts[order.temperature] = (temperatureCounts[order.temperature] || 0) + 1;
      
      // Customer counts
      customerCounts[order.customerName] = (customerCounts[order.customerName] || 0) + 1;
    });

    // Find most popular items
    const getMostPopular = (counts: Record<string, number>): [string, number] => {
      const entries = Object.entries(counts);
      if (entries.length === 0) return ['None', 0];
      return entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
    };

    const mostPopular = {
      drink: getMostPopular(drinkCounts),
      milk: getMostPopular(milkCounts),
      syrup: getMostPopular(syrupCounts),
    };

    // Top customers
    const topCustomers = Object.entries(customerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const analyticsData = {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      avgWaitTime,
      totalExtraShots,
      drinkCounts,
      milkCounts,
      syrupCounts,
      temperatureCounts,
      customerCounts,
      mostPopular,
      topCustomers,
    };

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}