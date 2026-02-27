'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface Scenario {
    id: string;
    name: string;
    commodity: string;
    acres: number;
    costPerAcre: number;
    expectedYield: number;
    breakEvenPrice: number;
    updatedAt: string;
    notes?: string;
}

export default function HistoryPage() {
    const { data: session } = useSession();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session?.user) loadScenarios();
        else setLoading(false);
    }, [session]);

    const loadScenarios = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/scenarios');
            const json = await res.json();
            if (json.scenarios) setScenarios(json.scenarios);
        } catch (err) {
            console.error('Load scenarios error:', err);
        }
        setLoading(false);
    };

    const deleteScenario = async (id: string) => {
        if (!confirm('Delete this scenario?')) return;
        try {
            await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
            setScenarios(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Scenario History</h1>
                    <p className="page-subtitle">Your saved farm scenarios and analysis.</p>
                </div>
            </div>

            {!session?.user ? (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sign In to View History</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Create an account to save and manage your farm scenarios.
                    </p>
                    <a href="/login" className="btn btn-green">Sign In →</a>
                </div>
            ) : loading ? (
                <div className="loading-container">
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading scenarios...</p>
                </div>
            ) : scenarios.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Saved Scenarios</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Go to Farm Economics and save your first scenario.
                    </p>
                    <a href="/dashboard" className="btn btn-green">Go to Farm Economics →</a>
                </div>
            ) : (
                <div className="scenario-list">
                    {scenarios.map(s => (
                        <div key={s.id} className="scenario-item">
                            <div className="scenario-info">
                                <h4>{s.name}</h4>
                                <p>
                                    {s.commodity === 'corn' ? '🌽' : '🫘'} {s.acres} ac · ${s.costPerAcre}/ac · BE: ${s.breakEvenPrice.toFixed(2)}/bu
                                    {' '}· {new Date(s.updatedAt).toLocaleDateString()}
                                </p>
                                {s.notes && <p style={{ marginTop: 4, fontStyle: 'italic' }}>{s.notes}</p>}
                            </div>
                            <div className="scenario-actions">
                                <button className="btn btn-outline btn-sm" onClick={() => {
                                    // Load scenario into localStorage and redirect
                                    localStorage.setItem('farmer_risk_profile', JSON.stringify(s));
                                    window.location.href = '/dashboard';
                                }}>
                                    Load
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteScenario(s.id)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
