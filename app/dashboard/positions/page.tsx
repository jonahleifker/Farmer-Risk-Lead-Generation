'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    HedgeEntry, FarmProfile, createDefaultProfile,
    calcTotalProduction, calcHedgePnL, calcHedgeCoverage,
    formatMoney, FUTURES_SYMBOLS,
} from '@/lib/calculations';

export default function PositionsPage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [hedges, setHedges] = useState<HedgeEntry[]>([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        bushelsHedged: 5000,
        contractType: 'futures' as HedgeEntry['contractType'],
        action: 'sell' as 'buy' | 'sell',
        entryPrice: 0,
        expiration: '',
    });

    // Load profile and hedges from API
    const loadData = useCallback(async () => {
        if (!session?.user) return;
        try {
            const [profileRes, hedgesRes] = await Promise.all([
                fetch('/api/profile'),
                fetch('/api/hedges'),
            ]);
            const profileData = await profileRes.json();
            const hedgesData = await hedgesRes.json();

            if (profileData.profile) {
                setProfile({
                    id: profileData.profile.id,
                    commodity: profileData.profile.commodity || 'corn',
                    acres: profileData.profile.acres ?? 1000,
                    expectedYield: profileData.profile.expectedYield ?? 200,
                    costPerAcre: profileData.profile.costPerAcre ?? 0,
                    basisAssumption: profileData.profile.basisAssumption ?? -0.30,
                    storageCost: profileData.profile.storageCost ?? 0,
                    desiredMargin: profileData.profile.desiredMargin ?? 0.50,
                    breakEvenPrice: 0,
                    updatedAt: profileData.profile.updatedAt || new Date().toISOString(),
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
        } catch (err) {
            console.error('Failed to load positions data:', err);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Fetch current market price
    useEffect(() => {
        fetch('/api/market/quotes')
            .then(r => r.json())
            .then(j => {
                if (j.success && j.data) {
                    const sym = FUTURES_SYMBOLS[profile.commodity as 'corn' | 'soybeans'];
                    const q = j.data.find((d: { symbol: string }) => d.symbol === sym);
                    if (q) setCurrentPrice(q.regularMarketPrice / 100);
                }
            })
            .catch(() => { });
    }, [profile.commodity]);

    const addHedge = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/hedges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                const data = await res.json();
                setHedges(prev => [{
                    id: data.hedge.id,
                    profileId: session?.user?.id || '',
                    bushelsHedged: data.hedge.bushelsHedged,
                    contractType: data.hedge.contractType,
                    action: data.hedge.action || 'sell',
                    entryPrice: data.hedge.entryPrice,
                    expiration: data.hedge.expiration || '',
                    createdAt: data.hedge.createdAt,
                }, ...prev]);
                setShowForm(false);
                setForm({ bushelsHedged: 5000, contractType: 'futures', action: 'sell', entryPrice: 0, expiration: '' });
            }
        } catch (err) {
            console.error('Failed to add hedge:', err);
        } finally {
            setSaving(false);
        }
    };

    const removeHedge = async (id: string) => {
        try {
            const res = await fetch(`/api/hedges?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHedges(prev => prev.filter(h => h.id !== id));
            }
        } catch (err) {
            console.error('Failed to remove hedge:', err);
        }
    };

    const totalProd = calcTotalProduction(profile.acres, profile.expectedYield);
    const totalBushelsHedged = hedges.reduce((sum, h) => sum + h.bushelsHedged, 0);
    const coverage = calcHedgeCoverage(totalBushelsHedged, totalProd);
    const totalPnL = calcHedgePnL(hedges, currentPrice);
    const unhedged = Math.max(totalProd - totalBushelsHedged, 0);

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 40, height: 40, border: '3px solid rgba(34,197,94,0.15)',
                        borderTop: '3px solid #22c55e', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                    }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading positions...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

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
                        <div className="metric-label">Total Production</div>
                        <div className="metric-value">{totalProd.toLocaleString()} bu</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                            {profile.acres.toLocaleString()} ac × {profile.expectedYield} bu/ac
                        </div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Total Hedged</div>
                        <div className="metric-value">{totalBushelsHedged.toLocaleString()} bu</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Unhedged</div>
                        <div className="metric-value" style={{ color: unhedged > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
                            {unhedged.toLocaleString()} bu
                        </div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Coverage</div>
                        <div className="metric-value" style={{ color: coverage >= 75 ? '#22c55e' : coverage >= 25 ? 'var(--accent-yellow)' : '#ef4444' }}>
                            {coverage.toFixed(0)}%
                        </div>
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
                {/* Coverage Bar */}
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Hedge Coverage</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: coverage >= 75 ? '#22c55e' : coverage >= 25 ? 'var(--accent-yellow)' : '#ef4444' }}>
                            {totalBushelsHedged.toLocaleString()} / {totalProd.toLocaleString()} bu ({coverage.toFixed(0)}%)
                        </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(148,163,184,0.08)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
                            width: `${Math.min(coverage, 100)}%`,
                            background: coverage >= 75 ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                : coverage >= 25 ? 'linear-gradient(90deg, #eab308, #f59e0b)'
                                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                        }} />
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
                    <button className="btn btn-green" onClick={addHedge} disabled={saving}>
                        {saving ? 'Saving...' : 'Add Position'}
                    </button>
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
