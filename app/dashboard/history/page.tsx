'use client';

import { useState, useEffect, useMemo } from 'react';

const MARKETING_YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

interface GrainContract {
    id: string;
    contractNumber: string;
    commodity: string;
    type: string;
    quantityBushels: number;
    cashPrice: string;
    saleDate: string;
    deliveryStart: string;
    deliveryEnd: string;
    location: string;
    status: string;
}

const YEAR_COLORS: Record<number, string> = {
    2025: '#22c55e',
    2024: '#3b82f6',
    2023: '#f59e0b',
    2022: '#ef4444',
    2021: '#8b5cf6',
    2020: '#06b6d4',
};

export default function HistoryPage() {
    const [selectedYear, setSelectedYear] = useState(2025);
    const [contracts, setContracts] = useState<GrainContract[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        contractNumber: '',
        commodity: 'CORN',
        type: 'CASH',
        quantityBushels: '',
        cashPrice: '',
        saleDate: new Date().toISOString().split('T')[0],
        location: '',
    });

    const [seasonalData, setSeasonalData] = useState<Record<number, { dayOfYear: number; price: number }[]>>({});
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/contracts').then(r => r.json()),
            fetch('/api/market/history?commodity=CORN').then(r => r.json())
        ]).then(([contractsRes, historyRes]) => {
            if (contractsRes.contracts) {
                setContracts(contractsRes.contracts);
            }
            if (historyRes.success) {
                setSeasonalData(historyRes.data);
            }
            setLoadingData(false);
        }).catch(err => {
            console.error('Failed to load data:', err);
            setLoadingData(false);
        });
    }, []);

    const handleSave = async () => {
        if (!form.contractNumber || !form.quantityBushels) return;

        let payload: Partial<GrainContract> = {
            ...form,
            quantityBushels: parseInt(form.quantityBushels) || 0,
            deliveryStart: `${selectedYear}-10-01`,
            deliveryEnd: `${selectedYear + 1}-09-30`,
            status: 'FILLED',
        };

        if (editingId) {
            payload.id = editingId;
        } else {
            payload.id = 'new';
        }

        try {
            const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    if (editingId) {
                        setContracts(contracts.map(c => c.id === editingId ? data.contract : c));
                    } else {
                        setContracts([data.contract, ...contracts]);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to save contract:', err);
        }

        setShowModal(false);
        setEditingId(null);
        resetForm();
    };

    const handleEdit = (c: GrainContract) => {
        setEditingId(c.id);
        setForm({
            contractNumber: c.contractNumber,
            commodity: c.commodity,
            type: c.type,
            quantityBushels: c.quantityBushels.toString(),
            cashPrice: c.cashPrice,
            saleDate: c.saleDate,
            location: c.location,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this contract?')) {
            try {
                const res = await fetch(`/api/contracts?id=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setContracts(contracts.filter(c => c.id !== id));
                }
            } catch (err) {
                console.error('Failed to delete contract:', err);
            }
        }
    };

    const resetForm = () => {
        setForm({
            contractNumber: '', commodity: 'CORN', type: 'CASH',
            quantityBushels: '', cashPrice: '',
            saleDate: new Date().toISOString().split('T')[0], location: '',
        });
    };

    const handleAdd = () => {
        setEditingId(null);
        resetForm();
        setShowModal(true);
    };

    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            const start = new Date(c.deliveryStart);
            const month = start.getMonth();
            const year = start.getFullYear();
            const marketingYear = month >= 8 ? year : year - 1;
            return marketingYear === selectedYear;
        });
    }, [contracts, selectedYear]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Chart
    const chartWidth = 900;
    const chartHeight = 380;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    const innerWidth = chartWidth - paddingLeft - paddingRight;
    const innerHeight = chartHeight - paddingTop - paddingBottom;

    const allPrices = MARKETING_YEARS.flatMap(y => (seasonalData[y] || []).map(p => p.price));
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) * 0.97 : 3;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) * 1.03 : 6;
    const priceRange = maxPrice - minPrice;

    const getX = (day: number) => paddingLeft + (day / 365) * innerWidth;
    const getY = (price: number) => paddingTop + innerHeight - ((price - minPrice) / priceRange) * innerHeight;

    const monthLabels = [
        { label: 'Sep', day: 15 }, { label: 'Oct', day: 45 }, { label: 'Nov', day: 76 },
        { label: 'Dec', day: 106 }, { label: 'Jan', day: 137 }, { label: 'Feb', day: 167 },
        { label: 'Mar', day: 196 }, { label: 'Apr', day: 227 }, { label: 'May', day: 257 },
        { label: 'Jun', day: 288 }, { label: 'Jul', day: 318 }, { label: 'Aug', day: 349 },
    ];

    return (
        <div className="page-container" style={{ maxWidth: 1100 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Marketing History</h1>
                    <p className="page-subtitle">Track historical sales and price execution</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex', background: 'rgba(15, 23, 42, 0.5)', padding: 4,
                        borderRadius: 10, border: '1px solid var(--border)',
                    }}>
                        {MARKETING_YEARS.map(y => (
                            <button key={y}
                                onClick={() => setSelectedYear(y)}
                                style={{
                                    padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                    border: 'none', cursor: 'pointer',
                                    background: selectedYear === y ? 'var(--bg-tertiary)' : 'transparent',
                                    color: selectedYear === y ? 'var(--text-primary)' : 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                }}>
                                {y}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-green btn-sm" onClick={handleAdd}>
                        ＋ Add Sale
                    </button>
                </div>
            </div>

            {/* Contracts Table */}
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <div style={{
                    display: 'flex', padding: '14px 18px',
                    background: 'rgba(30, 41, 59, 0.3)', borderBottom: '1px solid var(--border)',
                    minWidth: 650,
                }}>
                    <div style={{ flex: 2, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Contract #</div>
                    <div style={{ flex: 1.5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Commodity</div>
                    <div style={{ flex: 1.5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sale Date</div>
                    <div style={{ flex: 2, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Quantity</div>
                    <div style={{ flex: 1.5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Price</div>
                    <div style={{ flex: 1.5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</div>
                    <div style={{ flex: 1 }}></div>
                </div>

                {filteredContracts.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>
                            No Contracts for {selectedYear}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>
                            Click &quot;Add Sale&quot; to record a grain sale.
                        </div>
                    </div>
                ) : (
                    filteredContracts.map(c => (
                        <div key={c.id} style={{
                            display: 'flex', padding: '14px 18px', alignItems: 'center',
                            borderBottom: '1px solid var(--border)', minWidth: 650,
                            transition: 'background 0.15s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,41,59,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div style={{ flex: 2, fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{c.contractNumber}</div>
                            <div style={{ flex: 1.5 }}>
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{c.commodity}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.type}</div>
                            </div>
                            <div style={{ flex: 1.5, fontSize: 14, color: 'var(--text-secondary)' }}>
                                {c.saleDate ? formatDate(c.saleDate) : '—'}
                            </div>
                            <div style={{ flex: 2, fontSize: 14, color: 'var(--text-secondary)' }}>
                                {parseInt(c.quantityBushels as unknown as string).toLocaleString()} bu
                            </div>
                            <div style={{ flex: 1.5, fontSize: 14, color: 'var(--text-secondary)' }}>
                                ${parseFloat(c.cashPrice || '0').toFixed(2)}
                            </div>
                            <div style={{ flex: 1.5 }}>
                                <span style={{
                                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                    background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-green)',
                                    textTransform: 'uppercase',
                                }}>
                                    {c.status}
                                </span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button onClick={() => handleEdit(c)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>
                                    ✏️
                                </button>
                                <button onClick={() => handleDelete(c.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: 16 }}>
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Seasonal Price Chart */}
            <div className="card" style={{ marginTop: 24 }}>
                <div style={{ marginBottom: 16 }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700 }}>
                        Seasonal Corn Price Comparison
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Marketing year overlay (Sep–Aug) · $/bushel
                    </p>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
                    {MARKETING_YEARS.map(y => (
                        <div key={y} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 5, background: YEAR_COLORS[y] }} />
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {y}/{String(y + 1).slice(-2)}
                            </span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 5, background: '#9ca3af', border: '1px solid #fff' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>Sales</span>
                    </div>
                </div>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', maxWidth: chartWidth, height: 'auto' }}>
                        {/* Grid */}
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((p, i) => {
                            const y = paddingTop + innerHeight * (1 - p);
                            const priceVal = minPrice + priceRange * p;
                            return (
                                <g key={i}>
                                    <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y}
                                        stroke="rgba(148,163,184,0.06)" strokeWidth="1" strokeDasharray="4,4" />
                                    <text x={paddingLeft - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                                        ${priceVal.toFixed(2)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Month separators */}
                        {monthLabels.map((m, i) => {
                            const x = getX(m.day - 15);
                            return (
                                <g key={m.label}>
                                    {i > 0 && <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + innerHeight}
                                        stroke="rgba(148,163,184,0.04)" strokeWidth="1" />}
                                    <text x={getX(m.day)} y={chartHeight - 8} fill="#64748b" fontSize="10" textAnchor="middle">
                                        {m.label}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Year lines — oldest first so current draws on top */}
                        {[...MARKETING_YEARS].reverse().map(year => {
                            const data = seasonalData[year];
                            if (!data || data.length < 2) return null;
                            const points = data.map(p => `${getX(p.dayOfYear)},${getY(p.price)}`).join(' ');
                            const isCurrent = year === MARKETING_YEARS[0];

                            return (
                                <polyline key={year} points={points} fill="none"
                                    stroke={YEAR_COLORS[year]} strokeWidth={isCurrent ? 2.5 : 1.5}
                                    strokeOpacity={isCurrent ? 1 : 0.5} />
                            );
                        })}

                        {/* Sale dots from contracts */}
                        {contracts.map(c => {
                            if (!c.saleDate || !c.cashPrice) return null;
                            const d = new Date(c.saleDate);
                            const month = d.getMonth();
                            const yr = d.getFullYear();
                            const marketingYear = month >= 8 ? yr : yr - 1;
                            if (!MARKETING_YEARS.includes(marketingYear)) return null;

                            const sepFirst = new Date(marketingYear, 8, 1);
                            const dayOfYear = Math.floor((d.getTime() - sepFirst.getTime()) / (1000 * 60 * 60 * 24));
                            const price = parseFloat(c.cashPrice);
                            if (isNaN(price) || dayOfYear < 0 || dayOfYear > 365) return null;

                            const cx = getX(dayOfYear);
                            const cy = getY(price);
                            const dotColor = YEAR_COLORS[marketingYear] || '#f59e0b';
                            const bushels = c.quantityBushels;

                            return (
                                <g key={c.id}>
                                    <circle cx={cx} cy={cy} r="7" fill={dotColor} stroke="#fff" strokeWidth="2" />
                                    <text x={cx} y={cy - 14} fill={dotColor} fontSize="9" fontWeight="bold" textAnchor="middle">
                                        {bushels >= 1000 ? `${(bushels / 1000).toFixed(0)}k` : bushels}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                ℹ️ Marketing analytics are saved directly to your account.
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingId ? 'Edit Grain Sale' : 'Record Grain Sale'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div style={{ padding: 24 }}>
                            <div className="input-group">
                                <label className="input-label">Contract Number</label>
                                <input className="input-field" placeholder="e.g. C-10234"
                                    value={form.contractNumber}
                                    onChange={e => setForm({ ...form, contractNumber: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Commodity</label>
                                    <select className="input-field"
                                        value={form.commodity}
                                        onChange={e => setForm({ ...form, commodity: e.target.value })}>
                                        <option value="CORN">Corn</option>
                                        <option value="SOYBEANS">Soybeans</option>
                                    </select>
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Quantity (Bushels)</label>
                                    <input className="input-field" type="number" placeholder="5000"
                                        value={form.quantityBushels}
                                        onChange={e => setForm({ ...form, quantityBushels: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Sale Price ($/bu)</label>
                                    <input className="input-field" placeholder="4.50"
                                        value={form.cashPrice}
                                        onChange={e => setForm({ ...form, cashPrice: e.target.value })} />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Sale Date</label>
                                    <input className="input-field" type="date"
                                        value={form.saleDate}
                                        onChange={e => setForm({ ...form, saleDate: e.target.value })} />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Location</label>
                                <input className="input-field" placeholder="Local Elevator"
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>

                            <button className="btn btn-green" style={{ width: '100%', marginTop: 8 }}
                                onClick={handleSave}>
                                Save Contract
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
