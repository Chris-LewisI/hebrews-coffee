import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/settings/wait-time-thresholds - Get wait time thresholds
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const yellowSetting = await prisma.settings.findUnique({
      where: { settingKey: 'wait_time_yellow_threshold' },
    });

    const redSetting = await prisma.settings.findUnique({
      where: { settingKey: 'wait_time_red_threshold' },
    });

    const thresholds = {
      yellow: yellowSetting ? parseInt(yellowSetting.settingValue) : 5,
      red: redSetting ? parseInt(redSetting.settingValue) : 10,
    };

    return NextResponse.json({
      success: true,
      data: thresholds,
    });
  } catch (error) {
    console.error('Error fetching wait time thresholds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wait time thresholds' },
      { status: 500 }
    );
  }
}

// POST /api/settings/wait-time-thresholds - Update wait time thresholds
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { yellow_threshold, red_threshold } = await request.json();

    // Validate inputs
    if (!Number.isInteger(yellow_threshold) || !Number.isInteger(red_threshold)) {
      return NextResponse.json(
        { success: false, error: 'Thresholds must be integers' },
        { status: 400 }
      );
    }

    if (yellow_threshold < 1 || red_threshold < 1 || yellow_threshold >= red_threshold) {
      return NextResponse.json(
        { success: false, error: 'Invalid threshold values' },
        { status: 400 }
      );
    }

    // Update yellow threshold
    await prisma.settings.upsert({
      where: { settingKey: 'wait_time_yellow_threshold' },
      update: { settingValue: yellow_threshold.toString() },
      create: {
        settingKey: 'wait_time_yellow_threshold',
        settingValue: yellow_threshold.toString(),
      },
    });

    // Update red threshold
    await prisma.settings.upsert({
      where: { settingKey: 'wait_time_red_threshold' },
      update: { settingValue: red_threshold.toString() },
      create: {
        settingKey: 'wait_time_red_threshold',
        settingValue: red_threshold.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Wait time thresholds updated successfully',
    });
  } catch (error) {
    console.error('Error updating wait time thresholds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update wait time thresholds' },
      { status: 500 }
    );
  }
}