export interface CoOpBid {
    id: string;
    name: string;
    distanceMiles: number;
    cashBid: number;
    basis: number;
    updatedAt: string;
}

import { fetchUSDAGrainBids } from './usda';

/**
 * Fetches nearby co-ops based on a zip code and commodity.
 * This integrates the USDA AMS MARS API, falling back to mock data
 * if an API key is not present or if the API limit is reached.
 */
export async function fetchNearbyCoOps(zipCode: string, commodity: string): Promise<CoOpBid[]> {
    if (!zipCode || zipCode.length < 5) {
        return [];
    }

    try {
        const usdaBids = await fetchUSDAGrainBids(commodity);
        const zipNum = parseInt(zipCode.replace(/\D/g, ''), 10) || 50010;

        // Map USDA bids to our frontend CoOpBid interface
        return usdaBids.map((bid, index) => {
            // Simulated distances based on index and zip since USDA MARS 
            // doesn't inherently provide exact mileage from zip
            const simulatedDistance = 4.2 + (zipNum % 3) + (index * 6);

            return {
                id: `coop-${zipNum}-${index}`,
                name: bid.farmName || `Regional Co-op ${index + 1}`,
                distanceMiles: simulatedDistance,
                basis: bid.basis,
                cashBid: bid.price,
                updatedAt: bid.publishedDate || new Date().toISOString(),
            };
        }).sort((a, b) => a.distanceMiles - b.distanceMiles);

    } catch (error) {
        console.error("Error fetching nearby co-ops from USDA:", error);
        return [];
    }
}
