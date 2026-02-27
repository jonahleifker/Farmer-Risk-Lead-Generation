import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1419' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'auto' }}>
                {children}
            </main>
        </div>
    );
}
