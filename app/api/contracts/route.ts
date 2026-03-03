import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list all grain contracts for the authenticated user
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contracts = await prisma.grainContract.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ contracts });
}

// POST — add a new or update existing grain contract
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await req.json();

        if (data.id && data.id !== 'new') {
            // Update existing contract
            const existing = await prisma.grainContract.findUnique({
                where: { id: data.id }
            });

            if (!existing || existing.userId !== session.user.id) {
                return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
            }

            const contract = await prisma.grainContract.update({
                where: { id: data.id },
                data: {
                    contractNumber: data.contractNumber,
                    commodity: data.commodity,
                    type: data.type,
                    quantityBushels: data.quantityBushels,
                    cashPrice: data.cashPrice,
                    saleDate: data.saleDate,
                    deliveryStart: data.deliveryStart,
                    deliveryEnd: data.deliveryEnd,
                    location: data.location,
                    status: data.status,
                },
            });

            return NextResponse.json({ success: true, contract });
        } else {
            // Create new contract
            const contract = await prisma.grainContract.create({
                data: {
                    userId: session.user.id,
                    contractNumber: data.contractNumber,
                    commodity: data.commodity || 'CORN',
                    type: data.type || 'CASH',
                    quantityBushels: data.quantityBushels,
                    cashPrice: data.cashPrice,
                    saleDate: data.saleDate,
                    deliveryStart: data.deliveryStart,
                    deliveryEnd: data.deliveryEnd,
                    location: data.location,
                    status: data.status || 'FILLED',
                },
            });

            return NextResponse.json({ success: true, contract });
        }
    } catch (error) {
        console.error('Create/Update contract error:', error);
        return NextResponse.json({ error: 'Failed to save contract' }, { status: 500 });
    }
}

// DELETE — remove a contract position by id (passed as query param)
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

    // Ensure the contract belongs to this user
    const contract = await prisma.grainContract.findUnique({ where: { id } });
    if (!contract || contract.userId !== session.user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.grainContract.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
