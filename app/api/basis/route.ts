import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchNearbyCoOps } from '@/lib/basis';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const zipCode = searchParams.get('zipCode');
        const commodity = searchParams.get('commodity') || 'corn';

        if (!zipCode) {
            return NextResponse.json({ error: 'Zip Code required' }, { status: 400 });
        }

        const coOps = await fetchNearbyCoOps(zipCode, commodity);

        return NextResponse.json({ coOps });
    } catch (error) {
        console.error('Failed to fetch basis data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch basis data' },
            { status: 500 }
        );
    }
}
