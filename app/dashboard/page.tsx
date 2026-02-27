'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { LeadCaptureModal } from '@/components/LeadCaptureModal';
import {
    FarmProfile, CostBreakdown, CommodityType, createDefaultProfile,
    calcBreakEvenPrice,
} from '@/lib/calculations';

const STORAGE_KEY = 'farmer_risk_profile';

function loadLocalProfile(): FarmProfile {
    if (typeof window === 'undefined') return createDefaultProfile('corn');
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return createDefaultProfile('corn');
}

function saveLocalProfile(p: FarmProfile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export default function FarmEconomicsPage() {
    const { data: session } = useSession();
    const [profile, setProfile] = useState<FarmProfile>(createDefaultProfile('corn'));
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setProfile(loadLocalProfile());
    }, []);

    const updateField = (updates: Partial<FarmProfile>) => {
        setProfile((prev) => {
            const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
            if ('costPerAcre' in updates || 'expectedYield' in updates) {
                next.breakEvenPrice = calcBreakEvenPrice(next.costPerAcre, next.expectedYield);
            }
            saveLocalProfile(next);
            return next;
        });
    };

    const updateCost = (key: keyof CostBreakdown, value: string) => {
        const numVal = parseFloat(value) || 0;
        const breakdown = { ...(profile.costBreakdown || {}), [key]: numVal } as CostBreakdown;
        const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
        updateField({ costBreakdown: breakdown, costPerAcre: total });
    };

    const handleSave = async () => {
        if (!session?.user) {
            setShowLeadModal(true);
            return;
        }
        const res = await fetch('/api/scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...profile,
                breakEvenPrice: calcBreakEvenPrice(profile.costPerAcre, profile.expectedYield),
            }),
        });
        if (res.ok) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    const breakEven = calcBreakEvenPrice(profile.costPerAcre, profile.expectedYield);
    const totalProd = profile.acres * profile.expectedYield;
    const costCategories: { key: keyof CostBreakdown; label: string; icon: string }[] = [
        { key: 'land', label: 'Land/Rent', icon: '🏠' },
        { key: 'seed', label: 'Seed', icon: '🌱' },
        { key: 'fertilizer', label: 'Fertilizer', icon: '🧪' },
        { key: 'chemical', label: 'Chemical', icon: '💧' },
        { key: 'insurance', label: 'Insurance', icon: '🛡️' },
        { key: 'equipment', label: 'Equipment', icon: '🚜' },
        { key: 'labor', label: 'Labor', icon: '👷' },
        { key: 'other', label: 'Other', icon: '📦' },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Farm Economics</h1>
                    <p className="page-subtitle">Your operation's cost structure and break-even analysis.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-green btn-sm" onClick={handleSave}>
                        {saved ? '✓ Saved' : '💾 Save Scenario'}
                    </button>
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
                        <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{cat.icon}</span>
                            <div style={{ flex: 1 }}>
                                <label className="input-label">{cat.label}</label>
                                <div className="input-with-prefix">
                                    <span className="input-prefix">$</span>
                                    <input
                                        type="number"
                                        value={profile.costBreakdown?.[cat.key] || 0}
                                        onChange={(e) => updateCost(cat.key, e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total Cost Per Acre</span>
                        <span style={{ fontSize: 24, fontWeight: 700 }}>${profile.costPerAcre.toFixed(2)}</span>
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

            <LeadCaptureModal
                isOpen={showLeadModal}
                onClose={() => setShowLeadModal(false)}
                onSubmit={() => {
                    setShowLeadModal(false);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 3000);
                }}
            />
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
