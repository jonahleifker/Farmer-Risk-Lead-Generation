'use client';

import { useState } from 'react';

interface FundamentalMetric {
    production: number;
    yield: number;
    endingStocks: number;
    demand: number;
    exports: number;
    year: number;
}

type MetricKey = 'endingStocks' | 'yield' | 'production' | 'demand' | 'exports';

const METRICS: { label: string; key: MetricKey; icon: string }[] = [
    { label: 'Ending Stocks', key: 'endingStocks', icon: '📦' },
    { label: 'USDA Yield', key: 'yield', icon: '⚡' },
    { label: 'Production', key: 'production', icon: '🌾' },
    { label: 'Total Demand', key: 'demand', icon: '🛒' },
    { label: 'Exports', key: 'exports', icon: '🌍' },
];

const VERIFIED_DATA: Record<string, FundamentalMetric[]> = {
    corn: [
        { year: 2025, yield: 186.5, production: 17020, endingStocks: 2127, demand: 13170, exports: 3300 },
        { year: 2024, yield: 179.3, production: 14892, endingStocks: 1540, demand: 14900, exports: 2325 },
        { year: 2023, yield: 177.3, production: 15342, endingStocks: 2172, demand: 14850, exports: 2100 },
        { year: 2022, yield: 173.4, production: 13651, endingStocks: 1360, demand: 14100, exports: 1661 },
        { year: 2021, yield: 177.0, production: 15115, endingStocks: 1540, demand: 14930, exports: 2471 },
        { year: 2020, yield: 171.4, production: 14182, endingStocks: 1235, demand: 14500, exports: 2747 },
    ],
    soybeans: [
        { year: 2025, yield: 53.0, production: 4262, endingStocks: 350, demand: 4700, exports: 1900 },
        { year: 2024, yield: 50.7, production: 4366, endingStocks: 380, demand: 4600, exports: 1850 },
        { year: 2023, yield: 50.6, production: 4165, endingStocks: 342, demand: 4400, exports: 1700 },
        { year: 2022, yield: 49.6, production: 4270, endingStocks: 264, demand: 4350, exports: 1992 },
        { year: 2021, yield: 51.4, production: 4440, endingStocks: 350, demand: 4450, exports: 2160 },
        { year: 2020, yield: 51.0, production: 4216, endingStocks: 256, demand: 3950, exports: 2265 },
    ],
};

