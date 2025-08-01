import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/export/csv - Export completed orders as CSV
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    // Create CSV content
    const headers = [
      'Customer Name',
      'Drink',
      'Milk',
      'Syrup',
      'Foam',
      'Temperature',
      'Extra Shots',
      'Notes',
      'Price',
      'Created At',
      'Completed At'
    ];

    const csvRows = [
      headers.join(','),
      ...orders.map(order => [
        `"${order.customerName}"`,
        `"${order.drink}"`,
        `"${order.milk}"`,
        `"${order.syrup || ''}"`,
        `"${order.foam || ''}"`,
        `"${order.temperature}"`,
        order.extraShots || 0,
        `"${order.notes || ''}"`,
        order.price.toFixed(2),
        order.createdAt.toISOString(),
        order.updatedAt.toISOString()
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const filename = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}