import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Returns all unique grain bid facility locations for map display.
 * No auth required  — public data from co-op websites.
 */
export async function GET() {
    try {
        const facilities = await prisma.grainBid.findMany({
            select: {
                facility: true,
                company: true,
                city: true,
                state: true,
                lat: true,
                lon: true,
                commodity: true,
            },
            where: {
                lat: { not: null },
                lon: { not: null },
            },
        });

        // Deduplicate by facility + city + state
        const seen = new Set<string>();
        const unique = facilities.filter(f => {
            const key = `${f.facility}-${f.city}-${f.state}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return NextResponse.json({ locations: unique, total: unique.length });
    } catch (error) {
        console.error('Failed to fetch locations:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}
