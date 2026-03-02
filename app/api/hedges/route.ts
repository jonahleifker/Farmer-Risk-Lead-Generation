import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list all hedge positions for the authenticated user
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hedges = await prisma.hedgePosition.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ hedges });
}

// POST — add a new hedge position
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await req.json();
        const hedge = await prisma.hedgePosition.create({
            data: {
                userId: session.user.id,
                bushelsHedged: data.bushelsHedged,
                contractType: data.contractType,
                action: data.action || 'sell',
                entryPrice: data.entryPrice,
                expiration: data.expiration || null,
            },
        });

        return NextResponse.json({ success: true, hedge });
    } catch (error) {
        console.error('Create hedge error:', error);
        return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
    }
}

// DELETE — remove a hedge position by id (passed as query param)
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Ensure the hedge belongs to this user
    const hedge = await prisma.hedgePosition.findUnique({ where: { id } });
    if (!hedge || hedge.userId !== session.user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.hedgePosition.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
