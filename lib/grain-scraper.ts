import { prisma } from './prisma';

/**
 * Agricharts co-op subdomains we scrape for grain bid data.
 * Each subdomain maps to a co-op/elevator with one or more facilities.
 */
const AGRICHARTS_SOURCES = [
    { subdomain: 'keycoop', company: 'Key Cooperative' },
    { subdomain: 'coopfe', company: 'Cooperative Farmers Elevator' },
    { subdomain: 'sdwg', company: 'Agtegra' },
    { subdomain: 'alciviacoop', company: 'Alcivia' },
    { subdomain: 'bannercoop', company: 'Banner Co-op Elevator' },
    { subdomain: 'stickneyelevator', company: 'Stickney Elevator' },
    { subdomain: 'farmerselevatorco', company: 'Farmers Elevator & Supply' },
    { subdomain: 'coopelev', company: 'Cooperative Elevator Co' },
    { subdomain: 'farmersco-operative', company: 'Farmers Cooperative' },
    { subdomain: 'glacialplains', company: 'Glacial Plains Cooperative' },
    { subdomain: 'chsfarmerselevator', company: 'CHS Farmers Elevator' },
];

interface AgrichartsLocation {
    id: string;
    name: string;
    display_name: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    latitude: string | null;
    longitude: string | null;
    cashbids: AgrichartsBid[];
}

interface AgrichartsBid {
    id: string;
    commodity: string;
    symbol: string;           // e.g. "ZCK26" (corn May 2026) or "ZSK26" (soybeans May 2026)
    basis: number;            // in cents (e.g., -45 means -$0.45)
    delivery_start: string;
    delivery_end: string;
    active: boolean;
    notes: string | null;
}

/**
 * Maps futures symbols to commodity names.
 * ZC = corn, ZS = soybeans, ZW = wheat
 */
function symbolToCommodity(symbol: string): string | null {
    if (!symbol) return null;
    if (symbol.startsWith('ZC')) return 'corn';
    if (symbol.startsWith('ZS')) return 'soybeans';
    if (symbol.startsWith('ZW')) return 'wheat';
    return null;
}

/**
 * Parses the Agricharts response which wraps JSON in a <script> tag.
 * The response format is: <script>...</script><script>var bids = [...]; var ...</script>
 */
function parseAgrichartsResponse(html: string): AgrichartsLocation[] {
    // Extract the JSON array from "var bids = [...];"
    const match = html.match(/var\s+bids\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) {
        return [];
    }

    try {
        return JSON.parse(match[1]);
    } catch (e) {
        console.error('Failed to parse Agricharts JSON:', e);
        return [];
    }
}

/**
 * Fetches and parses grain bids from a single Agricharts co-op source.
 */
async function fetchFromAgricharts(
    subdomain: string,
    company: string
): Promise<{
    facility: string;
    company: string;
    city: string | null;
    state: string | null;
    zip: string | null;
    lat: number | null;
    lon: number | null;
    commodity: string;
    basis: number;
    futuresContract: string;
    deliveryStart: string | null;
    deliveryEnd: string | null;
}[]> {
    const url = `https://${subdomain}.agricharts.com/inc/cashbids/cashbids-js.php?format=json&filter=all`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'FarmerRisk/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.warn(`Agricharts ${subdomain} returned ${response.status}`);
            return [];
        }

        const html = await response.text();
        const locations = parseAgrichartsResponse(html);
        const bids: ReturnType<typeof fetchFromAgricharts> extends Promise<infer T> ? T : never = [];

        for (const loc of locations) {
            if (!loc.cashbids || loc.cashbids.length === 0) continue;

            for (const bid of loc.cashbids) {
                if (!bid.active) continue;

                const commodity = symbolToCommodity(bid.symbol);
                if (!commodity) continue; // Skip non-grain commodities

                bids.push({
                    facility: loc.display_name || loc.name,
                    company,
                    city: loc.city || null,
                    state: loc.state || null,
                    zip: loc.zip || null,
                    lat: loc.latitude ? parseFloat(loc.latitude) : null,
                    lon: loc.longitude ? parseFloat(loc.longitude) : null,
                    commodity,
                    basis: bid.basis / 100, // Convert cents to dollars
                    futuresContract: bid.symbol,
                    deliveryStart: bid.delivery_start || null,
                    deliveryEnd: bid.delivery_end || null,
                });
            }
        }

        return bids;
    } catch (error) {
        console.error(`Error fetching from Agricharts ${subdomain}:`, error);
        return [];
    }
}

/**
 * Scrapes all configured Agricharts sources and upserts the data into the grain_bids table.
 * Returns the total number of bids stored.
 */
export async function refreshGrainBids(): Promise<{ totalBids: number; sources: number; errors: string[] }> {
    const errors: string[] = [];
    let totalBids = 0;

    // Clear existing bids before refreshing
    await prisma.grainBid.deleteMany({});

    for (const source of AGRICHARTS_SOURCES) {
        try {
            const bids = await fetchFromAgricharts(source.subdomain, source.company);

            if (bids.length === 0) {
                errors.push(`${source.subdomain}: 0 bids returned`);
                continue;
            }

            // Batch insert
            await prisma.grainBid.createMany({
                data: bids.map(b => ({
                    facility: b.facility,
                    company: b.company,
                    city: b.city,
                    state: b.state,
                    zip: b.zip,
                    lat: b.lat,
                    lon: b.lon,
                    commodity: b.commodity,
                    basis: b.basis,
                    futuresContract: b.futuresContract,
                    deliveryStart: b.deliveryStart,
                    deliveryEnd: b.deliveryEnd,
                    source: 'agricharts',
                    fetchedAt: new Date(),
                })),
            });

            totalBids += bids.length;
        } catch (e) {
            errors.push(`${source.subdomain}: ${(e as Error).message}`);
        }
    }

    return { totalBids, sources: AGRICHARTS_SOURCES.length, errors };
}

/**
 * Haversine distance calculation between two lat/lon points (in miles).
 */
export function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
