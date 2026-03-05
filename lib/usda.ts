import zipcodes from 'zipcodes';

/**
 * Interface representing a grain bid from the USDA MARS API.
 */
export interface USDAGrainBid {
    farmName: string;
    price: number;
    basis: number;
    commodity: string;
    publishedDate: string;
    city?: string;
    state?: string;
}

const USDA_API_BASE_URL = 'https://marsapi.ams.usda.gov/services/v1.2/reports';

// Mapping of US State Abbreviations to their respective USDA MARS API Daily Grain Bids Report Slug ID.
// This allows us to fetch real, localized data based on the user's location.
const STATE_REPORT_SLUGS: Record<string, string> = {
    'IA': '2850', // Iowa Daily Cash Grain Bids
    'IL': '3192', // Illinois Grain Bids
    'IN': '3192', // Usually combined or similar
    'OH': '2851', // Ohio Daily Grain Bids
    'KS': '2886', // Kansas Daily Grain Bids
    'MO': '2932', // Missouri Daily Grain Bids
    'NE': '2850', // Using IA as a fallback regional for nearby, or could find NE specific
    'MN': '3049', // Southern Minnesota Daily Grain Bids
    'SD': '3049', // Fallback
    'ND': '2771', // Montana/ND region
    'TX': '2711', // Texas Daily Grain Bids
    'MD': '2714', // Maryland Grain Bids
    'MT': '2771', // Montana Daily Elevator Grain Bids
    'SC': '2787', // South Carolina Daily Grain Bids
    'KY': '2892', // Kentucky Daily Grain Bids
    'CO': '2912', // Colorado Daily Grain Bids
    'MS': '2928', // Mississippi Daily Grain Bids
    'AR': '2960', // Arkansas Daily Grain Bids
    'TN': '3088', // Tennessee Daily Grain Bids
};

/**
 * Helper to get the USDA Report Slug based on a Zip Code.
 */
export function getReportSlugForZip(zipCode: string): { slug: string, state: string } {
    if (!zipCode) return { slug: '2850', state: 'IA' }; // Default to Iowa

    // Lookup the state for the given zip code
    const location = zipcodes.lookup(zipCode);
    const state = location ? location.state : 'IA';

    // Find the matching report slug, fallback to Iowa (2850) if state not mapped
    const slug = STATE_REPORT_SLUGS[state] || '2850';

    return { slug, state };
}

/**
 * Fetches recent grain bids for a specific commodity from the USDA MARS API,
 * localized to the state of the provided zip code.
 */
export async function fetchUSDAGrainBids(commodity: string, zipCode?: string): Promise<USDAGrainBid[]> {
    const apiKey = process.env.USDA_API_KEY;

    // Determine which state report to pull based on zip code
    const { slug, state } = getReportSlugForZip(zipCode || '50010');

    if (!apiKey) {
        console.warn("USDA_API_KEY is not configured. Returning empty real data.");
        return [];
    }

    try {
        const encodedKey = Buffer.from(`${apiKey}:`).toString('base64');
        const response = await fetch(`${USDA_API_BASE_URL}/${slug}/data`, {
            headers: {
                'Authorization': `Basic ${encodedKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`USDA API returned ${response.status}: ${response.statusText}.`);
            return [];
        }

        const data = await response.json();
        const results: any[] = data.results || [];

        // Filter by commodity and ensure the record actually has price/basis numbers
        // Real USDA data can sometimes just have textual state averages. We only want elevator bids.
        return results
            .filter(row =>
                (row.commodity || row.report_title || '').toLowerCase().includes(commodity.toLowerCase()) ||
                (row.report_narrative || '').toLowerCase().includes(commodity.toLowerCase())
            )
            .filter(row => row.price !== undefined && row.price !== null && !isNaN(parseFloat(row.price)))
            .filter(row => row.basis !== undefined && row.basis !== null && !isNaN(parseFloat(row.basis)))
            .map(row => ({
                // Try to get a meaningful location name
                farmName: row.market_location_city || row.office_city || row.location || 'Regional Elevator',
                price: parseFloat(row.price) || 0,
                basis: parseFloat(row.basis) || 0,
                commodity: commodity,
                publishedDate: row.published_date || row.report_date || new Date().toISOString(),
                city: row.market_location_city || row.office_city || '',
                state: row.market_location_state || row.office_state || state
            }));

    } catch (error) {
        console.error("Failed to fetch from USDA MARS API:", error);
        return [];
    }
}
