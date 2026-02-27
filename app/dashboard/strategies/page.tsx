'use client';

import { useState, useEffect } from 'react';
import {
    FarmProfile, createDefaultProfile,
    calcBreakEvenPrice, calcTotalProduction,
    formatMoney,
} from '@/lib/calculations';

const STORAGE_KEY = 'farmer_risk_profile';

interface Strategy {
    name: string;
    type: string;
    risk: 'Low' | 'Medium' | 'High';
    description: string;
    details: string;
    color: string;
}

export default function StrategiesPage() {
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setProfile(JSON.parse(raw));
        } catch { }
    }, []);

    const breakEven = calcBreakEvenPrice(profile.costPerAcre, profile.expectedYield);
    const totalProd = calcTotalProduction(profile.acres, profile.expectedYield);
    const comfortPrice = breakEven + (profile.desiredMargin || 0.50);

    const strategies: Strategy[] = [
        {
            name: 'Conservative Lock',
            type: 'Futures Hedge',
            risk: 'Low',
            description: 'Lock in 30-50% of production at current futures levels',
            details: `Sell ${Math.round(totalProd * 0.4).toLocaleString()} bushels via futures to lock in revenue of ${formatMoney(totalProd * 0.4 * comfortPrice)}.`,
            color: '#22c55e',
        },
        {
            name: 'Balanced Protection',
            type: 'Options Strategy',
            risk: 'Medium',
            description: 'Buy puts to protect downside while keeping upside open',
            details: `Purchase put options at $${breakEven.toFixed(2)} strike for ${Math.round(totalProd * 0.5).toLocaleString()} bushels. Limits loss while preserving upside.`,
            color: '#f59e0b',
        },
        {
            name: 'Aggressive Accumulator',
            type: 'Accumulator',
            risk: 'High',
            description: 'Use accumulator structures for potentially better pricing',
            details: `Accumulate sales at $${(comfortPrice + 0.20).toFixed(2)}/bu with knock-out at $${(comfortPrice + 0.50).toFixed(2)}, covering ${Math.round(totalProd * 0.3).toLocaleString()} bushels.`,
            color: '#ef4444',
        },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Strategy Builder</h1>
                    <p className="page-subtitle">Hedging strategies based on your farm economics.</p>
                </div>
            </div>

            {/* Reference Data */}
            <div className="card">
                <h3 className="card-title">Your Reference Numbers</h3>
                <div className="metrics-row">
                    <div className="metric-item">
                        <div className="metric-label">Break-Even</div>
                        <div className="metric-value">${breakEven.toFixed(2)}/bu</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Comfort Price</div>
                        <div className="metric-value" style={{ color: 'var(--accent-green)' }}>${comfortPrice.toFixed(2)}/bu</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Total Production</div>
                        <div className="metric-value">{totalProd.toLocaleString()} bu</div>
                    </div>
                </div>
            </div>

            {/* Strategies */}
            {strategies.map((strat, i) => (
                <div key={i} className="card" style={{ borderLeft: `3px solid ${strat.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{strat.name}</h3>
                            <span style={{ fontSize: 12, color: strat.color, fontWeight: 600, textTransform: 'uppercase' }}>
                                {strat.type} · {strat.risk} Risk
                            </span>
                        </div>
                        <div style={{
                            padding: '4px 12px', borderRadius: 12,
                            background: `${strat.color}15`, color: strat.color,
                            fontSize: 12, fontWeight: 600,
                        }}>
                            {strat.risk}
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
                        {strat.description}
                    </p>
                    <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{strat.details}</p>
                    </div>
                </div>
            ))}

            {/* Broker CTA */}
            <div className="cta-card">
                <div className="cta-content" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div className="cta-title">Need Help Executing?</div>
                    <div className="cta-text">
                        Connect with a licensed commodity broker to implement these strategies.
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 12 }}>
                        📞 Contact a Broker (Coming Soon)
                    </button>
                </div>
            </div>
        </div>
    );
}
