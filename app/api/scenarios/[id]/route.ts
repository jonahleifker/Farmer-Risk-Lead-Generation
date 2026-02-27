import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const scenario = await prisma.scenario.findFirst({
        where: { id, userId: session.user.id },
    });

    if (!scenario) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ scenario });
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.scenario.findFirst({
        where: { id, userId: session.user.id },
    });

    if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const data = await req.json();
        const scenario = await prisma.scenario.update({
            where: { id },
            data: {
                name: data.name,
                commodity: data.commodity,
                acres: data.acres,
                expectedYield: data.expectedYield,
                costPerAcre: data.costPerAcre,
                basisAssumption: data.basisAssumption,
                storageCost: data.storageCost,
                desiredMargin: data.desiredMargin,
                targetProfit: data.targetProfit,
                breakEvenPrice: data.breakEvenPrice,
                notes: data.notes,
            },
        });

        return NextResponse.json({ success: true, scenario });
    } catch (error) {
        console.error('Update scenario error:', error);
        return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.scenario.findFirst({
        where: { id, userId: session.user.id },
    });

    if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.scenario.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
