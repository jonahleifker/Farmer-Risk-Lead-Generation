import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { refreshGrainBids } from '@/lib/grain-scraper';

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await refreshGrainBids();

        return NextResponse.json({
            success: true,
            totalBids: result.totalBids,
            sourcesScraped: result.sources,
            errors: result.errors,
        });
    } catch (error) {
        console.error('Failed to refresh grain bids:', error);
        return NextResponse.json({ error: 'Failed to refresh grain bids' }, { status: 500 });
    }
}
