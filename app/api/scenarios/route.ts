import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scenarios = await prisma.scenario.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ scenarios });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await req.json();
        const scenario = await prisma.scenario.create({
            data: {
                userId: session.user.id,
                name: data.name || 'Untitled Scenario',
                commodity: data.commodity,
                acres: data.acres,
                expectedYield: data.expectedYield,
                costPerAcre: data.costPerAcre,
                basisAssumption: data.basisAssumption,
                storageCost: data.storageCost || 0,
                desiredMargin: data.desiredMargin || 0.50,
                targetProfit: data.targetProfit || null,
                breakEvenPrice: data.breakEvenPrice,
                notes: data.notes || null,
            },
        });

        return NextResponse.json({ success: true, scenario });
    } catch (error) {
        console.error('Create scenario error:', error);
        return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
    }
}
