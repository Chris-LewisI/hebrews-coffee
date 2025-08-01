import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InventoryCostFormData, InventoryCategory } from '@/types';

// GET /api/inventory-costs - Get all inventory costs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where = category ? { category: category as InventoryCategory } : {};

    const inventoryCosts = await prisma.inventoryCost.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { itemName: 'asc' }
      ],
    });

    return NextResponse.json({
      success: true,
      data: inventoryCosts,
    });
  } catch (error) {
    console.error('Error fetching inventory costs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory costs' },
      { status: 500 }
    );
  }
}

// POST /api/inventory-costs - Create new inventory cost
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: InventoryCostFormData = await request.json();

    // Validate required fields
    if (!body.itemName || !body.category || body.unitCost === undefined || !body.unit) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate unitCost is positive
    if (body.unitCost <= 0) {
      return NextResponse.json(
        { success: false, error: 'Unit cost must be greater than 0' },
        { status: 400 }
      );
    }

    const inventoryCost = await prisma.inventoryCost.create({
      data: {
        itemName: body.itemName.trim(),
        category: body.category,
        unitCost: body.unitCost,
        unit: body.unit.trim(),
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: inventoryCost,
    });
  } catch (error) {
    console.error('Error creating inventory cost:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create inventory cost' },
      { status: 500 }
    );
  }
}