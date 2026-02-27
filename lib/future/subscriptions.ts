// =============================================================================
// Subscription Tier Logic (Future SaaS Layer)
// =============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface TierLimits {
    maxScenarios: number;
    marketDataRefreshRate: number; // seconds
    alertsEnabled: boolean;
    maxAlerts: number;
    brokerIntegration: boolean;
    exportReports: boolean;
    apiAccess: boolean;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierLimits> = {
    free: {
        maxScenarios: 3,
        marketDataRefreshRate: 60,
        alertsEnabled: false,
        maxAlerts: 0,
        brokerIntegration: false,
        exportReports: false,
        apiAccess: false,
    },
    pro: {
        maxScenarios: 25,
        marketDataRefreshRate: 15,
        alertsEnabled: true,
        maxAlerts: 10,
        brokerIntegration: true,
        exportReports: true,
        apiAccess: false,
    },
    enterprise: {
        maxScenarios: Infinity,
        marketDataRefreshRate: 5,
        alertsEnabled: true,
        maxAlerts: 100,
        brokerIntegration: true,
        exportReports: true,
        apiAccess: true,
    },
};

// TODO: Implement tier checking middleware
export function getUserTier(_userId: string): SubscriptionTier {
    // Future: Look up user's subscription in Stripe/billing system
    return 'free';
}

// TODO: Implement feature gating
export function canUserAccess(_userId: string, _feature: keyof TierLimits): boolean {
    // Future: Check user's tier against feature requirements
    return true; // MVP: everything unlocked
}

// TODO: Implement Stripe integration
export async function createCheckoutSession(
    _userId: string,
    _tier: SubscriptionTier
): Promise<string | null> {
    // Future: Create Stripe checkout session, return URL
    return null;
}
