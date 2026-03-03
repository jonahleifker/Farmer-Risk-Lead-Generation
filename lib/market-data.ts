import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export interface QuoteData {
    symbol: string;
    shortName: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
}

export interface HistoricalPrice {
    date: string;
    close: number;
    open: number;
    high: number;
    low: number;
}

const FALLBACK_QUOTES: QuoteData[] = [
    { symbol: 'ZC=F', shortName: 'Corn Futures', regularMarketPrice: 430, regularMarketChange: 2, regularMarketChangePercent: 0.45 },
    { symbol: 'ZS=F', shortName: 'Soybean Futures', regularMarketPrice: 1150, regularMarketChange: -5, regularMarketChangePercent: -0.43 },
];

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && Date.now() < entry.expiresAt) return entry.data as T;
    cache.delete(key);
    return null;
}

function setCache<T>(key: string, data: T, ttl = CACHE_TTL) {
    cache.set(key, { data, expiresAt: Date.now() + ttl });
}

const AG_SYMBOLS = ['ZC=F', 'ZS=F', 'ZW=F', 'ZM=F', 'ZL=F', 'KE=F', 'ZO=F'];

export async function fetchMarketQuotes(): Promise<QuoteData[]> {
    const cacheKey = 'quotes:ag';
    const cached = getCached<QuoteData[]>(cacheKey);
    if (cached) return cached;

    try {
        const results = await yahooFinance.quote(AG_SYMBOLS);
        const quotes: QuoteData[] = (Array.isArray(results) ? results : [results]).map((q: Record<string, unknown>) => ({
            symbol: q.symbol as string,
            shortName: (q.shortName || q.longName || q.symbol) as string,
            regularMarketPrice: (q.regularMarketPrice as number) || 0,
            regularMarketChange: (q.regularMarketChange as number) || 0,
            regularMarketChangePercent: (q.regularMarketChangePercent as number) || 0,
        }));
        setCache(cacheKey, quotes);
        return quotes;
    } catch (error) {
        console.error('Error fetching market quotes:', error);
        return FALLBACK_QUOTES;
    }
}

export async function fetchHistoricalData(
    symbol: string,
    range: string = '1mo'
): Promise<HistoricalPrice[]> {
    const cacheKey = `history:${symbol}:${range}`;
    const cached = getCached<HistoricalPrice[]>(cacheKey);
    if (cached) return cached;

    try {
        const now = new Date();
        let period1: Date;

        switch (range) {
            case '1d': period1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); break;
            case '5d': period1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); break;
            case '3mo': period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
            case '6mo': period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break;
            case '1y': period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
            case '5y': period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); break;
            default: period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        }

        let interval: '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo';
        switch (range) {
            case '1d': interval = '5m'; break;
            case '5d': interval = '15m'; break;
            case '1mo': interval = '1h'; break;
            case '5y': interval = '1d'; break;
            default: interval = '1d'; break;
        }

        const result = await yahooFinance.chart(symbol, {
            period1,
            period2: now,
            interval,
        });

        const prices: HistoricalPrice[] = result.quotes
            .map((q: Record<string, unknown>) => ({
                date: q.date ? (q.date as Date).toISOString() : '',
                close: (q.close as number) || 0,
                open: (q.open as number) || 0,
                high: (q.high as number) || 0,
                low: (q.low as number) || 0,
            }))
            .filter((q: HistoricalPrice) => q.close !== 0);

        setCache(cacheKey, prices, range === '1d' ? 60000 : 300000);
        return prices;
    } catch (error) {
        console.error('Error fetching historical data:', error);
        return [];
    }
}
