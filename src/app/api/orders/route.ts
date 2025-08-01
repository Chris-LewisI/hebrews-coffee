import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { OrderFormData } from '@/types';

// GET /api/orders - Get orders with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    // Handle status filtering
    if (status === 'active') {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    } else if (status === 'pending') {
      where.status = 'PENDING';
    } else if (status === 'in_progress') {
      where.status = 'IN_PROGRESS';
    } else if (status === 'completed') {
      where.status = 'COMPLETED';
    }

    // Handle search filtering
    if (search) {
      where.customerName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // pending first, then in_progress, then completed
        { createdAt: 'asc' }, // oldest first within each status
      ],
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: OrderFormData = await request.json();

    // Validate required fields
    if (!body.customerName || !body.drink || !body.milk || !body.temperature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate price
    const drinkItem = await prisma.menuConfig.findFirst({
      where: {
        itemType: 'DRINK',
        itemName: body.drink,
      },
    });

    const basePrice = drinkItem?.price || 0;
    const extraShotsPrice = (body.extraShots || 0) * 1.0;
    const totalPrice = basePrice + extraShotsPrice;

    // Create order (orderNumber will auto-increment)
    const order = await prisma.order.create({
      data: {
        customerName: body.customerName.trim(),
        drink: body.drink,
        milk: body.milk,
        syrup: body.syrup || null,
        foam: body.foam || null,
        temperature: body.temperature,
        extraShots: body.extraShots || 0,
        notes: body.notes?.trim() || null,
        price: totalPrice,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}