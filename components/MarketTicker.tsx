'use client';

import { useState, useEffect, useRef } from 'react';

interface TickerQuote {
    symbol: string;
    shortName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
}

const DISPLAY_NAMES: Record<string, { name: string; icon: string }> = {
    'ZC=F': { name: 'Corn', icon: '🌽' },
    'ZS=F': { name: 'Soybeans', icon: '🫘' },
    'ZW=F': { name: 'Wheat', icon: '🌾' },
    'ZM=F': { name: 'Soy Meal', icon: '📦' },
    'ZL=F': { name: 'Soy Oil', icon: '🛢️' },
    'KE=F': { name: 'KC Wheat', icon: '🌿' },
    'ZO=F': { name: 'Oats', icon: '🥣' },
};

export function MarketTicker() {
    const [quotes, setQuotes] = useState<TickerQuote[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [secondsAgo, setSecondsAgo] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchQuotes = async () => {
        try {
            const res = await fetch('/api/market/quotes');
            const json = await res.json();
            if (json.success && json.data) {
                setQuotes(json.data);
                setLastUpdated(new Date());
                setSecondsAgo(0);
            }
        } catch {
            // Silently fail — ticker is supplementary
        }
    };

    useEffect(() => {
        fetchQuotes();
        const refresh = setInterval(fetchQuotes, 60000);
        return () => clearInterval(refresh);
    }, []);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (lastUpdated) {
                setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
            }
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [lastUpdated]);

    if (quotes.length === 0) return null;

    // Show primary commodities first
    const primarySymbols = ['ZC=F', 'ZS=F', 'ZW=F'];
    const sortedQuotes = [
        ...quotes.filter(q => primarySymbols.includes(q.symbol)),
        ...quotes.filter(q => !primarySymbols.includes(q.symbol)),
    ];

    return (
        <div className="ticker-bar">
            <div className="ticker-live-badge">
                <span className="live-dot" />
                <span>LIVE</span>
            </div>
            <div className="ticker-scroll-area">
                {sortedQuotes.map(q => {
                    const display = DISPLAY_NAMES[q.symbol] || { name: q.shortName, icon: '📊' };
                    const price = q.regularMarketPrice / 100;
                    const change = q.regularMarketChange / 100;
                    const pct = q.regularMarketChangePercent;
                    const isUp = change >= 0;
                    return (
                        <div key={q.symbol} className="ticker-item">
                            <span className="ticker-icon">{display.icon}</span>
                            <span className="ticker-name">{display.name}</span>
                            <span className="ticker-price">${price.toFixed(2)}</span>
                            <span className={`ticker-change ${isUp ? 'ticker-up' : 'ticker-down'}`}>
                                {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({Math.abs(pct).toFixed(2)}%)
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="ticker-timestamp">
                {secondsAgo < 5 ? 'Just now' : `${secondsAgo}s ago`}
            </div>
        </div>
    );
}
