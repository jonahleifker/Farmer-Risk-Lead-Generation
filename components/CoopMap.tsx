'use client';

import { useEffect, useState, useRef } from 'react';

interface FacilityLocation {
    facility: string;
    company: string;
    city: string | null;
    state: string | null;
    lat: number;
    lon: number;
    commodity: string;
}

export default function CoopMap() {
    const [locations, setLocations] = useState<FacilityLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        fetch('/api/grain-bids/locations')
            .then(r => r.json())
            .then(data => {
                setLocations(data.locations || []);
                setTotal(data.total || 0);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (locations.length === 0 || !mapRef.current || mapInstance.current) return;

        // Dynamically import Leaflet to avoid SSR issues
        const initMap = async () => {
            const L = (await import('leaflet')).default;
            // @ts-ignore - CSS import for Leaflet
            await import('leaflet/dist/leaflet.css');

            const map = L.map(mapRef.current!, {
                center: [42.0, -94.0], // Center of Midwest
                zoom: 5,
                scrollWheelZoom: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 18,
            }).addTo(map);

            // Custom marker icon
            const cornIcon = L.divIcon({
                className: 'coop-marker',
                html: '<div style="width:12px;height:12px;background:#22c55e;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
            });

            const soyIcon = L.divIcon({
                className: 'coop-marker',
                html: '<div style="width:12px;height:12px;background:#eab308;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
            });

            for (const loc of locations) {
                const icon = loc.commodity === 'corn' ? cornIcon : soyIcon;
                L.marker([loc.lat, loc.lon], { icon })
                    .addTo(map)
                    .bindPopup(`
                        <div style="font-family:system-ui;min-width:150px">
                            <strong style="font-size:13px">${loc.facility}</strong><br/>
                            <span style="font-size:12px;color:#666">${loc.city || ''}${loc.state ? ', ' + loc.state : ''}</span><br/>
                            <span style="font-size:11px;color:#888">${loc.company}</span><br/>
                            <span style="font-size:11px;padding:2px 6px;border-radius:4px;background:${loc.commodity === 'corn' ? '#dcfce7' : '#fef9c3'};color:${loc.commodity === 'corn' ? '#166534' : '#854d0e'}">${loc.commodity}</span>
                        </div>
                    `);
            }

            mapInstance.current = map;

            // Fix map size after render
            setTimeout(() => map.invalidateSize(), 100);
        };

        initMap();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [locations]);

    // Compute state stats
    const stateStats = locations.reduce((acc, loc) => {
        if (loc.state) {
            acc[loc.state] = (acc[loc.state] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return (
        <div>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div style={{
                        width: 30, height: 30, border: '3px solid rgba(34,197,94,0.15)',
                        borderTop: '3px solid #22c55e', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <span style={{ fontSize: 24, fontWeight: 700 }}>{total}</span>
                            <span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 8 }}>grain elevator locations</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 10, height: 10, background: '#22c55e', borderRadius: '50%' }} />
                                Corn
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 10, height: 10, background: '#eab308', borderRadius: '50%' }} />
                                Soybeans
                            </div>
                        </div>
                    </div>

                    <div
                        ref={mapRef}
                        style={{
                            width: '100%',
                            height: 450,
                            borderRadius: 12,
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                        }}
                    />

                    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.entries(stateStats)
                            .sort((a, b) => b[1] - a[1])
                            .map(([state, count]) => (
                                <div key={state} style={{
                                    padding: '4px 10px', borderRadius: 6,
                                    background: 'rgba(34, 197, 94, 0.08)',
                                    border: '1px solid rgba(34, 197, 94, 0.2)',
                                    fontSize: 12, color: 'var(--text-secondary)',
                                }}>
                                    <strong>{state}</strong> — {count} locations
                                </div>
                            ))}
                    </div>
                </>
            )}
        </div>
    );
}
