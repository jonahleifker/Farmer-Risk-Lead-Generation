'use client';

import { useState, useEffect } from 'react';
import {
    FarmProfile, HedgeEntry, createDefaultProfile, FUTURES_SYMBOLS,
    calcImpliedCashPrice, calcBreakEvenPrice, calcTotalProduction,
    calcHedgePnL, calcHedgeCoverage, calcRevenuePerAcre, calcProfitPerAcre,
    formatMoney,
} from '@/lib/calculations';

const STORAGE_KEY = 'farmer_risk_profile';
const HEDGES_KEY = 'farmer_risk_hedges';

export default function ReportsPage() {
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [hedges, setHedges] = useState<HedgeEntry[]>([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setProfile(JSON.parse(raw));
            const h = localStorage.getItem(HEDGES_KEY);
            if (h) setHedges(JSON.parse(h));
        } catch { }

        fetch('/api/market/quotes')
            .then(r => r.json())
            .then(j => {
                if (j.success && j.data) {
                    const p = localStorage.getItem(STORAGE_KEY);
                    const commodity = p ? JSON.parse(p).commodity : 'corn';
                    const sym = FUTURES_SYMBOLS[commodity as 'corn' | 'soybeans'];
                    const q = j.data.find((d: { symbol: string }) => d.symbol === sym);
                    if (q) setCurrentPrice(q.regularMarketPrice / 100);
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const breakEven = calcBreakEvenPrice(profile.costPerAcre, profile.expectedYield);
    const totalProd = calcTotalProduction(profile.acres, profile.expectedYield);
    const cashPrice = calcImpliedCashPrice(currentPrice, profile.basisAssumption);
    const revenuePerAcre = calcRevenuePerAcre(cashPrice, profile.expectedYield);
    const profitPerAcre = calcProfitPerAcre(revenuePerAcre, profile.costPerAcre);
    const totalBushelsHedged = hedges.reduce((sum, h) => sum + h.bushelsHedged, 0);
    const coverage = calcHedgeCoverage(totalBushelsHedged, totalProd);
    const hedgePnL = calcHedgePnL(hedges, currentPrice);
    const netRevenue = (profitPerAcre * profile.acres) + hedgePnL;

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
                <p style={{ color: 'var(--text-secondary)' }}>Generating report...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Executive Summary</h1>
                    <p className="page-subtitle">Complete overview of your operation at a glance.</p>
                </div>
            </div>

            {/* P&L Summary */}
            <div className="card" style={{ borderLeft: `3px solid ${netRevenue >= 0 ? '#22c55e' : '#ef4444'}` }}>
                <h3 className="card-title">Projected P&L</h3>
                <div className="metrics-row">
                    <div className="metric-item">
                        <div className="metric-label">Revenue/Acre</div>
                        <div className="metric-value">${revenuePerAcre.toFixed(2)}</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Cost/Acre</div>
                        <div className="metric-value">${profile.costPerAcre.toFixed(2)}</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Profit/Acre</div>
                        <div className="metric-value" style={{ color: profitPerAcre >= 0 ? '#22c55e' : '#ef4444' }}>
                            ${profitPerAcre.toFixed(2)}
                        </div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Total Net Revenue</div>
                        <div className="metric-value" style={{ color: netRevenue >= 0 ? '#22c55e' : '#ef4444' }}>
                            {formatMoney(netRevenue)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Farm Profile */}
            <div className="card">
                <h3 className="card-title">Farm Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                    {[
                        { label: 'Commodity', value: profile.commodity === 'corn' ? '🌽 Corn' : '🫘 Soybeans' },
                        { label: 'Acres', value: `${profile.acres.toLocaleString()} ac` },
                        { label: 'Expected Yield', value: `${profile.expectedYield} bu/ac` },
                        { label: 'Total Production', value: `${totalProd.toLocaleString()} bu` },
                        { label: 'Break-Even', value: `$${breakEven.toFixed(2)}/bu` },
                        { label: 'Basis', value: `$${profile.basisAssumption.toFixed(2)}/bu` },
                    ].map((item, i) => (
                        <div key={i}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hedge Summary */}
            <div className="card">
                <h3 className="card-title">Hedge Summary</h3>
                <div className="metrics-row">
                    <div className="metric-item">
                        <div className="metric-label">Positions</div>
                        <div className="metric-value">{hedges.length}</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Coverage</div>
                        <div className="metric-value">{coverage.toFixed(0)}%</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Hedged Bushels</div>
                        <div className="metric-value">{totalBushelsHedged.toLocaleString()}</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Hedge P&L</div>
                        <div className="metric-value" style={{ color: hedgePnL >= 0 ? '#22c55e' : '#ef4444' }}>
                            {formatMoney(hedgePnL)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Risk Assessment */}
            <div className="card">
                <h3 className="card-title">Risk Assessment</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Coverage Level</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {coverage < 25 ? 'High exposure — consider adding hedges' :
                                    coverage < 75 ? 'Moderate coverage — review strategy' :
                                        'Well covered — monitor existing positions'}
                            </div>
                        </div>
                        <div style={{
                            padding: '6px 14px', borderRadius: 20,
                            background: coverage >= 75 ? '#22c55e15' : coverage >= 25 ? '#f59e0b15' : '#ef444415',
                            color: coverage >= 75 ? '#22c55e' : coverage >= 25 ? '#f59e0b' : '#ef4444',
                            fontWeight: 600, fontSize: 13,
                        }}>
                            {coverage >= 75 ? 'Low Risk' : coverage >= 25 ? 'Moderate' : 'High Risk'}
                        </div>
                    </div>
                    <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Market Outlook</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {cashPrice > breakEven ? 'Currently profitable — opportunity to lock in margins' :
                                    'Below break-even — risk protection recommended'}
                            </div>
                        </div>
                        <div style={{
                            padding: '6px 14px', borderRadius: 20,
                            background: cashPrice > breakEven ? '#22c55e15' : '#ef444415',
                            color: cashPrice > breakEven ? '#22c55e' : '#ef4444',
                            fontWeight: 600, fontSize: 13,
                        }}>
                            {cashPrice > breakEven ? 'Favorable' : 'Unfavorable'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
