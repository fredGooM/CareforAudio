'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent, useEffect } from 'react';
import Logo from '@/components/Logo';

const QUICK_LOGINS: Record<string, { email: string; password: string }> = {
    admin:   { email: 'admin@careformance.com',   password: 'admin' },
    teacher: { email: 'teacher@careformance.com', password: 'admin' },
    athlete: { email: 'athlete@careformance.com', password: 'admin' },
};

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        const ql = searchParams.get('quicklogin');
        if (!ql || !QUICK_LOGINS[ql]) return;
        const { email, password } = QUICK_LOGINS[ql];
        signIn('credentials', { email, password, redirect: false }).then(result => {
            if (!result?.error) { router.push('/'); router.refresh(); }
        });
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError('Email ou mot de passe incorrect');
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Logo size={60} /></div>
                    <h1>Careformance Audio</h1>
                    <p>Connectez-vous à votre espace</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="login-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@careformance.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                            />
                            <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="login-button">
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
}
