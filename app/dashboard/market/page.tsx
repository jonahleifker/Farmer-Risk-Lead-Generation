'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FarmProfile, HedgeEntry, createDefaultProfile, FUTURES_SYMBOLS,
    calcImpliedCashPrice, calcBreakEvenPrice, calcTotalProduction,
    formatMoney,
} from '@/lib/calculations';

interface QuoteData {
    symbol: string;
    regularMarketPrice: number;
}

const STORAGE_KEY = 'farmer_risk_profile';
const HEDGES_KEY = 'farmer_risk_hedges';

export default function MarketOpportunityPage() {
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [hedges, setHedges] = useState<HedgeEntry[]>([]);
    const [quotes, setQuotes] = useState<QuoteData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const savedProfile = localStorage.getItem(STORAGE_KEY);
            const savedHedges = localStorage.getItem(HEDGES_KEY);
            if (savedProfile) setProfile(JSON.parse(savedProfile));
            if (savedHedges) setHedges(JSON.parse(savedHedges));

            const res = await fetch('/api/market/quotes');
            const json = await res.json();
            if (json.success && json.data) setQuotes(json.data);
        } catch (err) {
            console.error('Dashboard load error:', err);
        }
        setLoading(false);
    };

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
                        <div className="metric-value">${currentFuturesPrice.toFixed(2)}</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Your Local Basis</div>
                        <div className="metric-value">{profile.basisAssumption >= 0 ? '+' : ''}${profile.basisAssumption.toFixed(2)}</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Cash Price</div>
                        <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>${impliedCashPrice.toFixed(2)}</div>
                    </div>
                </div>

                <div className="margin-opportunity-box" style={{
                    borderColor: marginColor,
                    background: `${marginColor}15`,
                }}>
                    <div>
                        <div className="margin-label" style={{ color: marginColor }}>Today&apos;s Margin Opportunity</div>
                        <div className="margin-value" style={{ color: marginColor }}>
                            {marginOpportunity >= 0 ? '+' : ''}${marginOpportunity.toFixed(2)} / bu
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
                        <div className="position-value">{pctHedged.toFixed(0)}%</div>
                    </div>
                    <div className="position-block">
                        <div className="position-label">Avg Hedge Price</div>
                        <div className="position-value">${avgHedgePrice.toFixed(2)}</div>
                    </div>
                    <div className="position-block">
                        <div className="position-label">Revenue Locked</div>
                        <div className="position-value" style={{ color: 'var(--accent-green)' }}>
                            {formatMoney(revenueLocked)}
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
