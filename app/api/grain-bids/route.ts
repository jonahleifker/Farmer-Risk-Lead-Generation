import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { haversineDistance } from '@/lib/grain-scraper';
import zipcodes from 'zipcodes';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const zipCode = searchParams.get('zip') || searchParams.get('zipCode');
        const commodity = (searchParams.get('commodity') || 'corn').toLowerCase();
        const radiusMiles = parseInt(searchParams.get('radius') || '150');

        if (!zipCode) {
            return NextResponse.json({ error: 'zip parameter required' }, { status: 400 });
        }

        // Convert ZIP to lat/lon
        const location = zipcodes.lookup(zipCode);
        if (!location) {
            return NextResponse.json({ error: 'Invalid zip code' }, { status: 400 });
        }

        const userLat = location.latitude;
        const userLon = location.longitude;

        // Get all bids for the commodity
        const bids = await prisma.grainBid.findMany({
            where: { commodity },
            orderBy: { fetchedAt: 'desc' },
        });

        // Calculate distance and filter by radius
        const nearbyBids = bids
            .filter(b => b.lat != null && b.lon != null)
            .map(b => ({
                facility: b.facility,
                company: b.company,
                city: b.city,
                state: b.state,
                zip: b.zip,
                commodity: b.commodity,
                cashPrice: b.cashPrice,
                basis: b.basis,
                futuresContract: b.futuresContract,
                deliveryStart: b.deliveryStart,
                deliveryEnd: b.deliveryEnd,
                distance: Math.round(haversineDistance(userLat, userLon, b.lat!, b.lon!) * 10) / 10,
                fetchedAt: b.fetchedAt,
            }))
            .filter(b => b.distance <= radiusMiles)
            .sort((a, b) => a.distance - b.distance);

        // Deduplicate: keep only one bid per facility (nearest delivery month)
        const seen = new Set<string>();
        const uniqueBids = nearbyBids.filter(b => {
            const key = `${b.facility}-${b.city}-${b.state}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return NextResponse.json({
            zip: zipCode,
            commodity,
            userLocation: { lat: userLat, lon: userLon, city: location.city, state: location.state },
            totalResults: uniqueBids.length,
            bids: uniqueBids.slice(0, 30), // Return top 30 closest
        });
    } catch (error) {
        console.error('Failed to fetch grain bids:', error);
        return NextResponse.json({ error: 'Failed to fetch grain bids' }, { status: 500 });
    }
}
