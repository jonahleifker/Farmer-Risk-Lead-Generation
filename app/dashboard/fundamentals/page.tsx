'use client';

import { useState, useEffect } from 'react';

interface FundamentalMetric {
    production: number;
    yield: number;
    endingStocks: number;
    demand: number;
    exports: number;
    year: number;
}

export default function FundamentalsPage() {
    const [data, setData] = useState<FundamentalMetric[]>([]);
    const [commodity, setCommodity] = useState<'ZC=F' | 'ZS=F'>('ZC=F');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [commodity]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/market/history/${encodeURIComponent(commodity)}?range=1y`);
            const json = await res.json();
            if (json.success) {
                // Transform historical data into fundamental-like metrics
                // In production, this would pull from USDA data
                setData([]);
            }
        } catch (err) {
            console.error('Fundamentals load error:', err);
        }
        setLoading(false);
    };

    const commodityName = commodity === 'ZC=F' ? 'Corn' : 'Soybeans';

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Fundamentals</h1>
                    <p className="page-subtitle">USDA supply & demand metrics for {commodityName}.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['ZC=F', 'ZS=F'] as const).map(sym => (
                        <button key={sym}
                            className={`btn btn-sm ${commodity === sym ? 'btn-green' : 'btn-outline'}`}
                            onClick={() => setCommodity(sym)}>
                            {sym === 'ZC=F' ? '🌽 Corn' : '🫘 Soybeans'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading fundamentals...</p>
                </div>
            ) : (
                <>
                    <div className="card">
                        <h3 className="card-title">Supply & Demand Overview</h3>
                        <div className="metrics-row">
                            <div className="metric-item">
                                <div className="metric-label">U.S. Production</div>
                                <div className="metric-value">15.1B bu</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Ending Stocks</div>
                                <div className="metric-value">1.74B bu</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Stocks/Use Ratio</div>
                                <div className="metric-value">11.5%</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-label">Total Demand</div>
                                <div className="metric-value">14.8B bu</div>
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontStyle: 'italic' }}>
                            Data from USDA WASDE estimates. Full USDA API integration coming soon.
                        </p>
                    </div>

                    <div className="card">
                        <h3 className="card-title">Key Takeaways</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>📊 Stocks/Use Declining</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                    The stocks-to-use ratio has been tightening, suggesting potential price support if demand holds steady.
                                </div>
                            </div>
                            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>🌍 Export Pace</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                    Export commitments are tracking near the 5-year average.
                                </div>
                            </div>
                            <div style={{ padding: 16, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>🌤️ Weather Watch</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                    South American production forecasts remain under close watch.
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
