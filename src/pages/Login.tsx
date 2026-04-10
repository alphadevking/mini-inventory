import React, { useState, useEffect } from 'react';
import { COMPANY_NAME, APP_NAME, APP_VERSION } from '../config/app';
import { useNavigate, useLocation, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';
import { AuthResponse } from '../types/auth';
import {
    Button,
    TextInput,
    PasswordInput,
    Title,
    Text,
    Stack,
    Box,
    Anchor,
} from '@mantine/core';
import { toast } from '../components/Toast';
import { LogIn, Zap, ShieldCheck, Package, TrendingUp } from 'lucide-react';

const FEATURES = [
    { icon: Package,     label: 'Live inventory',     sub: "Know exactly what's in stock at all times" },
    { icon: TrendingUp,  label: 'Revenue analytics',  sub: 'Daily, monthly, and trend-based reports' },
    { icon: ShieldCheck, label: 'Secure access',       sub: 'Every team member sees only what they need' },
];

export default function Login() {
    const [username, setUsername]           = useState('');
    const [password, setPassword]           = useState('');
    const [isLoading, setIsLoading]         = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate     = useNavigate();
    const location     = useLocation();
    const from         = location.state?.from?.pathname || '/dashboard';

    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, isAuthLoading, navigate, from]);

    const validateUsername = (u: string) => u.trim().length >= 3;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUsernameError('');
        setPasswordError('');

        if (!username)                    { setUsernameError('Please enter your username'); return; }
        if (!validateUsername(username))  { setUsernameError('Username must be at least 3 characters'); return; }
        if (!password)                    { setPasswordError('Please enter your password'); return; }

        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const data = await apiRequest<AuthResponse>('/api/auth/login', {
                method:  'POST',
                body:    params,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            login(data);
            toast.success('Welcome back!');
            navigate(from, { replace: true });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Invalid username or password';
            setPasswordError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box style={{ minHeight: '100vh', display: 'flex' }}>

            {/* ── Left panel — always dark, Echo branding ─────────────────── */}
            <Box
                style={{
                    width: '44%',
                    minHeight: '100vh',
                    background: '#0c0c10',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '2.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}
                visibleFrom="md"
            >
                {/* Ambient glows — give depth to the dark panel */}
                <Box
                    style={{
                        position: 'absolute',
                        top: '-8%',
                        left: '-12%',
                        width: 380,
                        height: 380,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(251,191,36,0.10) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <Box
                    style={{
                        position: 'absolute',
                        bottom: '5%',
                        right: '-15%',
                        width: 320,
                        height: 320,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(129,140,248,0.09) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />

                {/* Top — logo */}
                <Box style={{ position: 'relative', zIndex: 1 }}>
                    <Box style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', userSelect: 'none', marginBottom: '0.75rem' }}>
                        <Box
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Zap size={20} color="#0c0c10" fill="#0c0c10" />
                        </Box>
                        <Box>
                            <Text
                                fw={800}
                                size="md"
                                style={{ fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.03em', lineHeight: 1, color: '#f0f0fa' }}
                            >
                                Echo
                            </Text>
                            <Text size="xs" style={{ color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
                                Mini Inventory
                            </Text>
                        </Box>
                    </Box>
                    <Box
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.3rem 0.75rem',
                            borderRadius: 6,
                            background: 'rgba(251,191,36,0.10)',
                            border: '1px solid rgba(251,191,36,0.20)',
                        }}
                    >
                        <Text size="xs" fw={600} style={{ color: '#fbbf24', letterSpacing: '0.03em' }}>
                            {COMPANY_NAME}
                        </Text>
                    </Box>
                </Box>

                {/* Middle — headline */}
                <Box style={{ position: 'relative', zIndex: 1 }}>
                    <Title
                        order={2}
                        fw={800}
                        style={{
                            fontFamily: "'Manrope', sans-serif",
                            fontSize: '2rem',
                            letterSpacing: '-0.04em',
                            lineHeight: 1.15,
                            color: '#eeeffe',
                            marginBottom: '0.75rem',
                        }}
                    >
                        Inventory, simplified.
                    </Title>
                    <Text size="sm" style={{ color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, maxWidth: 320, marginBottom: '2.5rem' }}>
                        One workspace for products, sales, repairs, and full business analytics.
                    </Text>

                    {/* Feature list */}
                    <Stack gap="lg">
                        {FEATURES.map(({ icon: Icon, label, sub }) => (
                            <Box key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                                <Box
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: 'rgba(251,191,36,0.12)',
                                        border: '1px solid rgba(251,191,36,0.18)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: 2,
                                    }}
                                >
                                    <Icon size={17} color="#fbbf24" />
                                </Box>
                                <Box>
                                    <Text size="sm" fw={700} style={{ color: '#eeeffe', lineHeight: 1, fontFamily: "'Manrope', sans-serif", marginBottom: 3 }}>
                                        {label}
                                    </Text>
                                    <Text size="xs" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                                        {sub}
                                    </Text>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Box>

                {/* Bottom — version tag */}
                <Box style={{ position: 'relative', zIndex: 1 }}>
                    <Text size="xs" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>
                        {APP_NAME} · {APP_VERSION}
                    </Text>
                </Box>
            </Box>

            {/* ── Right panel — form, solid white / dark ──────────────────── */}
            <Box
                style={{
                    flex: 1,
                    minHeight: '100vh',
                    background: 'var(--echo-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                }}
            >
                <Box
                    style={{ width: '100%', maxWidth: 400 }}
                    className="echo-fade-up"
                >
                    {/* Mobile-only logo */}
                    <Box
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            marginBottom: '2rem',
                            userSelect: 'none',
                        }}
                        hiddenFrom="md"
                    >
                        <Box
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Zap size={18} color="#0c0c10" fill="#0c0c10" />
                        </Box>
                        <Text
                            fw={800}
                            size="md"
                            style={{ fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.03em', color: 'var(--echo-text)' }}
                        >
                            Echo
                        </Text>
                    </Box>

                    {/* Heading */}
                    <Box mb="xl">
                        <Title
                            order={1}
                            fw={800}
                            style={{
                                fontFamily: "'Manrope', sans-serif",
                                fontSize: '1.875rem',
                                letterSpacing: '-0.04em',
                                lineHeight: 1.1,
                                color: 'var(--echo-text)',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Welcome back
                        </Title>
                        <Text size="sm" style={{ color: 'var(--echo-text-2)' }}>
                            Sign in to your workspace
                        </Text>
                    </Box>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <Stack gap="md">
                            <TextInput
                                label="Username"
                                placeholder="Enter your username"
                                required
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); if (usernameError) setUsernameError(''); }}
                                error={usernameError}
                                disabled={isLoading}
                                autoComplete="username"
                            />

                            <PasswordInput
                                label="Password"
                                placeholder="Enter your password"
                                required
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
                                error={passwordError}
                                disabled={isLoading}
                                autoComplete="current-password"
                            />

                            <Button
                                type="submit"
                                fullWidth
                                mt="sm"
                                size="md"
                                loading={isLoading}
                                leftSection={<LogIn size={17} />}
                                style={{ boxShadow: 'none' }}
                            >
                                Sign In
                            </Button>
                        </Stack>
                    </form>

                    <Text size="xs" ta="center" mt="xl" style={{ color: 'var(--echo-text-3)' }}>
                        New operator?{' '}
                        <Anchor
                            component={Link}
                            to="/register"
                            fw={600}
                            style={{ color: 'var(--echo-primary)' }}
                        >
                            Request access
                        </Anchor>
                    </Text>
                </Box>
            </Box>
        </Box>
    );
}
