import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData } from '@/lib/market-data';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;
        const range = req.nextUrl.searchParams.get('range') || '1mo';
        const prices = await fetchHistoricalData(decodeURIComponent(symbol), range);

        return NextResponse.json({
            success: true,
            prices,
            symbol,
            range,
        });
    } catch (error) {
        console.error('Historical data error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch historical data' },
            { status: 500 }
        );
    }
}
