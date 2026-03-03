'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    FarmProfile, CostBreakdown, CommodityType, createDefaultProfile,
    calcBreakEvenPrice,
} from '@/lib/calculations';

export default function FarmEconomicsPage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [showCalc, setShowCalc] = useState(false);
    const [calcField, setCalcField] = useState<{ key: keyof CostBreakdown; label: string } | null>(null);
    const [calcExpense, setCalcExpense] = useState('');
    const [calcAcres, setCalcAcres] = useState('');
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load profile from API on mount
    useEffect(() => {
        if (!session?.user) return;
        fetch('/api/profile')
            .then((res) => res.json())
            .then((data) => {
                if (data.profile) {
                    setProfile({
                        id: data.profile.id,
                        commodity: data.profile.commodity || 'corn',
                        acres: data.profile.acres ?? 1000,
                        expectedYield: data.profile.expectedYield ?? 200,
                        costPerAcre: data.profile.costPerAcre ?? 0,
                        basisAssumption: data.profile.basisAssumption ?? -0.30,
                        storageCost: data.profile.storageCost ?? 0,
                        desiredMargin: data.profile.desiredMargin ?? 0.50,
                        costBreakdown: data.profile.costBreakdown || {
                            land: 0, seed: 0, fertilizer: 0, chemical: 0,
                            insurance: 0, equipment: 0, labor: 0, other: 0,
                        },
                        breakEvenPrice: calcBreakEvenPrice(
                            data.profile.costPerAcre ?? 0,
                            data.profile.expectedYield ?? 200
                        ),
                        updatedAt: data.profile.updatedAt || new Date().toISOString(),
                    });
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [session]);

    // Debounced auto-save to API
    const saveToDb = useCallback((p: FarmProfile) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const res = await fetch('/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        commodity: p.commodity,
                        acres: p.acres,
                        expectedYield: p.expectedYield,
                        costPerAcre: p.costPerAcre,
                        basisAssumption: p.basisAssumption,
                        storageCost: p.storageCost,
                        desiredMargin: p.desiredMargin,
                        costBreakdown: p.costBreakdown,
                    }),
                });
                if (res.ok) {
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                } else {
                    setSaveStatus('error');
                }
            } catch {
                setSaveStatus('error');
            }
        }, 800);
    }, []);

    const updateField = (updates: Partial<FarmProfile>) => {
        setProfile((prev) => {
            const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
            if ('costPerAcre' in updates || 'expectedYield' in updates) {
                next.breakEvenPrice = calcBreakEvenPrice(next.costPerAcre, next.expectedYield);
            }
            saveToDb(next);
            return next;
        });
    };

    const updateCost = (key: keyof CostBreakdown, value: string) => {
        const numVal = value === '' ? 0 : parseFloat(value);
        if (isNaN(numVal)) return;
        const breakdown = { ...(profile.costBreakdown || {}), [key]: numVal } as CostBreakdown;
        const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
        updateField({ costBreakdown: breakdown, costPerAcre: total });
    };

    const openCalc = (key: keyof CostBreakdown, label: string) => {
        setCalcField({ key, label });
        setCalcAcres(profile.acres.toString());
        setCalcExpense('');
        setShowCalc(true);
    };

    const applyCalc = () => {
        if (!calcField) return;
        const total = parseFloat(calcExpense);
        const acres = parseFloat(calcAcres);
        if (!isNaN(total) && !isNaN(acres) && acres > 0) {
            updateCost(calcField.key, (total / acres).toFixed(2));
        }
        setShowCalc(false);
    };

    const calcResult = (parseFloat(calcExpense) && parseFloat(calcAcres) > 0)
        ? (parseFloat(calcExpense) / parseFloat(calcAcres)).toFixed(2)
        : '0.00';

    const breakEven = calcBreakEvenPrice(profile.costPerAcre, profile.expectedYield);
    const totalProd = profile.acres * profile.expectedYield;
    const costCategories: { key: keyof CostBreakdown; label: string }[] = [
        { key: 'land', label: 'Land/Rent' },
        { key: 'seed', label: 'Seed' },
        { key: 'fertilizer', label: 'Fertilizer' },
        { key: 'chemical', label: 'Chemical' },
        { key: 'insurance', label: 'Insurance' },
        { key: 'equipment', label: 'Equipment' },
        { key: 'labor', label: 'Labor' },
        { key: 'other', label: 'Other' },
    ];

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 40, height: 40, border: '3px solid rgba(34,197,94,0.15)',
                        borderTop: '3px solid #22c55e', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                    }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading your farm profile...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Farm Economics</h1>
                    <p className="page-subtitle">Your operation&apos;s cost structure and break-even analysis.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                        fontSize: 12, color: saveStatus === 'saving' ? 'var(--accent-yellow)'
                            : saveStatus === 'saved' ? 'var(--accent-green)'
                                : saveStatus === 'error' ? '#ef4444'
                                    : 'var(--text-dim)',
                        transition: 'color 0.3s',
                    }}>
                        {saveStatus === 'saving' ? '● Saving...'
                            : saveStatus === 'saved' ? '✓ Saved'
                                : saveStatus === 'error' ? '✕ Save failed'
                                    : ''}
                    </span>
                </div>
            </div>

            {/* Profile Settings */}
            <div className="card">
                <h3 className="card-title">Profile Settings</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                        <label className="input-label">Commodity</label>
                        <select className="input-field" value={profile.commodity}
                            onChange={(e) => updateField({ commodity: e.target.value as CommodityType })}>
                            <option value="corn">Corn</option>
                            <option value="soybeans">Soybeans</option>
                        </select>
                    </div>
                    <InputField label="Acres" value={profile.acres} prefix=""
                        suffix="ac" onUpdate={(v) => updateField({ acres: v })} />
                    <InputField label="Expected Yield" value={profile.expectedYield} prefix=""
                        suffix="bu/ac" onUpdate={(v) => updateField({ expectedYield: v })} />
                    <InputField label="Basis Assumption" value={profile.basisAssumption} prefix="$"
                        suffix="/bu" onUpdate={(v) => updateField({ basisAssumption: v })} allowNegative />
                    <InputField label="Storage Cost" value={profile.storageCost} prefix="$"
                        suffix="/bu" onUpdate={(v) => updateField({ storageCost: v })} />
                    <InputField label="Desired Margin" value={profile.desiredMargin || 0} prefix="$"
                        suffix="/bu" onUpdate={(v) => updateField({ desiredMargin: v })} />
                </div>
            </div>

            {/* Cost Breakdown */}
            <div className="card">
                <h3 className="card-title">Cost Breakdown</h3>
                <div className="cost-grid">
                    {costCategories.map((cat) => (
                        <div key={cat.key}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <label className="input-label" style={{ marginBottom: 0 }}>{cat.label}</label>
                                <button onClick={() => openCalc(cat.key, cat.label)}
                                    title="Per-acre calculator"
                                    style={{
                                        background: 'rgba(59, 130, 246, 0.08)', border: 'none',
                                        borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
                                        fontSize: 14, lineHeight: 1,
                                    }}>
                                    🧮
                                </button>
                            </div>
                            <CostInput
                                value={profile.costBreakdown?.[cat.key] || 0}
                                onChange={(v) => updateCost(cat.key, v)}
                            />
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total Cost Per Acre</span>
                        <span style={{ fontSize: 24, fontWeight: 700 }}>${profile.costPerAcre.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cost Per Bushel</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-yellow)' }}>
                            ${(profile.expectedYield > 0 ? profile.costPerAcre / profile.expectedYield : 0).toFixed(2)}/bu
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Comfort Price</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                            ${(profile.expectedYield > 0 ? (profile.costPerAcre / profile.expectedYield) + (profile.desiredMargin || 0.50) : 0).toFixed(2)}/bu
                        </span>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="card">
                <h3 className="card-title">Key Metrics</h3>
                <div className="metrics-row">
                    <div className="metric-item">
                        <div className="metric-label">Break-Even Price</div>
                        <div className="metric-value">${breakEven.toFixed(2)}</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Total Production</div>
                        <div className="metric-value">{totalProd.toLocaleString()} bu</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Cost Per Acre</div>
                        <div className="metric-value">${profile.costPerAcre.toFixed(2)}</div>
                    </div>
                    <div className="metric-item">
                        <div className="metric-label">Comfort Price</div>
                        <div className="metric-value" style={{ color: 'var(--accent-green)' }}>
                            ${(breakEven + (profile.desiredMargin || 0.50)).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-Acre Calculator Modal */}
            {showCalc && (
                <div className="modal-overlay" onClick={() => setShowCalc(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Calculate {calcField?.label}</h3>
                            <button className="modal-close" onClick={() => setShowCalc(false)}>×</button>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                            Convert a bulk expense bill into a per-acre cost.
                        </p>

                        <div className="input-group">
                            <label className="input-label">Total Expense Bill ($)</label>
                            <input className="input-field" type="number" placeholder="e.g. 50000"
                                value={calcExpense} onChange={e => setCalcExpense(e.target.value)} autoFocus />
                        </div>

                        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, margin: '8px 0', letterSpacing: 1 }}>
                            ÷ DIVIDED BY ÷
                        </div>

                        <div className="input-group">
                            <label className="input-label">Total Farm Acres</label>
                            <input className="input-field" type="number" placeholder="e.g. 1000"
                                value={calcAcres} onChange={e => setCalcAcres(e.target.value)} />
                        </div>

                        <div style={{
                            background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', margin: '16px 0',
                        }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Result:</span>
                            <span style={{ color: 'var(--accent-blue)', fontSize: 22, fontWeight: 700 }}>
                                ${calcResult} / acre
                            </span>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={applyCalc}>
                            Apply to {calcField?.label}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function InputField({ label, value, prefix, suffix, onUpdate, allowNegative }: {
    label: string; value: number; prefix?: string; suffix?: string;
    onUpdate: (v: number) => void; allowNegative?: boolean;
}) {
    const [text, setText] = useState(value.toString());

    useEffect(() => { setText(value.toString()); }, [value]);

    const handleBlur = () => {
        const num = parseFloat(text);
        if (isNaN(num) || (!allowNegative && num < 0)) {
            setText(value.toString());
        } else {
            onUpdate(num);
        }
    };

    return (
        <div style={{ flex: 1, minWidth: 140 }}>
            <label className="input-label">{label}</label>
            <div className="input-with-prefix">
                {prefix && <span className="input-prefix">{prefix}</span>}
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                />
                {suffix && <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 4 }}>{suffix}</span>}
            </div>
        </div>
    );
}

function CostInput({ value, onChange }: { value: number; onChange: (v: string) => void }) {
    const [text, setText] = useState(value.toString());

    useEffect(() => { setText(value.toString()); }, [value]);

    const handleBlur = () => {
        onChange(text);
    };

    return (
        <div className="input-with-prefix">
            <span className="input-prefix">$</span>
            <input
                type="text"
                inputMode="decimal"
                value={text}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v)) {
                        setText(v);
                    }
                }}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            />
        </div>
    );
}
