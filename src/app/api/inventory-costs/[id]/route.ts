import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InventoryCostFormData } from '@/types';

// GET /api/inventory-costs/[id] - Get specific inventory cost
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const inventoryCost = await prisma.inventoryCost.findUnique({
      where: { id },
    });

    if (!inventoryCost) {
      return NextResponse.json(
        { success: false, error: 'Inventory cost not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: inventoryCost,
    });
  } catch (error) {
    console.error('Error fetching inventory cost:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory cost' },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory-costs/[id] - Update inventory cost
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: Partial<InventoryCostFormData> = await request.json();

    // Validate unitCost if provided
    if (body.unitCost !== undefined && body.unitCost <= 0) {
      return NextResponse.json(
        { success: false, error: 'Unit cost must be greater than 0' },
        { status: 400 }
      );
    }

    const inventoryCost = await prisma.inventoryCost.update({
      where: { id },
      data: {
        ...(body.itemName && { itemName: body.itemName.trim() }),
        ...(body.category && { category: body.category }),
        ...(body.unitCost !== undefined && { unitCost: body.unitCost }),
        ...(body.unit && { unit: body.unit.trim() }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      },
    });

    return NextResponse.json({
      success: true,
      data: inventoryCost,
    });
  } catch (error) {
    console.error('Error updating inventory cost:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory cost' },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory-costs/[id] - Delete inventory cost
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.inventoryCost.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Inventory cost deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting inventory cost:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete inventory cost' },
      { status: 500 }
    );
  }
}