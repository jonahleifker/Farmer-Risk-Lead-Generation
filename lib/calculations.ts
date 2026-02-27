// =============================================================================
// Farm Profile & Hedge Data Models (ported from mobile/models/FarmProfile.ts)
// =============================================================================

export type CommodityType = 'corn' | 'soybeans';

export interface CostBreakdown {
    land: number;
    seed: number;
    fertilizer: number;
    chemical: number;
    insurance: number;
    equipment: number;
    labor: number;
    other: number;
}

export interface FarmProfile {
    id: string;
    commodity: CommodityType;
    acres: number;
    expectedYield: number;       // bu/acre
    costPerAcre: number;         // $/acre
    breakEvenPrice: number;      // $/bu — auto-calculated or manual
    basisAssumption: number;     // $/bu (typically negative, e.g., -0.30)
    storageCost: number;         // $/bu (optional, default 0)
    desiredMargin?: number;      // $/bu for Comfort Price
    targetProfit?: number;       // The user's target profit goal
    costBreakdown?: CostBreakdown;
    updatedAt: string;
}

export interface HedgeEntry {
    id: string;
    profileId: string;
    bushelsHedged: number;
    contractType: 'futures' | 'HTA' | 'basis' | 'option';
    action?: 'buy' | 'sell';
    entryPrice: number;          // $/bu
    expiration?: string;         // contract month (e.g., "Dec 2026")
    createdAt: string;
}

export interface AccumulatorScenario {
    strikePrice: number;
    knockOutPrice: number;
    doublingBarrier: number;
    contractBushels: number;
    periods: number;
}

// =============================================================================
// Constants
// =============================================================================

export const BUSHEL_MULTIPLIER: Record<CommodityType, number> = {
    corn: 50,
    soybeans: 50,
};

export const FUTURES_SYMBOLS: Record<CommodityType, string> = {
    corn: 'ZC=F',
    soybeans: 'ZS=F',
};

// =============================================================================
// Calculation Utilities
// =============================================================================

export function calcImpliedCashPrice(futuresPrice: number, basis: number): number {
    return futuresPrice + basis;
}

export function calcRevenuePerAcre(cashPrice: number, yieldPerAcre: number): number {
    return cashPrice * yieldPerAcre;
}

export function calcProfitPerAcre(revenuePerAcre: number, costPerAcre: number): number {
    return revenuePerAcre - costPerAcre;
}

export function calcTotalMargin(profitPerAcre: number, acres: number): number {
    return profitPerAcre * acres;
}

export function calcBreakEvenPrice(costPerAcre: number, yieldPerAcre: number): number {
    if (yieldPerAcre <= 0) return 0;
    return costPerAcre / yieldPerAcre;
}

export function calcTotalProduction(acres: number, yieldPerAcre: number): number {
    return acres * yieldPerAcre;
}

export function calcHedgeCoverage(totalBushelsHedged: number, totalProduction: number): number {
    if (totalProduction <= 0) return 0;
    return Math.min((totalBushelsHedged / totalProduction) * 100, 100);
}

export function calcUnhedgedExposure(totalProduction: number, totalBushelsHedged: number): number {
    return Math.max(totalProduction - totalBushelsHedged, 0);
}

export function calcHedgePnL(hedges: HedgeEntry[], currentFuturesPrice: number): number {
    return hedges.reduce((total, h) => {
        if (h.action === 'buy') {
            return total + (currentFuturesPrice - h.entryPrice) * h.bushelsHedged;
        }
        return total + (h.entryPrice - currentFuturesPrice) * h.bushelsHedged;
    }, 0);
}

export function getRiskLevel(coveragePct: number): 'low' | 'moderate' | 'high' {
    if (coveragePct >= 75) return 'low';
    if (coveragePct >= 25) return 'moderate';
    return 'high';
}

export function runScenario(
    profile: FarmProfile,
    currentFuturesPrice: number,
    priceAdjustment: number,
    hedges: HedgeEntry[]
) {
    const adjustedFutures = currentFuturesPrice + priceAdjustment;
    const cashPrice = calcImpliedCashPrice(adjustedFutures, profile.basisAssumption);
    const revenuePerAcre = calcRevenuePerAcre(cashPrice, profile.expectedYield);
    const profitPerAcre = calcProfitPerAcre(revenuePerAcre, profile.costPerAcre);
    const totalMargin = calcTotalMargin(profitPerAcre, profile.acres);
    const hedgePnL = calcHedgePnL(hedges, adjustedFutures);
    const totalProduction = calcTotalProduction(profile.acres, profile.expectedYield);
    const totalBushelsHedged = hedges.reduce((sum, h) => sum + h.bushelsHedged, 0);

    return {
        adjustedFutures,
        cashPrice,
        revenuePerAcre,
        profitPerAcre,
        totalMargin,
        hedgePnL,
        netMargin: totalMargin + hedgePnL,
        totalProduction,
        totalBushelsHedged,
        coveragePct: calcHedgeCoverage(totalBushelsHedged, totalProduction),
        estimatedMarginCallExposure: Math.abs(priceAdjustment) * totalBushelsHedged,
    };
}

export function modelAccumulator(
    scenario: AccumulatorScenario,
    pricePaths: number[][]
) {
    return pricePaths.map(path => {
        let totalBushelsDelivered = 0;
        let totalRevenue = 0;

        path.forEach(price => {
            const bushelsThisPeriod = price < scenario.doublingBarrier
                ? scenario.contractBushels * 2
                : scenario.contractBushels;
            const salePrice = Math.min(price, scenario.strikePrice);
            totalBushelsDelivered += bushelsThisPeriod;
            totalRevenue += salePrice * bushelsThisPeriod;
        });

        const effectiveAvgPrice = totalBushelsDelivered > 0
            ? totalRevenue / totalBushelsDelivered
            : 0;

        return {
            totalBushelsDelivered,
            totalRevenue,
            effectiveAvgPrice,
            excessDelivery: totalBushelsDelivered - (scenario.contractBushels * scenario.periods),
        };
    });
}

export function createDefaultProfile(commodity: CommodityType = 'corn'): FarmProfile {
    return {
        id: Date.now().toString(),
        commodity,
        acres: 1000,
        expectedYield: commodity === 'corn' ? 200 : 55,
        costPerAcre: commodity === 'corn' ? 800 : 450,
        breakEvenPrice: 0,
        basisAssumption: commodity === 'corn' ? -0.30 : -0.40,
        storageCost: 0,
        desiredMargin: 0.50,
        costBreakdown: {
            land: 250,
            seed: 120,
            fertilizer: 150,
            chemical: 80,
            insurance: 20,
            equipment: 100,
            labor: 50,
            other: 30,
        },
        updatedAt: new Date().toISOString(),
    };
}

// =============================================================================
// Formatting Helpers
// =============================================================================

export function formatMoney(v: number): string {
    const abs = Math.abs(v);
    if (abs >= 1000000) return `${v < 0 ? '-' : ''}$${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}K`;
    return `${v < 0 ? '-' : ''}$${abs.toFixed(2)}`;
}
