'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    FarmProfile, createDefaultProfile, FUTURES_SYMBOLS,
    calcBreakEvenPrice, calcImpliedCashPrice, formatMoney,
} from '@/lib/calculations';

/* ------------------------------------------------------------------ */
/*  Product Data                                                       */
/* ------------------------------------------------------------------ */

type ProductType = 'producer' | 'consumer';
type RiskLevel = 'low' | 'moderate' | 'high';

interface TradeProduct {
    id: string;
    name: string;
    type: ProductType;
    risk: RiskLevel;
    icon: string;
    tagline: string;
    description: string;
    howItWorks: string[];
    keyTerms: { label: string; value: string }[];
    bestWhen: string[];
    payoutScenarios: { scenario: string; result: string; color: string }[];
}

const PRODUCTS: TradeProduct[] = [
    {
        id: 'standard-accumulator',
        name: 'Standard Accumulator',
        type: 'producer',
        risk: 'moderate',
        icon: '📊',
        tagline: 'Accumulate bushels at a premium to the market over time.',
        description: 'A Standard Accumulator allows producers to sell grain at a strike price above the current market. In each accumulation period, if the market stays below the strike, you sell at the strike price. If the market rises above the knock-out level, the contract terminates early.',
        howItWorks: [
            'Set a strike price above current market (your guaranteed sell price)',
            'Each period (weekly/bi-weekly) you accumulate bushels at the strike',
            'If futures drop below the doubling barrier, you deliver 2x bushels that period',
            'Contract terminates if futures rise above the knock-out price',
        ],
        keyTerms: [
            { label: 'Strike Price', value: 'Typically +$0.15–$0.30 above market' },
            { label: 'Knock-Out', value: '+$0.40–$0.60 above strike' },
            { label: 'Doubling Barrier', value: '-$0.30–$0.50 below strike' },
            { label: 'Duration', value: '6–12 months (weekly periods)' },
            { label: 'Bushels/Period', value: 'Customizable (e.g., 5,000 bu/week)' },
        ],
        bestWhen: [
            'You expect the market to trade sideways or drift lower',
            'You want a price above current levels without upfront cost',
            'You can manage the doubling risk on price dips',
        ],
        payoutScenarios: [
            { scenario: 'Market stays near strike', result: 'You sell all bushels at premium price — best outcome', color: '#22c55e' },
            { scenario: 'Market drops sharply', result: 'You deliver 2x bushels at strike — still above market but volume risk', color: '#f59e0b' },
            { scenario: 'Market rallies above KO', result: 'Contract terminates — you keep accumulated gains', color: '#3b82f6' },
        ],
    },
    {
        id: 'euro-double-up',
        name: 'Euro Double Up Accumulator',
        type: 'producer',
        risk: 'high',
        icon: '🔄',
        tagline: 'Higher premium pricing with European-style knock-in barriers.',
        description: 'The Euro Double Up offers an even higher strike price than a standard accumulator by using European-style barriers — the doubling and knock-out are only evaluated at expiration, not continuously. This means intraday or intra-period spikes won\'t trigger barriers.',
        howItWorks: [
            'Strike price set well above market (higher premium than standard)',
            'Barriers are European-style: evaluated only at expiry of each period',
            'If the settlement price at period end is below the doubling barrier, 2x delivery',
            'Knock-out evaluated only at period expiration — not intraday',
        ],
        keyTerms: [
            { label: 'Strike Price', value: 'Typically +$0.25–$0.45 above market' },
            { label: 'Barrier Style', value: 'European (expiry-only evaluation)' },
            { label: 'Knock-Out', value: '+$0.50–$0.80 above strike (at expiry)' },
            { label: 'Doubling Barrier', value: '-$0.40–$0.60 below strike (at expiry)' },
            { label: 'Duration', value: '3–12 months' },
        ],
        bestWhen: [
            'You want the highest possible strike price',
            'You believe intraday volatility is high but settlement will be stable',
            'You\'re comfortable with doubling risk at period expiry',
        ],
        payoutScenarios: [
            { scenario: 'Settlement stays near strike', result: 'Premium pricing on all bushels — maximum value', color: '#22c55e' },
            { scenario: 'Settlement below doubling barrier', result: '2x delivery at strike — significant volume obligation', color: '#ef4444' },
            { scenario: 'Settlement above KO at expiry', result: 'Contract terminates — partial accumulation retained', color: '#3b82f6' },
        ],
    },
    {
        id: 'enhanced-accumulator',
        name: 'Enhanced Accumulator (Knock-In)',
        type: 'producer',
        risk: 'high',
        icon: '⚡',
        tagline: 'Premium pricing with a knock-in doubling feature for aggressive sellers.',
        description: 'An Enhanced Accumulator adds a knock-in barrier: the doubling feature only activates if the market touches a specific low price at any point. Until then, no doubling occurs even if the settlement is below the barrier. This gives you more protection against moderate dips.',
        howItWorks: [
            'Same structure as a standard accumulator with a premium strike',
            'A separate knock-in level must be touched before doubling activates',
            'If the market never touches the knock-in, you never double — pure premium selling',
            'Once knocked in, standard doubling rules apply for remaining periods',
        ],
        keyTerms: [
            { label: 'Strike Price', value: '+$0.20–$0.35 above market' },
            { label: 'Knock-In Level', value: '-$0.60–$1.00 below strike (must be touched)' },
            { label: 'Knock-Out', value: '+$0.40–$0.60 above strike' },
            { label: 'Duration', value: '6–12 months' },
            { label: 'Volume', value: 'Customizable per period' },
        ],
        bestWhen: [
            'You want downside doubling protection unless a major selloff occurs',
            'Market is in a range-bound environment',
            'You have moderate risk tolerance but want better pricing than a standard accumulator',
        ],
        payoutScenarios: [
            { scenario: 'Market stable, no knock-in', result: 'Best outcome — premium pricing, zero doubling risk', color: '#22c55e' },
            { scenario: 'Market drops, knock-in triggered', result: 'Doubling activates — behaves like a standard accumulator', color: '#f59e0b' },
            { scenario: 'Market rallies above KO', result: 'Contract terminates early with gains', color: '#3b82f6' },
        ],
    },
    {
        id: 'collar',
        name: 'Collar (Min / Max)',
        type: 'producer',
        risk: 'low',
        icon: '🛡️',
        tagline: 'Guarantee a price floor while capping your upside — zero or low premium.',
        description: 'A Collar combines buying a put option (floor) and selling a call option (cap). The call premium offsets the put cost, often resulting in zero out-of-pocket cost. You establish a known price range for your grain.',
        howItWorks: [
            'Buy a put option at your desired floor price (e.g., break-even)',
            'Sell a call option at a higher price to offset the put premium',
            'Your net sale price is guaranteed to fall between the floor and ceiling',
            'No margin calls — defined risk from day one',
        ],
        keyTerms: [
            { label: 'Put Strike (Floor)', value: 'Typically at or near break-even' },
            { label: 'Call Strike (Cap)', value: 'Usually +$0.40–$0.80 above the put' },
            { label: 'Net Premium', value: 'Often $0 (zero-cost collar)' },
            { label: 'Duration', value: 'Matches crop marketing window' },
            { label: 'Bushels', value: 'Fixed quantity' },
        ],
        bestWhen: [
            'You need downside protection but can\'t afford standalone puts',
            'You\'re comfortable capping upside in exchange for free protection',
            'Market is volatile and you want defined outcomes',
        ],
        payoutScenarios: [
            { scenario: 'Market drops below floor', result: 'Put protects you — sell at floor price (loss avoided)', color: '#22c55e' },
            { scenario: 'Market stays in range', result: 'Sell at market — both options expire worthless', color: '#3b82f6' },
            { scenario: 'Market rallies above cap', result: 'Obligated to sell at cap — miss further upside', color: '#f59e0b' },
        ],
    },
    {
        id: 'min-price-contract',
        name: 'Minimum Price Contract',
        type: 'producer',
        risk: 'low',
        icon: '📌',
        tagline: 'Lock in a guaranteed floor price with full upside participation.',
        description: 'A Minimum Price Contract guarantees you will receive at least a specified minimum price for your grain. If the market moves higher, you participate fully in the rally. The premium for this protection is deducted from your final price.',
        howItWorks: [
            'Agree to a minimum sale price (your floor)',
            'If the market is above the minimum at delivery, you sell at the higher price',
            'A premium is charged for the floor protection (usually deducted from final price)',
            'No margin calls or delivery obligations beyond your committed bushels',
        ],
        keyTerms: [
            { label: 'Minimum Price', value: 'Set by you (often near break-even)' },
            { label: 'Premium', value: 'Deducted from final sale price ($0.10–$0.30/bu)' },
            { label: 'Upside', value: 'Full participation above the minimum' },
            { label: 'Delivery', value: 'Fixed bushels at agreed delivery window' },
        ],
        bestWhen: [
            'You\'re bullish but need protection in case you\'re wrong',
            'You want a simple, easy-to-understand product',
            'You\'re willing to pay a modest premium for full upside',
        ],
        payoutScenarios: [
            { scenario: 'Market rallies significantly', result: 'You sell at the higher price minus premium — full upside', color: '#22c55e' },
            { scenario: 'Market stays flat', result: 'You sell at market minus premium — near break-even', color: '#3b82f6' },
            { scenario: 'Market drops hard', result: 'You sell at guaranteed minimum — protection works', color: '#f59e0b' },
        ],
    },
    {
        id: 'hta',
        name: 'Hedge-to-Arrive (HTA)',
        type: 'producer',
        risk: 'moderate',
        icon: '🎯',
        tagline: 'Lock the futures component now, set basis later.',
        description: 'An HTA contract locks in the futures price today while leaving the basis open for later negotiation. This is ideal when you believe futures are at a good level but local basis may improve closer to delivery.',
        howItWorks: [
            'Lock the futures price component today at current levels',
            'Basis is left open — set it later when local conditions are favorable',
            'Final cash price = locked futures + basis (set at delivery)',
            'Typically rolled forward if needed to a later delivery month',
        ],
        keyTerms: [
            { label: 'Futures Lock', value: 'Current futures price at time of contract' },
            { label: 'Basis', value: 'Set later (before or at delivery)' },
            { label: 'Delivery', value: 'Flexible within contract terms' },
            { label: 'Roll Fees', value: 'May apply if delivery month is changed' },
        ],
        bestWhen: [
            'Futures are historically high but basis is weak',
            'You want price protection but expect basis to improve',
            'You\'re comfortable with basis risk',
        ],
        payoutScenarios: [
            { scenario: 'Futures drop, basis improves', result: 'Strong locked futures + better basis = excellent price', color: '#22c55e' },
            { scenario: 'Both components stable', result: 'Solid price — no regrets', color: '#3b82f6' },
            { scenario: 'Futures rally above lock', result: 'Missed upside on futures — but basis flexibility helps', color: '#f59e0b' },
        ],
    },
    {
        id: 'basis-contract',
        name: 'Basis Contract',
        type: 'producer',
        risk: 'moderate',
        icon: '📍',
        tagline: 'Lock in a favorable basis now, set futures later.',
        description: 'The opposite of an HTA — a Basis Contract locks in the basis component while leaving futures open. Useful when local basis is historically strong but you believe futures may still rally.',
        howItWorks: [
            'Lock the basis component at current local levels',
            'Futures price is left open — set it later',
            'Final cash price = futures (set later) + locked basis',
            'Must set futures before contract expiration',
        ],
        keyTerms: [
            { label: 'Basis Lock', value: 'Current local basis at time of contract' },
            { label: 'Futures', value: 'Set later (before contract expiry)' },
            { label: 'Delivery', value: 'Specified delivery window' },
            { label: 'Storage', value: 'May or may not be included' },
        ],
        bestWhen: [
            'Local basis is historically strong (narrow or positive)',
            'You believe futures will rally and want to capture both',
            'You\'re comfortable with futures price risk',
        ],
        payoutScenarios: [
            { scenario: 'Futures rally, basis stays strong', result: 'Higher futures + locked strong basis = maximum price', color: '#22c55e' },
            { scenario: 'Futures flat', result: 'Average futures + strong basis = above-market price', color: '#3b82f6' },
            { scenario: 'Futures drop', result: 'Lower futures + locked basis — basis helps cushion the blow', color: '#f59e0b' },
        ],
    },
    {
        id: 'consumer-accumulator',
        name: 'Consumer Accumulator',
        type: 'consumer',
        risk: 'moderate',
        icon: '🏭',
        tagline: 'Buy grain at a discount to the market over time.',
        description: 'The mirror image of a producer accumulator — designed for end users (feedlots, ethanol plants, exporters). Accumulate purchases at a strike below the market. If the market drops below the knock-out, the contract terminates. If prices rally above the doubling barrier, you buy 2x that period.',
        howItWorks: [
            'Set a strike price below current market (your guaranteed buy price)',
            'Each period you accumulate purchases at the discounted strike',
            'If futures rally above the doubling barrier, you buy 2x bushels that period',
            'Contract terminates if futures drop below the knock-out price',
        ],
        keyTerms: [
            { label: 'Strike Price', value: 'Typically -$0.15–$0.30 below market' },
            { label: 'Knock-Out', value: '-$0.40–$0.60 below strike' },
            { label: 'Doubling Barrier', value: '+$0.30–$0.50 above strike' },
            { label: 'Duration', value: '6–12 months (weekly periods)' },
            { label: 'Bushels/Period', value: 'Customizable' },
        ],
        bestWhen: [
            'You expect the market to trade sideways or drift higher',
            'You need to lock in feed/input costs below current levels',
            'You can manage 2x purchase volume on price rallies',
        ],
        payoutScenarios: [
            { scenario: 'Market stays near strike', result: 'You buy all bushels at a discount — best outcome', color: '#22c55e' },
            { scenario: 'Market rallies sharply', result: 'You buy 2x at strike — still below market but volume risk', color: '#f59e0b' },
            { scenario: 'Market drops below KO', result: 'Contract terminates — you keep accumulated savings', color: '#3b82f6' },
        ],
    },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const riskColor = (r: RiskLevel) =>
    r === 'low' ? '#22c55e' : r === 'moderate' ? '#f59e0b' : '#ef4444';

const riskLabel = (r: RiskLevel) =>
    r === 'low' ? 'Low Risk' : r === 'moderate' ? 'Moderate Risk' : 'Higher Risk';

const typeBadge = (t: ProductType) =>
    t === 'producer'
        ? { label: 'PRODUCER', bg: 'rgba(34,197,94,0.12)', color: '#22c55e' }
        : { label: 'CONSUMER', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' };

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TradeProductsPage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [futuresPrice, setFuturesPrice] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | ProductType>('all');
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (session?.user) {
                const res = await fetch('/api/profile');
                const data = await res.json();
                if (data.profile) {
                    const p = data.profile;
                    setProfile({
                        id: p.id,
                        commodity: p.commodity || 'corn',
                        acres: p.acres ?? 1000,
                        expectedYield: p.expectedYield ?? 200,
                        costPerAcre: p.costPerAcre ?? 0,
                        basisAssumption: p.basisAssumption ?? -0.30,
                        storageCost: p.storageCost ?? 0,
                        desiredMargin: p.desiredMargin ?? 0.50,
                        breakEvenPrice: calcBreakEvenPrice(p.costPerAcre ?? 0, p.expectedYield ?? 200),
                        updatedAt: p.updatedAt || new Date().toISOString(),
                    });
                }
            }
            const res = await fetch('/api/market/quotes');
            const json = await res.json();
            if (json.success && json.data) {
                const sym = FUTURES_SYMBOLS[profile.commodity];
                const q = json.data.find((q: { symbol: string }) => q.symbol === sym);
                if (q) setFuturesPrice(q.regularMarketPrice / 100);
            }
        } catch { }
        setLoading(false);
    }, [session, profile.commodity]);

    useEffect(() => { loadData(); }, [loadData]);

    const breakEven = calcBreakEvenPrice(profile.costPerAcre, profile.expectedYield);
    const cashPrice = futuresPrice > 0 ? calcImpliedCashPrice(futuresPrice, profile.basisAssumption) : 0;
    const marginAboveBreakEven = cashPrice - breakEven;

    /* Pick a recommended product based on market conditions */
    const getRecommendedProduct = (): { product: TradeProduct; reason: string } => {
        if (marginAboveBreakEven > 0.40) {
            return {
                product: PRODUCTS.find(p => p.id === 'standard-accumulator')!,
                reason: `With ${profile.commodity === 'corn' ? 'corn' : 'soybean'} futures at $${futuresPrice.toFixed(2)} and a margin of +$${marginAboveBreakEven.toFixed(2)}/bu above break-even, an accumulator lets you sell at a premium above current levels while the market is strong.`,
            };
        }
        if (marginAboveBreakEven > 0) {
            return {
                product: PRODUCTS.find(p => p.id === 'collar')!,
                reason: `Current prices are above break-even by $${marginAboveBreakEven.toFixed(2)}/bu but the margin is thin. A zero-cost collar protects your downside at break-even while allowing limited upside participation — no premium required.`,
            };
        }
        return {
            product: PRODUCTS.find(p => p.id === 'min-price-contract')!,
            reason: `Prices are near or below break-even ($${breakEven.toFixed(2)}/bu). A Minimum Price Contract guarantees a floor price while keeping you fully open to any market recovery. Simple and effective risk management.`,
        };
    };

    const recommended = futuresPrice > 0 ? getRecommendedProduct() : null;

    const filteredProducts = filterType === 'all'
        ? PRODUCTS
        : PRODUCTS.filter(p => p.type === filterType);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
                <p style={{ color: 'var(--text-secondary)' }}>Loading trade products...</p>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: 1100 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Trade Products</h1>
                    <p className="page-subtitle">Structured grain marketing tools for producers &amp; consumers.</p>
                </div>
                <button className="refresh-btn" onClick={loadData}>↻</button>
            </div>

            {/* ── Market Context Bar ── */}
            {futuresPrice > 0 && (
                <div style={{
                    display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24,
                }}>
                    <div style={{
                        flex: '1 1 180px', background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: 12, padding: '16px 20px',
                        border: '1px solid var(--border)',
                    }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            {profile.commodity === 'corn' ? 'Corn' : 'Soybean'} Futures
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent-blue)' }}>
                            ${futuresPrice.toFixed(2)}
                        </div>
                    </div>
                    <div style={{
                        flex: '1 1 180px', background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: 12, padding: '16px 20px',
                        border: '1px solid var(--border)',
                    }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            Implied Cash Price
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                            ${cashPrice.toFixed(2)}
                        </div>
                    </div>
                    <div style={{
                        flex: '1 1 180px', background: `${marginAboveBreakEven >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'}`,
                        borderRadius: 12, padding: '16px 20px',
                        border: `1px solid ${marginAboveBreakEven >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            Margin vs Break-Even
                        </div>
                        <div style={{
                            fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)',
                            color: marginAboveBreakEven >= 0 ? '#22c55e' : '#ef4444',
                        }}>
                            {marginAboveBreakEven >= 0 ? '+' : ''}{formatMoney(marginAboveBreakEven)}/bu
                        </div>
                    </div>
                    <div style={{
                        flex: '1 1 180px', background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: 12, padding: '16px 20px',
                        border: '1px solid var(--border)',
                    }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                            Your Break-Even
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                            ${breakEven.toFixed(2)}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Recommended Trade ── */}
            {recommended && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(34,197,94,0.08) 100%)',
                    borderRadius: 16, padding: 28,
                    border: '1.5px solid rgba(59,130,246,0.3)',
                    marginBottom: 28, position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', top: 0, right: 0,
                        background: 'linear-gradient(135deg, #3b82f6, #22c55e)',
                        padding: '6px 18px 6px 22px', borderRadius: '0 0 0 16px',
                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const,
                        letterSpacing: 1, color: '#fff',
                    }}>⚡ Recommended Trade</div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 8 }}>
                        <div style={{
                            fontSize: 38, width: 60, height: 60, borderRadius: 16,
                            background: 'rgba(59,130,246,0.15)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            {recommended.product.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, fontFamily: 'var(--font-heading)', letterSpacing: -0.3 }}>
                                {recommended.product.name}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                                {recommended.reason}
                            </p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {(() => { const b = typeBadge(recommended.product.type); return (
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                                        background: b.bg, color: b.color, letterSpacing: 0.5,
                                    }}>{b.label}</span>
                                ); })()}
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                                    background: `${riskColor(recommended.product.risk)}18`,
                                    color: riskColor(recommended.product.risk), letterSpacing: 0.5,
                                }}>{riskLabel(recommended.product.risk)}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setExpandedId(expandedId === recommended.product.id ? null : recommended.product.id)}
                        style={{
                            marginTop: 18, width: '100%',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            border: 'none', borderRadius: 10, padding: '12px 24px',
                            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {expandedId === recommended.product.id ? 'Hide Details' : 'View Full Details & Quote →'}
                    </button>

                    {expandedId === recommended.product.id && (
                        <div style={{ marginTop: 20, animation: 'fadeSlideUp 0.3s var(--ease-out) both' }}>
                            {renderProductDetails(recommended.product)}
                        </div>
                    )}
                </div>
            )}

            {/* ── Filter Tabs ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {([
                    { key: 'all' as const, label: 'All Products' },
                    { key: 'producer' as const, label: '🌾 Producer' },
                    { key: 'consumer' as const, label: '🏭 Consumer' },
                ] as const).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilterType(f.key)}
                        style={{
                            padding: '8px 18px', borderRadius: 8,
                            background: filterType === f.key ? 'rgba(59,130,246,0.15)' : 'rgba(15,23,42,0.4)',
                            border: `1px solid ${filterType === f.key ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                            color: filterType === f.key ? '#93c5fd' : 'var(--text-secondary)',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── Product Grid ── */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 18,
            }}>
                {filteredProducts.map(product => {
                    const isExpanded = expandedId === product.id;
                    const badge = typeBadge(product.type);
                    return (
                        <div
                            key={product.id}
                            style={{
                                gridColumn: isExpanded ? '1 / -1' : undefined,
                                background: 'var(--card-bg)',
                                borderRadius: 14, padding: 0,
                                border: `1px solid ${isExpanded ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                                transition: 'all 0.25s ease',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Card Header */}
                            <div
                                onClick={() => setExpandedId(isExpanded ? null : product.id)}
                                style={{
                                    padding: '22px 24px', cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <div style={{
                                        fontSize: 28, width: 48, height: 48, borderRadius: 12,
                                        background: 'rgba(59,130,246,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        {product.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'var(--font-heading)' }}>
                                                {product.name}
                                            </h3>
                                            <span style={{
                                                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                                background: badge.bg, color: badge.color, letterSpacing: 0.5,
                                            }}>{badge.label}</span>
                                            <span style={{
                                                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                                                background: `${riskColor(product.risk)}15`,
                                                color: riskColor(product.risk), letterSpacing: 0.5,
                                            }}>{riskLabel(product.risk)}</span>
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                            {product.tagline}
                                        </p>
                                    </div>
                                    <div style={{
                                        fontSize: 18, color: 'var(--text-muted)',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                        transition: 'transform 0.2s',
                                        flexShrink: 0, marginTop: 4,
                                    }}>▼</div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div style={{
                                    padding: '0 24px 24px',
                                    borderTop: '1px solid var(--border)',
                                    animation: 'fadeSlideUp 0.3s var(--ease-out) both',
                                }}>
                                    {renderProductDetails(product)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── CTA ── */}
            <div className="cta-card" style={{ marginTop: 32 }}>
                <div className="cta-title">Need help choosing the right product?</div>
                <div className="cta-text" style={{ marginBottom: 16 }}>
                    Our grain marketing specialists can walk you through each strategy and help you find the best fit for your operation.
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-green">📞 Request a Quote</button>
                    <button className="btn btn-outline">📧 Email a Specialist</button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Product Detail Panel                                               */
/* ------------------------------------------------------------------ */

function renderProductDetails(product: TradeProduct) {
    return (
        <div style={{ paddingTop: 20 }}>
            {/* Description */}
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
                {product.description}
            </p>

            {/* How It Works */}
            <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                    ⚙️ How It Works
                </h4>
                <div style={{
                    background: 'rgba(15,23,42,0.5)', borderRadius: 10, padding: 18,
                    border: '1px solid var(--border)',
                }}>
                    {product.howItWorks.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < product.howItWorks.length - 1 ? 12 : 0 }}>
                            <div style={{
                                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 800, color: '#3b82f6', marginTop: 1,
                            }}>{i + 1}</div>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Key Terms + Best When — side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 24 }}>
                {/* Key Terms */}
                <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                        📋 Key Terms
                    </h4>
                    <div style={{
                        background: 'rgba(15,23,42,0.5)', borderRadius: 10, padding: 16,
                        border: '1px solid var(--border)',
                    }}>
                        {product.keyTerms.map((t, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: i < product.keyTerms.length - 1 ? '1px solid rgba(148,163,184,0.08)' : 'none',
                            }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{t.label}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{t.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Best When */}
                <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                        🎯 Ideal When
                    </h4>
                    <div style={{
                        background: 'rgba(15,23,42,0.5)', borderRadius: 10, padding: 16,
                        border: '1px solid var(--border)',
                    }}>
                        {product.bestWhen.map((b, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < product.bestWhen.length - 1 ? 10 : 0 }}>
                                <span style={{ color: '#22c55e', fontSize: 12, flexShrink: 0 }}>✓</span>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{b}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Payout Scenarios */}
            <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                    📊 Payout Scenarios
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {product.payoutScenarios.map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, borderRadius: 10, padding: 16,
                            border: `1px solid ${s.color}30`,
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 6 }}>
                                {s.scenario}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {s.result}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quote CTA */}
            <div style={{
                display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap',
                paddingTop: 12, borderTop: '1px solid var(--border)',
            }}>
                <button
                    style={{
                        background: 'transparent', border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: 8, padding: '10px 20px', color: '#93c5fd',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    📖 Download Fact Sheet
                </button>
                <button
                    style={{
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        border: 'none', borderRadius: 8, padding: '10px 20px',
                        color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    📞 Request a Quote
                </button>
            </div>
        </div>
    );
}
