// web/lib/usda.ts

/**
 * Interface representing a grain bid from the USDA MARS API.
 * This maps to the expected response from daily grain reports (e.g. Iowa Daily Grain Bids).
 */
export interface USDAGrainBid {
    farmName: string; // Known as 'location' or 'farm' in the report
    price: number;
    basis: number;
    commodity: string;
    publishedDate: string;
    city?: string;
    state?: string;
}

const USDA_API_BASE_URL = 'https://marsapi.ams.usda.gov/services/v1.2/reports';

/**
 * Fetches recent grain bids for a specific commodity from the USDA MARS API.
 * Falls back to mock data if the API key is not configured or if access is denied.
 */
export async function fetchUSDAGrainBids(commodity: string): Promise<USDAGrainBid[]> {
    const apiKey = process.env.USDA_API_KEY;

    if (!apiKey) {
        console.warn("USDA_API_KEY is not configured. Falling back to mock grain bids.");
        return generateMockBids(commodity);
    }

    try {
        // Fetch from a prominent grain report (e.g., National Daily Grain Bids or Iowa Daily Grain Bids)
        // Slug ID '3112' is an example for National Daily. For a real production app, we would
        // map state/zip to specific regional report slugs.
        const encodedKey = Buffer.from(`${apiKey}:`).toString('base64');
        const response = await fetch(`${USDA_API_BASE_URL}/3112/data`, {
            headers: {
                'Authorization': `Basic ${encodedKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`USDA API returned ${response.status}: ${response.statusText}. Falling back to mock data.`);
            return generateMockBids(commodity);
        }

        const data = await response.json();

        // Transform MARS data format
        // The MARS API returns an array of objects in the `results` key.
        const results: any[] = data.results || [];

        return results
            .filter(row => row.commodity?.toLowerCase().includes(commodity.toLowerCase()))
            .map(row => ({
                farmName: row.location || row.market || 'Regional Co-op',
                price: parseFloat(row.price) || 0,
                basis: parseFloat(row.basis) || 0,
                commodity: row.commodity || commodity,
                publishedDate: row.report_date || new Date().toISOString(),
                city: row.city || '',
                state: row.state || ''
            }));

    } catch (error) {
        console.error("Failed to fetch from USDA MARS API:", error);
        return generateMockBids(commodity);
    }
}

/**
 * Mock data generator for when the USDA API is unavailable.
 */
function generateMockBids(commodity: string): USDAGrainBid[] {
    const basePrice = commodity.toLowerCase() === 'corn' ? 4.30 : 11.50;

    return [
        {
            farmName: 'Heartland Co-op',
            price: Number((basePrice - 0.20).toFixed(2)),
            basis: -0.20,
            commodity,
            publishedDate: new Date().toISOString(),
        },
        {
            farmName: 'Central Iowa Ag',
            price: Number((basePrice - 0.25).toFixed(2)),
            basis: -0.25,
            commodity,
            publishedDate: new Date().toISOString(),
        },
        {
            farmName: 'Farmers Mutual Elevator',
            price: Number((basePrice - 0.18).toFixed(2)),
            basis: -0.18,
            commodity,
            publishedDate: new Date().toISOString(),
        }
    ];
}
