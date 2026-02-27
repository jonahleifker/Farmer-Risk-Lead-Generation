'use client';

import { useState, useEffect } from 'react';
import {
    HedgeEntry, FarmProfile, createDefaultProfile,
    calcTotalProduction, calcHedgePnL, calcHedgeCoverage,
    formatMoney, FUTURES_SYMBOLS,
} from '@/lib/calculations';

const STORAGE_KEY = 'farmer_risk_profile';
const HEDGES_KEY = 'farmer_risk_hedges';

export default function PositionsPage() {
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [hedges, setHedges] = useState<HedgeEntry[]>([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        bushelsHedged: 5000,
        contractType: 'futures' as HedgeEntry['contractType'],
        action: 'sell' as 'buy' | 'sell',
        entryPrice: 0,
        expiration: '',
    });

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
            .catch(() => { });
    }, []);

    const saveHedges = (h: HedgeEntry[]) => {
        setHedges(h);
        localStorage.setItem(HEDGES_KEY, JSON.stringify(h));
    };

    const addHedge = () => {
        const newHedge: HedgeEntry = {
            id: Date.now().toString(),
            profileId: profile.id,
            ...form,
            createdAt: new Date().toISOString(),
        };
        saveHedges([...hedges, newHedge]);
        setShowForm(false);
        setForm({ bushelsHedged: 5000, contractType: 'futures', action: 'sell', entryPrice: 0, expiration: '' });
    };

    const removeHedge = (id: string) => {
        saveHedges(hedges.filter(h => h.id !== id));
    };

    const totalProd = calcTotalProduction(profile.acres, profile.expectedYield);
    const totalBushelsHedged = hedges.reduce((sum, h) => sum + h.bushelsHedged, 0);
    const coverage = calcHedgeCoverage(totalBushelsHedged, totalProd);
    const totalPnL = calcHedgePnL(hedges, currentPrice);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Positions</h1>
                    <p className="page-subtitle">Track your hedge positions and P&L.</p>
                </div>
                <button className="btn btn-green btn-sm" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Add Position'}
                </button>
            </div>

            {/* Summary */}
            <div className="card">
                <h3 className="card-title">Position Summary</h3>
                <div className="metrics-row">
                    <div className="metric-item">
                        <div className="metric-label">Total Hedged</div>
                        <div className="metric-value">{totalBushelsHedged.toLocaleString()} bu</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Coverage</div>
                        <div className="metric-value">{coverage.toFixed(0)}%</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Unrealized P&L</div>
                        <div className="metric-value" style={{ color: totalPnL >= 0 ? '#22c55e' : '#ef4444' }}>
                            {formatMoney(totalPnL)}
                        </div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Current Price</div>
                        <div className="metric-value">${currentPrice.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Add form */}
            {showForm && (
                <div className="card">
                    <h3 className="card-title">New Position</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                        <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
                            <label className="input-label">Action</label>
                            <select className="input-field" value={form.action}
                                onChange={(e) => setForm({ ...form, action: e.target.value as 'buy' | 'sell' })}>
                                <option value="sell">Sell (Short)</option>
                                <option value="buy">Buy (Long)</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
                            <label className="input-label">Type</label>
                            <select className="input-field" value={form.contractType}
                                onChange={(e) => setForm({ ...form, contractType: e.target.value as HedgeEntry['contractType'] })}>
                                <option value="futures">Futures</option>
                                <option value="HTA">HTA</option>
                                <option value="basis">Basis</option>
                                <option value="option">Option</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
                            <label className="input-label">Bushels</label>
                            <input className="input-field" type="number" value={form.bushelsHedged}
                                onChange={(e) => setForm({ ...form, bushelsHedged: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
                            <label className="input-label">Entry Price</label>
                            <div className="input-with-prefix">
                                <span className="input-prefix">$</span>
                                <input type="number" step="0.01" value={form.entryPrice}
                                    onChange={(e) => setForm({ ...form, entryPrice: parseFloat(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
                            <label className="input-label">Expiration</label>
                            <input className="input-field" type="text" placeholder="Dec 2026"
                                value={form.expiration}
                                onChange={(e) => setForm({ ...form, expiration: e.target.value })} />
                        </div>
                    </div>
                    <button className="btn btn-green" onClick={addHedge}>Add Position</button>
                </div>
            )}

            {/* Position List */}
            {hedges.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Positions</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Add your first hedge position to start tracking.</p>
                </div>
            ) : (
                <div className="card">
                    <h3 className="card-title">Active Positions</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Action', 'Type', 'Bushels', 'Entry', 'Current', 'P&L', 'Exp', ''].map(h => (
                                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {hedges.map(h => {
                                    const pnl = h.action === 'buy'
                                        ? (currentPrice - h.entryPrice) * h.bushelsHedged
                                        : (h.entryPrice - currentPrice) * h.bushelsHedged;
                                    return (
                                        <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px', fontSize: 14 }}>
                                                <span style={{ color: h.action === 'sell' ? '#ef4444' : '#22c55e', fontWeight: 600, textTransform: 'uppercase' }}>
                                                    {h.action || 'sell'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', fontSize: 14, color: 'var(--text-secondary)' }}>{h.contractType}</td>
                                            <td style={{ padding: '12px', fontSize: 14 }}>{h.bushelsHedged.toLocaleString()}</td>
                                            <td style={{ padding: '12px', fontSize: 14 }}>${h.entryPrice.toFixed(2)}</td>
                                            <td style={{ padding: '12px', fontSize: 14 }}>${currentPrice.toFixed(2)}</td>
                                            <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                                                {formatMoney(pnl)}
                                            </td>
                                            <td style={{ padding: '12px', fontSize: 14, color: 'var(--text-secondary)' }}>{h.expiration || '-'}</td>
                                            <td style={{ padding: '12px' }}>
                                                <button className="btn btn-danger btn-sm" onClick={() => removeHedge(h.id)}>×</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
