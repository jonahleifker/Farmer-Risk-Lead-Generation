'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Registration failed');
                setLoading(false);
                return;
            }

            // Auto-login after registration
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Account created but login failed. Please sign in manually.');
                setLoading(false);
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">🌱</div>
                    <div className="auth-logo-text">
                        <h1>Farmer Risk</h1>
                        <p>Copilot</p>
                    </div>
                </div>

                <h2 className="auth-title">Create your account</h2>
                <p className="auth-subtitle">Save scenarios, track positions, and more.</p>

                <form onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="input-group">
                        <label className="input-label">Name</label>
                        <input type="text" className="input-field" placeholder="John Doe"
                            value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input type="email" className="input-field" placeholder="you@example.com"
                            value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <input type="password" className="input-field" placeholder="••••••••" minLength={8}
                            value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <button type="submit" className="btn btn-green" disabled={loading}
                        style={{ width: '100%', marginTop: 8 }}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-link">
                    Already have an account? <Link href="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
