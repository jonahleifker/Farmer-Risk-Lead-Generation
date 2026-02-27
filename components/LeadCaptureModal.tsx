'use client';

import { useState } from 'react';

interface LeadCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (email: string) => void;
}

export function LeadCaptureModal({ isOpen, onClose, onSubmit }: LeadCaptureModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'save-scenario' }),
            });

            if (!res.ok) throw new Error('Failed to save');
            onSubmit(email);
        } catch {
            setError('Something went wrong. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Save Your Scenario</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                    Enter your email to save this scenario and access it later.
                    You can also create a full account to manage multiple scenarios.
                </p>
                <form onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}
                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <input
                            type="email"
                            className="input-field"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-green" disabled={loading}
                        style={{ width: '100%', marginTop: 8 }}>
                        {loading ? 'Saving...' : 'Save Scenario'}
                    </button>
                    <div className="auth-link">
                        <a href="/register">Or create a full account →</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
