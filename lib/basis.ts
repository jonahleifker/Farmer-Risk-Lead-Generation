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
 * This integrates the USDA AMS MARS API localized to the specific state report.
 */
export async function fetchNearbyCoOps(zipCode: string, commodity: string): Promise<CoOpBid[]> {
    if (!zipCode || zipCode.length < 5) {
        return [];
    }

    try {
        const usdaBids = await fetchUSDAGrainBids(commodity, zipCode);
        const zipNum = parseInt(zipCode.replace(/\D/g, ''), 10) || 50010;

        // Map USDA bids to our frontend CoOpBid interface
        return usdaBids.map((bid, index) => {
            // Simulated distances based on hashing the city/farm and zip code
            // since USDA MARS doesn't inherently provide exact longitude/latitude
            const hash = Array.from(bid.farmName).reduce((sum, char) => sum + char.charCodeAt(0), 0) + zipNum;
            const simulatedDistance = (hash % 45) + 3.2 + (index * 1.5);

            return {
                id: `coop-${Buffer.from(bid.farmName).toString('base64').substring(0, 8)}-${index}`,
                name: bid.farmName,
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
