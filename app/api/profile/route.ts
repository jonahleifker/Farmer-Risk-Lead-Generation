import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return existing profile or create a default one
    let profile = await prisma.farmProfile.findUnique({
        where: { userId: session.user.id },
    });

    if (!profile) {
        profile = await prisma.farmProfile.create({
            data: {
                userId: session.user.id,
                commodity: 'corn',
                acres: 1000,
                expectedYield: 200,
                costPerAcre: 0,
                basisAssumption: -0.30,
                storageCost: 0,
                desiredMargin: 0.50,
                costBreakdown: {
                    land: 0, seed: 0, fertilizer: 0, chemical: 0,
                    insurance: 0, equipment: 0, labor: 0, other: 0,
                },
            },
        });
    }

    return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await req.json();

        const profile = await prisma.farmProfile.upsert({
            where: { userId: session.user.id },
            update: {
                commodity: data.commodity,
                acres: data.acres,
                expectedYield: data.expectedYield,
                costPerAcre: data.costPerAcre,
                basisAssumption: data.basisAssumption,
                storageCost: data.storageCost,
                desiredMargin: data.desiredMargin,
                costBreakdown: data.costBreakdown || null,
            },
            create: {
                userId: session.user.id,
                commodity: data.commodity || 'corn',
                acres: data.acres || 1000,
                expectedYield: data.expectedYield || 200,
                costPerAcre: data.costPerAcre || 0,
                basisAssumption: data.basisAssumption ?? -0.30,
                storageCost: data.storageCost || 0,
                desiredMargin: data.desiredMargin ?? 0.50,
                costBreakdown: data.costBreakdown || null,
            },
        });

        return NextResponse.json({ success: true, profile });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