export default function FundamentalsPage() {
    const [commodity, setCommodity] = useState<'corn' | 'soybeans'>('corn');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [chartMetric, setChartMetric] = useState<MetricKey>('endingStocks');

    const data = VERIFIED_DATA[commodity];
    const current = data[selectedIndex];
    const previous = data[selectedIndex + 1];
    const commodityName = commodity === 'corn' ? 'Corn' : 'Soybeans';

    const getYearLabel = (year: number) => `${year}/${(year + 1).toString().slice(-2)}`;

    const formatValue = (key: MetricKey, val: number) => {
        if (key === 'yield') return `${val} bu/ac`;
        if (val >= 1000) return `${(val / 1000).toFixed(2)}B bu`;
        return `${val}M bu`;
    };

    const getTrend = (key: MetricKey) => {
        if (!current || !previous) return 'neutral';
        if (current[key] > previous[key]) return 'up';
        if (current[key] < previous[key]) return 'down';
        return 'neutral';
    };

    const trendIcon = (key: MetricKey) => {
        const t = getTrend(key);
        if (t === 'up') return '↑';
        if (t === 'down') return '↓';
        return '→';
    };

    const trendColor = (key: MetricKey) => {
        const t = getTrend(key);
        if (t === 'up') return 'var(--accent-green)';
        if (t === 'down') return 'var(--accent-red)';
        return 'var(--text-muted)';
    };

    // Chart calculation
    const chartData = [...data].sort((a, b) => a.year - b.year);
    const maxVal = Math.max(...chartData.map(d => d[chartMetric])) * 1.15;
    const chartWidth = 800;
    const chartHeight = 250;
    const padding = 50;

    return (
        <div className="page-container" style={{ maxWidth: 1100 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{commodityName} Fundamentals</h1>
                    <p className="page-subtitle">USDA Supply &amp; Demand Estimates</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['corn', 'soybeans'] as const).map(c => (
                        <button key={c}
                            className={`btn btn-sm ${commodity === c ? 'btn-green' : 'btn-outline'}`}
                            onClick={() => { setCommodity(c); setSelectedIndex(0); }}>
                            {c === 'corn' ? '🌽 Corn' : '🫘 Soybeans'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Year Selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {data.map((d, i) => (
                    <button key={d.year}
                        onClick={() => setSelectedIndex(i)}
                        style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', border: '1px solid',
                            background: selectedIndex === i ? 'rgba(34, 197, 94, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                            borderColor: selectedIndex === i ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)',
                            color: selectedIndex === i ? 'var(--accent-green)' : 'var(--text-secondary)',
                            transition: 'all 0.2s',
                        }}>
                        {getYearLabel(d.year)}
                    </button>
                ))}
            </div>

            {/* Interactive Chart */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>📈</span>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>Historical Trend</h3>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {METRICS.map(m => (
                            <button key={m.key}
                                onClick={() => setChartMetric(m.key)}
                                style={{
                                    padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                                    cursor: 'pointer', border: 'none',
                                    background: chartMetric === m.key ? 'rgba(34, 197, 94, 0.1)' : 'rgba(30, 41, 59, 0.3)',
                                    color: chartMetric === m.key ? 'var(--accent-green)' : 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                }}>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', maxWidth: chartWidth, height: 'auto' }}>
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                            const y = chartHeight - padding - (chartHeight - padding * 2) * p;
                            return (
                                <g key={i}>
                                    <line x1={padding} y1={y} x2={chartWidth - padding} y2={y}
                                        stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
                                    <text x={padding - 6} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                                        {formatValue(chartMetric, Math.round(maxVal * p))}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Bars */}
                        {chartData.map((d, i) => {
                            const barWidth = (chartWidth - padding * 2) / chartData.length * 0.65;
                            const spacing = (chartWidth - padding * 2) / chartData.length;
                            const x = padding + i * spacing + (spacing - barWidth) / 2;
                            const h = (chartHeight - padding * 2) * (d[chartMetric] / maxVal);
                            const y = chartHeight - padding - h;
                            const isActive = d.year === current?.year;

                            return (
                                <g key={d.year} style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedIndex(data.findIndex(dd => dd.year === d.year))}>
                                    <rect x={x} y={y} width={barWidth} height={h}
                                        fill={isActive ? '#22c55e' : 'rgba(30, 41, 59, 0.8)'}
                                        rx="4" style={{ transition: 'fill 0.2s' }} />
                                    <text x={x + barWidth / 2} y={chartHeight - padding + 18}
                                        fill={isActive ? '#f1f5f9' : '#94a3b8'}
                                        fontSize="10" fontWeight={isActive ? 'bold' : 'normal'}
                                        textAnchor="middle">
                                        {getYearLabel(d.year)}
                                    </text>
                                    {isActive && (
                                        <text x={x + barWidth / 2} y={y - 8}
                                            fill="#22c55e" fontSize="10" fontWeight="bold" textAnchor="middle">
                                            {formatValue(chartMetric, d[chartMetric])}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="metrics-row" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
                {METRICS.map(m => (
                    <div key={m.key} className="metric-item" style={{ minWidth: 160 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div className="metric-label">{m.icon} {m.label}</div>
                            <span style={{ color: trendColor(m.key), fontSize: 14, fontWeight: 700 }}>
                                {trendIcon(m.key)}
                            </span>
                        </div>
                        <div className="metric-value" style={{ fontSize: 20 }}>
                            {formatValue(m.key, current ? current[m.key] : 0)}
                        </div>
                        {previous && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                vs {getYearLabel(previous.year)}: {formatValue(m.key, previous[m.key])}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Analysis */}
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 18 }}>📊</span>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
                        Market Analysis ({getYearLabel(current?.year || 0)})
                    </h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                    {current?.endingStocks > (previous?.endingStocks || 0)
                        ? `Ending stocks are projected to increase to ${formatValue('endingStocks', current.endingStocks)}, which may put downward pressure on prices if demand doesn't keep pace.`
                        : `Tightening ending stocks (${formatValue('endingStocks', current?.endingStocks || 0)}) suggest a supportive environment for prices, especially if export demand remains strong.`}
                    {' '}
                    The yield estimate of {current?.yield} bu/ac for the {getYearLabel(current?.year || 0)} marketing year is {current?.yield > (previous?.yield || 0) ? 'higher' : 'lower'} than the previous year.
                    {Math.abs((current?.yield || 0) - (previous?.yield || 0)) > 5
                        ? ' This significant shift in yield will likely be a primary driver for price discovery in the coming months.'
                        : ' This suggests relative stability in production efficiency.'}
                </p>
            </div>
        </div>
    );
}
