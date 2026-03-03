import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData } from '@/lib/market-data';

const SYMBOL_MAP: Record<string, string> = {
    'CORN': 'ZC=F',
    'SOYBEANS': 'ZS=F'
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const commodity = searchParams.get('commodity') || 'CORN';
    const symbol = SYMBOL_MAP[commodity.toUpperCase()];

    if (!symbol) {
        return NextResponse.json({ error: 'Invalid commodity' }, { status: 400 });
    }

    try {
        const history = await fetchHistoricalData(symbol, '5y');

        // Group by Marketing Year (Sep 1 to Aug 31)
        const seasonalData: Record<number, { dayOfYear: number; price: number }[]> = {};

        for (const dataPoint of history) {
            const date = new Date(dataPoint.date);
            if (isNaN(date.getTime())) continue;

            const month = date.getMonth(); // 0-based
            const year = date.getFullYear();

            // Marketing year starts in September (month index 8)
            const marketingYear = month >= 8 ? year : year - 1;

            // Only keep last 5 years
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();
            const currentMarketingYear = currentMonth >= 8 ? currentYear : currentYear - 1;

            if (marketingYear < currentMarketingYear - 4 || marketingYear > currentMarketingYear + 1) continue;

            if (!seasonalData[marketingYear]) {
                seasonalData[marketingYear] = [];
            }

            // Calculate day of marketing year (relative to Sept 1)
            const sepFirst = new Date(marketingYear, 8, 1);
            // Ignore timezone offsets for straight diffs
            const msDiff = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
                Date.UTC(sepFirst.getFullYear(), sepFirst.getMonth(), sepFirst.getDate());

            const dayOfYear = Math.floor(msDiff / (1000 * 60 * 60 * 24));

            if (dayOfYear >= 0 && dayOfYear <= 365) {
                seasonalData[marketingYear].push({
                    dayOfYear,
                    price: dataPoint.close
                });
            }
        }

        // Sort data points and filter out noise
        for (const year in seasonalData) {
            seasonalData[year].sort((a, b) => a.dayOfYear - b.dayOfYear);
        }

        return NextResponse.json({
            success: true,
            data: seasonalData,
        });

    } catch (error) {
        console.error('Market history error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch historical market data' },
            { status: 500 }
        );
    }
}
