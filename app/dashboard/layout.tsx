import { Sidebar } from '@/components/Sidebar';
import { MarketTicker } from '@/components/MarketTicker';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1419' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <MarketTicker />
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
