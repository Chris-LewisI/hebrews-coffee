import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/analytics/time-series - Get orders over time data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default: 7 days ago
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]; // Default: today
    const groupBy = searchParams.get('groupBy') || 'hour'; // hour, day, week

    // Fetch orders within date range
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate + 'T00:00:00.000Z'),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group orders by time period
    const groupedData: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key: string;
      
      if (groupBy === 'hour') {
        // Group by hour (e.g., "2024-01-31 14:00")
        const hour = date.getHours();
        key = `${date.toISOString().split('T')[0]} ${hour.toString().padStart(2, '0')}:00`;
      } else if (groupBy === 'day') {
        // Group by day (e.g., "2024-01-31")
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        // Group by week (start of week)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else {
        key = date.toISOString().split('T')[0];
      }
      
      groupedData[key] = (groupedData[key] || 0) + 1;
    });

    // Convert to array format for charts
    const timeSeriesData = Object.entries(groupedData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({
        time,
        count,
        label: formatTimeLabel(time, groupBy),
      }));

    // Fill in missing time periods with 0 counts
    const filledData = fillMissingTimeSlots(timeSeriesData, startDate, endDate, groupBy);

    // Calculate busy hours summary (for hour grouping)
    let busyHours: { hour: number; count: number; label: string }[] = [];
    if (groupBy === 'hour') {
      const hourlyTotals: Record<number, number> = {};
      orders.forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        hourlyTotals[hour] = (hourlyTotals[hour] || 0) + 1;
      });
      
      busyHours = Object.entries(hourlyTotals)
        .map(([hour, count]) => ({
          hour: parseInt(hour),
          count,
          label: formatHourLabel(parseInt(hour)),
        }))
        .sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      success: true,
      data: {
        timeSeries: filledData,
        busyHours,
        totalOrders: orders.length,
        dateRange: { startDate, endDate },
        groupBy,
      },
    });
  } catch (error) {
    console.error('Error fetching time series analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time series analytics' },
      { status: 500 }
    );
  }
}

function formatTimeLabel(time: string, groupBy: string): string {
  if (groupBy === 'hour') {
    const [date, hour] = time.split(' ');
    const dateObj = new Date(date + 'T' + hour);
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      hour12: true
    });
  } else if (groupBy === 'day') {
    const dateObj = new Date(time);
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  } else if (groupBy === 'week') {
    const dateObj = new Date(time);
    return `Week of ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return time;
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

function fillMissingTimeSlots(
  data: { time: string; count: number; label: string }[],
  startDate: string,
  endDate: string,
  groupBy: string
): { time: string; count: number; label: string }[] {
  const result = [...data];
  const existingTimes = new Set(data.map(d => d.time));
  
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T23:59:59.999Z');
  
  if (groupBy === 'hour') {
    // Fill missing hours
    const current = new Date(start);
    while (current <= end) {
      const hour = current.getHours();
      const timeKey = `${current.toISOString().split('T')[0]} ${hour.toString().padStart(2, '0')}:00`;
      
      if (!existingTimes.has(timeKey)) {
        result.push({
          time: timeKey,
          count: 0,
          label: formatTimeLabel(timeKey, groupBy),
        });
      }
      
      current.setHours(current.getHours() + 1);
    }
  } else if (groupBy === 'day') {
    // Fill missing days
    const current = new Date(start);
    while (current <= end) {
      const timeKey = current.toISOString().split('T')[0];
      
      if (!existingTimes.has(timeKey)) {
        result.push({
          time: timeKey,
          count: 0,
          label: formatTimeLabel(timeKey, groupBy),
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
  }
  
  return result.sort((a, b) => a.time.localeCompare(b.time));
}