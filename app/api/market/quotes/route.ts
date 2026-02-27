import { NextResponse } from 'next/server';
import { fetchMarketQuotes } from '@/lib/market-data';

export async function GET() {
    try {
        const quotes = await fetchMarketQuotes();
        return NextResponse.json({
            success: true,
            data: quotes,
            fetchedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Market quotes error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch market data' },
            { status: 500 }
        );
    }
}
