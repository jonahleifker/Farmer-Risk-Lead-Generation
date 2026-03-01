'use client';

import { useState, useEffect } from 'react';
import {
    FarmProfile, createDefaultProfile,
    calcBreakEvenPrice, calcTotalProduction,
    calcImpliedCashPrice, formatMoney, FUTURES_SYMBOLS,
} from '@/lib/calculations';

const STORAGE_KEY = 'farmer_risk_profile';

type Goal = 'protect_downside' | 'lock_profit' | 'stay_flexible' | null;

interface StrategyOption {
    title: string;
    desc: string;
    worstCase: number;
    lockedIn: number;
    upside: string;
    pctCommitted: number;
    tag?: string;
}

export default function StrategiesPage() {
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [pctToProtect, setPctToProtect] = useState(30);
    const [selectedGoal, setSelectedGoal] = useState<Goal>(null);
    const [currentFutures, setCurrentFutures] = useState(0);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setProfile(JSON.parse(raw));
        } catch { }
        // Fetch live market price
        fetch('/api/market/quotes')
            .then(r => r.json())
            .then(data => {
                if (data.success && data.quotes) {
                    const sym = FUTURES_SYMBOLS[profile.commodity];
                    const q = data.quotes.find((q: { symbol: string }) => q.symbol === sym);
                    if (q) setCurrentFutures(q.regularMarketPrice / 100);
                }
            })
            .catch(() => { });
    }, [profile.commodity]);

    const breakEven = calcBreakEvenPrice(profile.costPerAcre, profile.expectedYield);
    const totalProd = calcTotalProduction(profile.acres, profile.expectedYield);
    const totalHedged = 0; // TODO: pull from positions
    const availableBushels = Math.max(0, totalProd - totalHedged);
    const targetBushels = availableBushels * (pctToProtect / 100);
    const currentCash = currentFutures > 0
        ? calcImpliedCashPrice(currentFutures, profile.basisAssumption)
        : breakEven + 0.50;
    const currentRevenueBase = targetBushels * currentCash;

    const getOptions = (): StrategyOption[] => {
        if (!selectedGoal) return [];

        if (selectedGoal === 'protect_downside') {
            return [
                {
                    title: 'Conservative (Put Options)',
                    desc: `Buy $${breakEven.toFixed(2)} puts on ${pctToProtect}% (${targetBushels.toLocaleString()} bu) of your crop.`,
                    worstCase: targetBushels * breakEven,
                    lockedIn: 0,
                    upside: 'Unlimited',
                    pctCommitted: pctToProtect,
                    tag: 'Most Popular',
                },
                {
                    title: 'Balanced (Collar)',
                    desc: `Buy $${breakEven.toFixed(2)} puts, sell $${(currentCash + 0.50).toFixed(2)} calls to offset premium on ${pctToProtect}% (${targetBushels.toLocaleString()} bu).`,
                    worstCase: targetBushels * breakEven,
                    lockedIn: 0,
                    upside: `Capped at ${formatMoney(targetBushels * (currentCash + 0.50))}`,
                    pctCommitted: pctToProtect,
                },
            ];
        }

        if (selectedGoal === 'lock_profit') {
            return [
                {
                    title: 'Direct Hedge (Futures/HTA)',
                    desc: `Sell ${pctToProtect}% (${targetBushels.toLocaleString()} bu) of your crop today at $${currentCash.toFixed(2)}.`,
                    worstCase: currentRevenueBase,
                    lockedIn: currentRevenueBase,
                    upside: 'None on this portion',
                    pctCommitted: pctToProtect,
                    tag: 'Highest Certainty',
                },
                {
                    title: 'Enhanced (Accumulator)',
                    desc: `Accumulate ${pctToProtect}% (${targetBushels.toLocaleString()} bu) at $${(currentCash + 0.30).toFixed(2)} (premium to market). Caution: double up risk applies.`,
                    worstCase: targetBushels * (currentCash - 0.50),
                    lockedIn: 0,
                    upside: 'High Premium',
                    pctCommitted: pctToProtect,
                },
            ];
        }

        if (selectedGoal === 'stay_flexible') {
            const floorPrice = currentCash - 0.15;
            return [
                {
                    title: 'Minimum Price Contract',
                    desc: `Lock in a base cash price of $${floorPrice.toFixed(2)} on ${pctToProtect}% (${targetBushels.toLocaleString()} bu) while remaining open to upside.`,
                    worstCase: targetBushels * floorPrice,
                    lockedIn: targetBushels * floorPrice,
                    upside: 'Full Participation',
                    pctCommitted: pctToProtect,
                },
                {
                    title: 'Wait & See (No Action)',
                    desc: 'Leave this portion completely unpriced.',
                    worstCase: targetBushels * (currentCash * 0.7),
                    lockedIn: 0,
                    upside: 'Unlimited',
                    pctCommitted: 0,
                },
            ];
        }

        return [];
    };

    const options = getOptions();

    const goalColor = (goal: Goal) => {
        if (goal === 'protect_downside') return 'var(--accent-green)';
        if (goal === 'lock_profit') return 'var(--accent-blue)';
        if (goal === 'stay_flexible') return 'var(--accent-yellow)';
        return 'var(--text-muted)';
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Strategy Builder</h1>
                    <p className="page-subtitle">A guided approach to protecting your farm&apos;s revenue.</p>
                </div>
            </div>

            {/* Step 1: Slider */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: 'var(--accent-blue)',
                    }}>1</div>
                    <h3 style={{ fontSize: 17, fontWeight: 600 }}>How much would you feel comfortable protecting today?</h3>
                </div>

                <div style={{
                    background: 'rgba(15, 23, 42, 0.4)', borderRadius: 12, padding: 24,
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <span style={{
                            fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700,
                            color: 'var(--accent-blue)',
                        }}>
                            {pctToProtect}% <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>of unhedged crop</span>
                        </span>
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={pctToProtect}
                        onChange={(e) => setPctToProtect(Number(e.target.value))}
                        style={{
                            width: '100%', height: 6, appearance: 'none', WebkitAppearance: 'none',
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pctToProtect}%, #374151 ${pctToProtect}%, #374151 100%)`,
                            borderRadius: 4, outline: 'none', cursor: 'pointer',
                        }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>0%</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                            ({targetBushels.toLocaleString()} bu)
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>100%</span>
                    </div>
                </div>
            </div>

            {/* Step 2: Goal Selection */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: 'var(--accent-blue)',
                    }}>2</div>
                    <h3 style={{ fontSize: 17, fontWeight: 600 }}>What matters most to you right now?</h3>
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {([
                        { key: 'protect_downside' as Goal, icon: '🛡️', label: 'Protect Downside', sub: '"I can\'t afford prices going lower."' },
                        { key: 'lock_profit' as Goal, icon: '🔒', label: 'Lock in Profit', sub: '"I like today\'s prices and want them secured."' },
                        { key: 'stay_flexible' as Goal, icon: '🌊', label: 'Stay Flexible', sub: '"I want protection but need upside potential."' },
                    ]).map(g => (
                        <button
                            key={g.key}
                            onClick={() => setSelectedGoal(g.key)}
                            style={{
                                flex: '1 1 200px',
                                background: selectedGoal === g.key ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.4)',
                                border: `1.5px solid ${selectedGoal === g.key ? goalColor(g.key) : 'var(--border)'}`,
                                borderRadius: 12, padding: '20px 16px',
                                cursor: 'pointer', textAlign: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ fontSize: 28, marginBottom: 10 }}>{g.icon}</div>
                            <div style={{
                                fontSize: 15, fontWeight: 700, marginBottom: 6,
                                color: selectedGoal === g.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                            }}>{g.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{g.sub}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 3: Results */}
            {selectedGoal && options.length > 0 && (
                <div style={{ animation: 'fadeSlideUp 0.4s var(--ease-out) both' }}>
                    <h3 style={{
                        fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 700,
                        marginBottom: 16, letterSpacing: -0.3,
                    }}>
                        Recommended Strategies for {pctToProtect}% ({targetBushels.toLocaleString()} bu)
                    </h3>

                    {options.map((opt, idx) => (
                        <div key={idx} className="card" style={{ position: 'relative' }}>
                            {opt.tag && (
                                <div style={{
                                    position: 'absolute', top: -10, right: 20,
                                    background: 'var(--accent-yellow)', color: '#fff',
                                    padding: '3px 10px', borderRadius: 10,
                                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                }}>{opt.tag}</div>
                            )}
                            <h4 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{opt.title}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                                {opt.desc}
                            </p>
                            <div className="metrics-row">
                                <div className="metric-item">
                                    <div className="metric-label">Worst-Case Revenue</div>
                                    <div className="metric-value" style={{ color: 'var(--accent-red)', fontSize: 18 }}>
                                        {formatMoney(opt.worstCase)}
                                    </div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Locked-In Revenue</div>
                                    <div className="metric-value" style={{ color: 'var(--accent-green)', fontSize: 18 }}>
                                        {formatMoney(opt.lockedIn)}
                                    </div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Upside Potential</div>
                                    <div className="metric-value" style={{ color: 'var(--accent-blue)', fontSize: 14, marginTop: 4 }}>
                                        {opt.upside}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* CTA */}
                    <div className="cta-card">
                        <div className="cta-title">Ready to execute or need advice?</div>
                        <div className="cta-text" style={{ marginBottom: 16 }}>
                            Take the next step with a professional to deploy these strategies.
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-green">🎧 Speak With an Advisor</button>
                            <button className="btn btn-outline">Open Hedge Account</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
