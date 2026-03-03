'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import {
    FarmProfile, HedgeEntry, createDefaultProfile, FUTURES_SYMBOLS,
    calcImpliedCashPrice, calcBreakEvenPrice, calcTotalProduction,
    formatMoney, runScenario,
} from '@/lib/calculations';

interface QuoteData {
    symbol: string;
    regularMarketPrice: number;
}

interface HistoricalPrice {
    date: string;
    close: number;
}

const CHART_RANGES = [
    { label: '1W', range: '5d' },
    { label: '1M', range: '1mo' },
    { label: '3M', range: '3mo' },
    { label: '6M', range: '6mo' },
    { label: '1Y', range: '1y' },
];

export default function MarketOpportunityPage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [hedges, setHedges] = useState<HedgeEntry[]>([]);
    const [quotes, setQuotes] = useState<QuoteData[]>([]);
    const [loading, setLoading] = useState(true);
    const [scenarioAdj, setScenarioAdj] = useState(0);
    const [chartRange, setChartRange] = useState('3mo');
    const [chartData, setChartData] = useState<HistoricalPrice[]>([]);
    const [chartLoading, setChartLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch profile from API if logged in, otherwise localStorage
            if (session?.user) {
                const [profileRes, hedgesRes] = await Promise.all([
                    fetch('/api/profile'),
                    fetch('/api/hedges'),
                ]);
                const profileData = await profileRes.json();
                const hedgesData = await hedgesRes.json();

                if (profileData.profile) {
                    const p = profileData.profile;
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

                if (hedgesData.hedges) {
                    setHedges(hedgesData.hedges.map((h: Record<string, unknown>) => ({
                        id: h.id as string,
                        profileId: h.userId as string,
                        bushelsHedged: h.bushelsHedged as number,
                        contractType: h.contractType as string,
                        action: (h.action as string) || 'sell',
                        entryPrice: h.entryPrice as number,
                        expiration: (h.expiration as string) || '',
                        createdAt: h.createdAt as string,
                    })));
                }
            } else {
                try {
                    const savedProfile = localStorage.getItem('farmer_risk_profile');
                    const savedHedges = localStorage.getItem('farmer_risk_hedges');
                    if (savedProfile) setProfile(JSON.parse(savedProfile));
                    if (savedHedges) setHedges(JSON.parse(savedHedges));
                } catch { }
            }

            const res = await fetch('/api/market/quotes');
            const json = await res.json();
            if (json.success && json.data) setQuotes(json.data);
        } catch (err) {
            console.error('Dashboard load error:', err);
        }
        setLoading(false);
    }, [session]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Fetch chart data
    const loadChart = useCallback(async () => {
        setChartLoading(true);
        try {
            const sym = encodeURIComponent(FUTURES_SYMBOLS[profile.commodity]);
            const res = await fetch(`/api/market/history/${sym}?range=${chartRange}`);
            const json = await res.json();
            if (json.success && json.prices) {
                setChartData(json.prices);
            }
        } catch {
            setChartData([]);
        }
        setChartLoading(false);
    }, [profile.commodity, chartRange]);

    useEffect(() => {
        loadChart();
    }, [loadChart]);

    const commodityName = profile.commodity === 'corn' ? 'Corn' : 'Soybeans';
    const futuresSymbol = FUTURES_SYMBOLS[profile.commodity];
    const futuresQuote = quotes.find(q => q.symbol === futuresSymbol);
    const currentFuturesPrice = (futuresQuote?.regularMarketPrice || 0) / 100;

    const impliedCashPrice = calcImpliedCashPrice(currentFuturesPrice, profile.basisAssumption);
    const breakEven = calcBreakEvenPrice(profile.costPerAcre, profile.expectedYield);
    const totalProduction = calcTotalProduction(profile.acres, profile.expectedYield);
    const marginOpportunity = impliedCashPrice - breakEven;
    const comfortPrice = breakEven + (profile.desiredMargin ?? 0.50);

    const totalBushelsHedged = hedges.reduce((sum, h) => sum + h.bushelsHedged, 0);
    const pctHedged = totalProduction > 0 ? (totalBushelsHedged / totalProduction) * 100 : 0;
    const totalHedgeValue = hedges.reduce((sum, h) => sum + (h.entryPrice * h.bushelsHedged), 0);
    const avgHedgePrice = totalBushelsHedged > 0 ? totalHedgeValue / totalBushelsHedged : 0;
    const revenueLocked = totalHedgeValue;

    let marginColor = '#ef4444';
    let marginText = 'Below Break-even';
    if (impliedCashPrice >= comfortPrice) {
        marginColor = '#22c55e';
        marginText = 'Highly Profitable';
    } else if (impliedCashPrice >= breakEven) {
        marginColor = '#f59e0b';
        marginText = 'Slightly Profitable';
    }

    const lockingPct = 20;
    const suggestedBushels = totalProduction * (lockingPct / 100);
    const potentialProfit = suggestedBushels * marginOpportunity;

    // Scenario calculations
    const scenario = currentFuturesPrice > 0
        ? runScenario(profile, currentFuturesPrice, scenarioAdj, hedges)
        : null;

    // Chart rendering
    const chartWidth = 780;
    const chartHeight = 200;
    const chartPadding = { top: 20, right: 20, bottom: 30, left: 60 };

    const renderChart = () => {
        if (chartData.length < 2) return null;

        const prices = chartData.map(d => d.close / 100);
        const minPrice = Math.min(...prices) * 0.995;
        const maxPrice = Math.max(...prices) * 1.005;
        const priceRange = maxPrice - minPrice || 1;
        const innerW = chartWidth - chartPadding.left - chartPadding.right;
        const innerH = chartHeight - chartPadding.top - chartPadding.bottom;

        const getX = (i: number) => chartPadding.left + (i / (prices.length - 1)) * innerW;
        const getY = (p: number) => chartPadding.top + (1 - (p - minPrice) / priceRange) * innerH;

        const linePath = prices.map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p).toFixed(1)}`).join(' ');
        const areaPath = linePath + ` L${getX(prices.length - 1).toFixed(1)},${(chartPadding.top + innerH).toFixed(1)} L${chartPadding.left},${(chartPadding.top + innerH).toFixed(1)} Z`;

        const breakEvenY = getY(breakEven);
        const comfortY = getY(comfortPrice);
        const showBreakEven = breakEven >= minPrice && breakEven <= maxPrice;
        const showComfort = comfortPrice >= minPrice && comfortPrice <= maxPrice;

        // Y-axis labels
        const ySteps = 5;
        const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
            const price = minPrice + (priceRange * i) / ySteps;
            return { price, y: getY(price) };
        });

        // X-axis labels
        const xSteps = Math.min(5, chartData.length - 1);
        const xLabels = Array.from({ length: xSteps + 1 }, (_, i) => {
            const idx = Math.floor((i / xSteps) * (chartData.length - 1));
            const d = new Date(chartData[idx].date);
            return { label: `${d.getMonth() + 1}/${d.getDate()}`, x: getX(idx) };
        });

        return (
            <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ display: 'block' }}>
                {/* Grid lines */}
                {yLabels.map((yl, i) => (
                    <g key={i}>
                        <line x1={chartPadding.left} y1={yl.y} x2={chartWidth - chartPadding.right} y2={yl.y}
                            stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
                        <text x={chartPadding.left - 8} y={yl.y + 3} textAnchor="end"
                            fill="#64748b" fontSize="9" fontFamily="var(--font-body)">
                            ${yl.price.toFixed(2)}
                        </text>
                    </g>
                ))}

                {/* X-axis labels */}
                {xLabels.map((xl, i) => (
                    <text key={i} x={xl.x} y={chartHeight - 5} textAnchor="middle"
                        fill="#64748b" fontSize="9" fontFamily="var(--font-body)">
                        {xl.label}
                    </text>
                ))}

                {/* Area gradient */}
                <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#chartGrad)" />

                {/* Price line */}
                <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

                {/* Break-even line */}
                {showBreakEven && (
                    <g>
                        <line x1={chartPadding.left} y1={breakEvenY} x2={chartWidth - chartPadding.right} y2={breakEvenY}
                            stroke="#ef4444" strokeWidth="1" strokeDasharray="6,4" opacity="0.7" />
                        <text x={chartWidth - chartPadding.right + 4} y={breakEvenY + 3}
                            fill="#ef4444" fontSize="8" fontFamily="var(--font-body)">
                            BE
                        </text>
                    </g>
                )}

                {/* Comfort price line */}
                {showComfort && (
                    <g>
                        <line x1={chartPadding.left} y1={comfortY} x2={chartWidth - chartPadding.right} y2={comfortY}
                            stroke="#22c55e" strokeWidth="1" strokeDasharray="6,4" opacity="0.7" />
                        <text x={chartWidth - chartPadding.right + 4} y={comfortY + 3}
                            fill="#22c55e" fontSize="8" fontFamily="var(--font-body)">
                            CP
                        </text>
                    </g>
                )}

                {/* Current price dot */}
                <circle cx={getX(prices.length - 1)} cy={getY(prices[prices.length - 1])}
                    r="4" fill="#3b82f6" stroke="#0b1120" strokeWidth="2" />
            </svg>
        );
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
                <p style={{ color: 'var(--text-secondary)' }}>Loading opportunities...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Market Opportunity</h1>
                    <p className="page-subtitle">Where the market is vs. your bottom line.</p>
                </div>
                <button className="refresh-btn" onClick={loadData}>↻</button>
            </div>

            {/* Where the Market Is */}
            <div className="card">
                <h3 className="card-title">Where the Market Is</h3>
                <div className="metrics-row">
                    <div className="metric-item">
                        <div className="metric-label">{commodityName} Futures</div>
                        <div className="metric-value">
                            <AnimatedNumber value={currentFuturesPrice} prefix="$" />
                        </div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Your Local Basis</div>
                        <div className="metric-value">
                            {profile.basisAssumption >= 0 ? '+' : ''}<AnimatedNumber value={profile.basisAssumption} prefix="$" />
                        </div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Cash Price</div>
                        <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>
                            <AnimatedNumber value={impliedCashPrice} prefix="$" color="var(--accent-blue)" />
                        </div>
                    </div>
                </div>

                <div className={`margin-opportunity-box ${marginOpportunity >= 0 ? 'margin-box-glow' : ''}`} style={{
                    borderColor: marginColor,
                    background: `${marginColor}15`,
                }}>
                    <div>
                        <div className="margin-label" style={{ color: marginColor }}>Today&apos;s Margin Opportunity</div>
                        <div className="margin-value" style={{ color: marginColor }}>
                            <AnimatedNumber value={marginOpportunity} prefix={marginOpportunity >= 0 ? '+$' : '-$'} suffix=" / bu" color={marginColor} />
                        </div>
                        <div style={{ color: marginColor, fontSize: 13, marginTop: 4 }}>
                            {marginText} (Break-even: ${breakEven.toFixed(2)})
                        </div>
                    </div>
                    <span style={{ fontSize: 48, opacity: 0.8 }}>
                        {marginOpportunity >= 0 ? '📈' : '📉'}
                    </span>
                </div>

                {impliedCashPrice < breakEven && (
                    <div className="warning-banner">
                        <span>⚠️</span>
                        <span className="warning-text">
                            Based on your numbers, you are currently exposed to a {formatMoney(Math.abs(marginOpportunity * totalProduction))} revenue drop below break-even.
                        </span>
                    </div>
                )}
            </div>

            {/* Price Chart */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 className="card-title" style={{ marginBottom: 0 }}>{commodityName} Futures Chart</h3>
                    <div className="chart-range-bar">
                        {CHART_RANGES.map(r => (
                            <button
                                key={r.range}
                                className={`chart-range-btn ${chartRange === r.range ? 'active' : ''}`}
                                onClick={() => setChartRange(r.range)}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="chart-container">
                    {chartLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                            <div className="spinner" />
                        </div>
                    ) : chartData.length > 1 ? (
                        renderChart()
                    ) : (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No chart data available
                        </div>
                    )}
                </div>
                {/* Chart legend */}
                <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 2, background: '#3b82f6', borderRadius: 1 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Price</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 2, background: '#ef4444', borderRadius: 1, borderTop: '1px dashed #ef4444' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Break-Even (${breakEven.toFixed(2)})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 2, background: '#22c55e', borderRadius: 1, borderTop: '1px dashed #22c55e' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Comfort Price (${comfortPrice.toFixed(2)})</span>
                    </div>
                </div>
            </div>

            {/* What-If Scenario Slider */}
            <div className="card scenario-slider-card">
                <h3 className="card-title">💡 What-If Scenario</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                    Drag the slider to see how price changes would affect your operation.
                </p>

                <div style={{
                    background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 24,
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700 }}>
                            <span style={{ color: scenarioAdj >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {scenarioAdj >= 0 ? '+' : ''}{scenarioAdj.toFixed(2)}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginLeft: 8 }}>
                                $/bu price change → ${(currentFuturesPrice + scenarioAdj).toFixed(2)} futures
                            </span>
                        </span>
                    </div>

                    <input
                        type="range"
                        min={-2}
                        max={2}
                        step={0.05}
                        value={scenarioAdj}
                        onChange={(e) => setScenarioAdj(Number(e.target.value))}
                        style={{
                            width: '100%', height: 6, appearance: 'none', WebkitAppearance: 'none',
                            background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((scenarioAdj + 2) / 4) * 100}%, #374151 ${((scenarioAdj + 2) / 4) * 100}%, #374151 100%)`,
                            borderRadius: 4, outline: 'none', cursor: 'pointer',
                        }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--accent-red)' }}>-$2.00</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Current</span>
                        <span style={{ fontSize: 12, color: 'var(--accent-green)' }}>+$2.00</span>
                    </div>
                </div>

                {scenario && currentFuturesPrice > 0 && (
                    <div className="scenario-result-grid">
                        <div className="scenario-result-item">
                            <div className="metric-label">Cash Price</div>
                            <div className="metric-value" style={{ fontSize: 18 }}>
                                <AnimatedNumber value={scenario.cashPrice} prefix="$" />
                            </div>
                        </div>
                        <div className="scenario-result-item">
                            <div className="metric-label">Revenue/Acre</div>
                            <div className="metric-value" style={{ fontSize: 18, color: scenario.revenuePerAcre > profile.costPerAcre ? '#22c55e' : '#ef4444' }}>
                                <AnimatedNumber value={scenario.revenuePerAcre} prefix="$" color={scenario.revenuePerAcre > profile.costPerAcre ? '#22c55e' : '#ef4444'} />
                            </div>
                        </div>
                        <div className="scenario-result-item">
                            <div className="metric-label">Profit/Acre</div>
                            <div className="metric-value" style={{ fontSize: 18, color: scenario.profitPerAcre >= 0 ? '#22c55e' : '#ef4444' }}>
                                <AnimatedNumber value={scenario.profitPerAcre} prefix={scenario.profitPerAcre >= 0 ? '$' : '-$'} color={scenario.profitPerAcre >= 0 ? '#22c55e' : '#ef4444'} />
                            </div>
                        </div>
                        <div className="scenario-result-item">
                            <div className="metric-label">Total Net</div>
                            <div className="metric-value" style={{ fontSize: 18, color: scenario.netMargin >= 0 ? '#22c55e' : '#ef4444' }}>
                                <AnimatedNumber value={scenario.netMargin} prefix={scenario.netMargin >= 0 ? '$' : '-$'} color={scenario.netMargin >= 0 ? '#22c55e' : '#ef4444'} />
                            </div>
                        </div>
                        <div className="scenario-result-item">
                            <div className="metric-label">Hedge P&L</div>
                            <div className="metric-value" style={{ fontSize: 18, color: scenario.hedgePnL >= 0 ? '#22c55e' : '#ef4444' }}>
                                <AnimatedNumber value={scenario.hedgePnL} prefix={scenario.hedgePnL >= 0 ? '$' : '-$'} color={scenario.hedgePnL >= 0 ? '#22c55e' : '#ef4444'} />
                            </div>
                        </div>
                        <div className="scenario-result-item">
                            <div className="metric-label">Margin Call Exp.</div>
                            <div className="metric-value" style={{ fontSize: 18, color: 'var(--accent-yellow)' }}>
                                <AnimatedNumber value={scenario.estimatedMarginCallExposure} prefix="$" color="var(--accent-yellow)" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Your Current Position */}
            <div className="card">
                <h3 className="card-title">Your Current Position</h3>
                <div className="position-grid">
                    <div className="position-block">
                        <div className="position-label">Projected Crop</div>
                        <div className="position-value">{formatMoney(totalProduction).replace('$', '')} bu</div>
                    </div>
                    <div className="position-block">
                        <div className="position-label">% Hedged</div>
                        <div className="position-value">
                            <AnimatedNumber value={pctHedged} suffix="%" decimals={0} />
                        </div>
                    </div>
                    <div className="position-block">
                        <div className="position-label">Avg Hedge Price</div>
                        <div className="position-value">
                            <AnimatedNumber value={avgHedgePrice} prefix="$" />
                        </div>
                    </div>
                    <div className="position-block">
                        <div className="position-label">Revenue Locked</div>
                        <div className="position-value" style={{ color: 'var(--accent-green)' }}>
                            <AnimatedNumber value={revenueLocked} prefix="$" color="var(--accent-green)" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Panel */}
            <div className="cta-card">
                <div className="cta-content">
                    <div style={{ flex: 1 }}>
                        <div className="cta-title">Take Action</div>
                        <div className="cta-text">
                            You are currently <strong style={{ color: '#f9fafb' }}>{pctHedged.toFixed(0)}% hedged</strong>.
                            At today&apos;s price, locking an additional 20% would secure
                            <strong style={{ color: marginOpportunity >= 0 ? '#22c55e' : '#ef4444' }}>
                                {marginOpportunity >= 0 ? ` ${formatMoney(potentialProfit)} in profit` : ' loss protection'}
                            </strong>.
                        </div>
                    </div>
                    <Link href="/dashboard/strategies" className="btn btn-primary">
                        Explore Hedge Ideas →
                    </Link>
                </div>
            </div>
        </div>
    );
}
