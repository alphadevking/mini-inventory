import React from 'react';
import { COMPANY_NAME, APP_NAME } from '../config/app';
import { Link } from 'react-router';
import {
    Box,
    Group,
    Text,
    Title,
    Button,
    SimpleGrid,
    Stack,
    Badge,
    Container,
} from '@mantine/core';
import {
    Zap,
    Package,
    ShoppingCart,
    Wrench,
    DollarSign,
    TrendingUp,
    RotateCcw,
    ArrowRight,
    CheckCircle,
} from 'lucide-react';
import { LandingNav } from '../components/LandingNav';

/* ── palette — always dark ─────────────────────────────────────────── */
const C = {
    bg:          '#0b0c13',
    surface:     'rgba(255,255,255,0.04)',
    surface2:    'rgba(255,255,255,0.07)',
    border:      'rgba(255,255,255,0.08)',
    borderHover: 'rgba(255,255,255,0.16)',
    text:        '#eeeffe',
    text2:       '#8892b2',
    text3:       '#484e68',
    amber:       '#fbbf24',
    amberDim:    '#d97706',
    amberBg:     'rgba(251,191,36,0.11)',
    amberBorder: 'rgba(251,191,36,0.22)',
    indigo:      '#818cf8',
    indigoBg:    'rgba(129,140,248,0.12)',
} as const;

/* ── feature cards ─────────────────────────────────────────────────── */
const FEATURES = [
    {
        icon: Package,
        title: 'Inventory control',
        desc: 'Track every product the business stocks and sells. Real-time quantities, low-stock alerts, and a full category tree keep the shelves accurate.',
        color: C.amber,
        bg: C.amberBg,
    },
    {
        icon: ShoppingCart,
        title: 'Sales & POS',
        desc: 'Record every sale your cashiers make, apply discounts, and track pending payments — all from one clean interface.',
        color: C.indigo,
        bg: C.indigoBg,
    },
    {
        icon: Wrench,
        title: 'Repair jobs',
        desc: 'Log device repair tickets, assign technicians, track job status end-to-end, and collect payment on completion.',
        color: '#34d399',
        bg: 'rgba(52,211,153,0.10)',
    },
    {
        icon: TrendingUp,
        title: 'Analytics & ERP',
        desc: 'Management gets full visibility — revenue trends, profit margins, inventory turnover, and business health at a glance.',
        color: '#60a5fa',
        bg: 'rgba(96,165,250,0.10)',
    },
    {
        icon: RotateCcw,
        title: 'Returns',
        desc: 'Handle customer returns cleanly — items are restocked automatically and the ledger stays accurate without manual fixes.',
        color: '#f472b6',
        bg: 'rgba(244,114,182,0.10)',
    },
    {
        icon: DollarSign,
        title: 'Expense tracking',
        desc: 'Log daily operating costs, categorize spend by type, and benchmark expenses against monthly revenue — all in one place.',
        color: '#a78bfa',
        bg: 'rgba(167,139,250,0.10)',
    },
];

/* ── how it works ──────────────────────────────────────────────────── */
const STEPS = [
    {
        number: '01',
        title: 'Stock your products',
        desc: 'Add products to your catalogue with pricing, categories, and stock thresholds. Echo keeps counts accurate automatically as sales and repairs consume inventory.',
    },
    {
        number: '02',
        title: 'Run daily operations',
        desc: 'Your team records sales, processes returns, opens repair tickets, and logs expenses — all from one workspace, in real time.',
    },
    {
        number: '03',
        title: 'Review performance',
        desc: 'Management gets instant access to revenue figures, profit margins, stock turnover, and monthly expense breakdowns whenever they need them.',
    },
];

/* ── stats ─────────────────────────────────────────────────────────── */
const STATS = [
    { value: '₦',      label: 'Revenue tracked in real time', sub: 'Every sale recorded the moment it happens' },
    { value: '360°',   label: 'Business visibility',          sub: 'From stock levels to net profit' },
    { value: 'Zero',   label: 'Missed transactions',          sub: 'Every sale, return & repair is logged' },
    { value: 'Always', label: 'Current stock counts',         sub: 'No more end-of-day manual counting' },
];

/* ═══════════════════════════════════════════════════════════════════ */
export default function Landing() {
    return (
        <Box
            style={{
                minHeight: '100vh',
                background: C.bg,
                color: C.text,
                fontFamily: "'Inter', system-ui, sans-serif",
                overflowX: 'hidden',
            }}
        >
            {/* ── Navbar ───────────────────────────────────────────────────── */}
            <LandingNav />

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <Box
                component="section"
                style={{
                    position: 'relative',
                    minHeight: '92vh',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '5rem 1rem 6rem',
                    overflow: 'hidden',
                }}
            >
                {/* Ambient glows */}
                <Box style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <Box style={{
                        position: 'absolute', top: '-10%', left: '-5%',
                        width: 600, height: 600, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(251,191,36,0.09) 0%, transparent 70%)',
                    }} />
                    <Box style={{
                        position: 'absolute', bottom: '0%', right: '-8%',
                        width: 500, height: 500, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(129,140,248,0.09) 0%, transparent 70%)',
                    }} />
                    <Box style={{
                        position: 'absolute', top: '40%', left: '55%',
                        width: 300, height: 300, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, transparent 70%)',
                    }} />
                </Box>

                <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
                    <Stack align="center" gap={0}>
                        {/* Pill badge */}
                        <Box
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.35rem 1rem',
                                borderRadius: 9999,
                                background: C.amberBg,
                                border: `1px solid ${C.amberBorder}`,
                                marginBottom: '2rem',
                            }}
                        >
                            <Zap size={13} color={C.amber} fill={C.amber} />
                            <Text size="xs" fw={600} style={{ color: C.amber, letterSpacing: '0.04em' }}>
                                {COMPANY_NAME}
                            </Text>
                        </Box>

                        {/* Main headline */}
                        <Title
                            order={1}
                            ta="center"
                            fw={800}
                            style={{
                                fontFamily: "'Manrope', sans-serif",
                                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                                letterSpacing: '-0.045em',
                                lineHeight: 1.05,
                                color: '#eeeffe',
                                maxWidth: 780,
                                marginBottom: '1.5rem',
                            }}
                        >
                            One workspace.{' '}
                            <Box
                                component="span"
                                style={{
                                    background: 'linear-gradient(135deg, #fbbf24 0%, #818cf8 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Every moving part.
                            </Box>
                        </Title>

                        {/* Subtitle */}
                        <Text
                            ta="center"
                            size="lg"
                            style={{
                                color: C.text2,
                                maxWidth: 560,
                                lineHeight: 1.7,
                                marginBottom: '2.5rem',
                            }}
                        >
                            A complete operations platform for {COMPANY_NAME} —
                            products, sales, repairs, expenses, and management analytics,
                            all in one place.
                        </Text>

                        {/* CTAs */}
                        <Group gap="md" mb="5rem">
                            <Button
                                component={Link}
                                to="/login"
                                size="lg"
                                rightSection={<ArrowRight size={18} />}
                                style={{
                                    background: C.amber,
                                    color: '#0c0c10',
                                    fontWeight: 700,
                                    fontFamily: "'Inter', sans-serif",
                                    border: 'none',
                                    boxShadow: 'none',
                                    borderRadius: 10,
                                    paddingLeft: '1.75rem',
                                    paddingRight: '1.75rem',
                                }}
                            >
                                Sign in to Echo
                            </Button>
                            <Button
                                component="a"
                                href="#features"
                                size="lg"
                                variant="outline"
                                style={{
                                    color: C.text2,
                                    borderColor: C.border,
                                    background: 'transparent',
                                    fontFamily: "'Inter', sans-serif",
                                    boxShadow: 'none',
                                    borderRadius: 10,
                                }}
                            >
                                See features
                            </Button>
                        </Group>

                        {/* Hero visual — glass dashboard mockup */}
                        <Box
                            style={{
                                width: '100%',
                                maxWidth: 900,
                                background: 'rgba(255,255,255,0.03)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: `1px solid ${C.border}`,
                                borderRadius: 16,
                                padding: '1.5rem',
                                position: 'relative',
                            }}
                        >
                            {/* Fake window chrome */}
                            <Group gap={6} mb="1.25rem">
                                {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                                    <Box key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.8 }} />
                                ))}
                                <Box
                                    style={{
                                        flex: 1,
                                        height: 24,
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: 6,
                                        marginLeft: 8,
                                    }}
                                />
                            </Group>

                            {/* Illustrative stats row */}
                            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mb="1rem">
                                {[
                                    { label: 'TOTAL PRODUCTS',   val: '—',      color: C.amber },
                                    { label: 'MONTHLY REVENUE',  val: '—',      color: C.indigo },
                                    { label: 'LOW STOCK',        val: '—',      color: '#f87171' },
                                    { label: 'OPEN REPAIRS',     val: '—',      color: '#34d399' },
                                ].map(({ label, val, color }) => (
                                    <Box
                                        key={label}
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${C.border}`,
                                            borderRadius: 10,
                                            padding: '0.875rem',
                                        }}
                                    >
                                        <Text size="xs" fw={600} style={{ color: C.text3, letterSpacing: '0.06em', marginBottom: 4 }}>
                                            {label}
                                        </Text>
                                        <Text fw={800} style={{ fontFamily: "'Manrope', sans-serif", fontSize: '1.5rem', letterSpacing: '-0.04em', color, lineHeight: 1 }}>
                                            {val}
                                        </Text>
                                    </Box>
                                ))}
                            </SimpleGrid>

                            {/* Fake table rows */}
                            <Box style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                                {/* Header */}
                                <Box style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', padding: '0.6rem 1rem', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)' }}>
                                    {['PRODUCT', 'SKU', 'STOCK', 'PRICE'].map((h) => (
                                        <Text key={h} size="xs" fw={700} style={{ color: C.text3, letterSpacing: '0.07em' }}>{h}</Text>
                                    ))}
                                </Box>
                                {[
                                    { name: 'Smart Wireless Headset', sku: 'ELC-001', stock: '—',  price: '₦—', low: false },
                                    { name: 'Premium Phone Case',     sku: 'ACC-017', stock: '—',  price: '₦—', low: false },
                                    { name: 'Portable Power Bank',    sku: 'ELC-038', stock: '—',  price: '₦—', low: false },
                                    { name: 'Bluetooth Speaker',      sku: 'ELC-055', stock: '—',  price: '₦—', low: false },
                                ].map((row, i) => (
                                    <Box
                                        key={row.sku}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 1fr',
                                            gap: '1rem',
                                            padding: '0.75rem 1rem',
                                            borderBottom: i < 3 ? `1px solid rgba(255,255,255,0.04)` : 'none',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text size="sm" fw={600} style={{ color: C.text }}>{row.name}</Text>
                                        <Text size="xs" style={{ color: C.text3, fontFamily: 'monospace' }}>{row.sku}</Text>
                                        <Text size="sm" fw={700} style={{ color: C.text3 }}>{row.stock}</Text>
                                        <Text size="sm" fw={700} style={{ color: C.text }}>{row.price}</Text>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Stack>
                </Container>
            </Box>

            {/* ── Stats strip ─────────────────────────────────────────────── */}
            <Box component="section" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                <Container size="xl">
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={0}>
                        {STATS.map(({ value, label, sub }, i) => (
                            <Box
                                key={label}
                                style={{
                                    padding: '2.5rem 1.5rem',
                                    borderRight: i < 3 ? `1px solid ${C.border}` : 'none',
                                    textAlign: 'center',
                                }}
                            >
                                <Text
                                    fw={800}
                                    style={{
                                        fontFamily: "'Manrope', sans-serif",
                                        fontSize: '2.25rem',
                                        letterSpacing: '-0.045em',
                                        lineHeight: 1,
                                        color: C.amber,
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    {value}
                                </Text>
                                <Text fw={700} size="sm" style={{ color: C.text, marginBottom: 4 }}>{label}</Text>
                                <Text size="xs" style={{ color: C.text3 }}>{sub}</Text>
                            </Box>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* ── Features ─────────────────────────────────────────────────── */}
            <Box component="section" id="features" style={{ padding: '7rem 1rem' }}>
                <Container size="xl">
                    <Stack align="center" mb="4rem" gap="md">
                        <Badge
                            variant="outline"
                            style={{
                                borderColor: C.amberBorder,
                                color: C.amber,
                                background: C.amberBg,
                                fontFamily: "'Inter', sans-serif",
                                letterSpacing: '0.06em',
                                borderRadius: 9999,
                            }}
                        >
                            Features
                        </Badge>
                        <Title
                            order={2}
                            ta="center"
                            fw={800}
                            style={{
                                fontFamily: "'Manrope', sans-serif",
                                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                                letterSpacing: '-0.04em',
                                color: C.text,
                                maxWidth: 560,
                            }}
                        >
                            Everything you need,{' '}
                            <Box component="span" style={{ color: C.text2 }}>nothing you don't.</Box>
                        </Title>
                        <Text ta="center" size="md" style={{ color: C.text2, maxWidth: 500, lineHeight: 1.7 }}>
                            Every tool the team needs — from stocking shelves to filing monthly reports.
                        </Text>
                    </Stack>

                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                        {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
                            <Box
                                key={title}
                                style={{
                                    background: C.surface,
                                    backdropFilter: 'blur(14px)',
                                    WebkitBackdropFilter: 'blur(14px)',
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 14,
                                    padding: '1.75rem',
                                    transition: 'border-color 180ms ease, background 180ms ease',
                                    cursor: 'default',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = C.borderHover;
                                    e.currentTarget.style.background  = C.surface2;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = C.border;
                                    e.currentTarget.style.background  = C.surface;
                                }}
                            >
                                <Box
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 10,
                                        background: bg,
                                        border: `1px solid ${color}22`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '1.25rem',
                                    }}
                                >
                                    <Icon size={20} color={color} />
                                </Box>
                                <Text
                                    fw={800}
                                    size="md"
                                    style={{
                                        fontFamily: "'Manrope', sans-serif",
                                        letterSpacing: '-0.02em',
                                        color: C.text,
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    {title}
                                </Text>
                                <Text size="sm" style={{ color: C.text2, lineHeight: 1.65 }}>
                                    {desc}
                                </Text>
                            </Box>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* ── How it works ─────────────────────────────────────────────── */}
            <Box
                component="section"
                id="how-it-works"
                style={{
                    padding: '6rem 1rem',
                    background: 'rgba(255,255,255,0.015)',
                    borderTop: `1px solid ${C.border}`,
                    borderBottom: `1px solid ${C.border}`,
                }}
            >
                <Container size="xl">
                    <Stack align="center" mb="4rem" gap="md">
                        <Badge
                            variant="outline"
                            style={{
                                borderColor: 'rgba(129,140,248,0.30)',
                                color: C.indigo,
                                background: C.indigoBg,
                                fontFamily: "'Inter', sans-serif",
                                letterSpacing: '0.06em',
                                borderRadius: 9999,
                            }}
                        >
                            How it works
                        </Badge>
                        <Title
                            order={2}
                            ta="center"
                            fw={800}
                            style={{
                                fontFamily: "'Manrope', sans-serif",
                                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                                letterSpacing: '-0.04em',
                                color: C.text,
                                maxWidth: 520,
                            }}
                        >
                            Simple by design,{' '}
                            <Box component="span" style={{ color: C.indigo }}>powerful in practice.</Box>
                        </Title>
                        <Text ta="center" size="md" style={{ color: C.text2, maxWidth: 480, lineHeight: 1.7 }}>
                            Echo is built around the way your business actually operates — not the other way around.
                        </Text>
                    </Stack>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                        {STEPS.map(({ number, title, desc }) => (
                            <Box
                                key={number}
                                style={{
                                    background: C.surface,
                                    backdropFilter: 'blur(14px)',
                                    WebkitBackdropFilter: 'blur(14px)',
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 14,
                                    padding: '2rem',
                                    position: 'relative',
                                }}
                            >
                                <Text
                                    fw={800}
                                    style={{
                                        fontFamily: "'Manrope', sans-serif",
                                        fontSize: '3rem',
                                        letterSpacing: '-0.05em',
                                        lineHeight: 1,
                                        color: 'rgba(251,191,36,0.18)',
                                        marginBottom: '1.25rem',
                                        display: 'block',
                                    }}
                                >
                                    {number}
                                </Text>
                                <Text
                                    fw={800}
                                    size="md"
                                    style={{
                                        fontFamily: "'Manrope', sans-serif",
                                        letterSpacing: '-0.02em',
                                        color: C.text,
                                        marginBottom: '0.625rem',
                                    }}
                                >
                                    {title}
                                </Text>
                                <Text size="sm" style={{ color: C.text2, lineHeight: 1.7 }}>
                                    {desc}
                                </Text>
                            </Box>
                        ))}
                    </SimpleGrid>
                </Container>
            </Box>

            {/* ── CTA banner ───────────────────────────────────────────────── */}
            <Box
                component="section"
                id="pricing"
                style={{ padding: '7rem 1rem', position: 'relative', overflow: 'hidden' }}
            >
                {/* Glow behind CTA */}
                <Box style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 700, height: 400, borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(251,191,36,0.10) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <Container size="md" style={{ position: 'relative', zIndex: 1 }}>
                    <Box
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: `1px solid ${C.amberBorder}`,
                            borderRadius: 20,
                            padding: 'clamp(2.5rem, 5vw, 4rem)',
                            textAlign: 'center',
                        }}
                    >
                        <Box
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.35rem 1rem',
                                borderRadius: 9999,
                                background: C.amberBg,
                                border: `1px solid ${C.amberBorder}`,
                                marginBottom: '1.5rem',
                            }}
                        >
                            <Zap size={13} color={C.amber} fill={C.amber} />
                            <Text size="xs" fw={700} style={{ color: C.amber, letterSpacing: '0.05em' }}>
                                {COMPANY_NAME}
                            </Text>
                        </Box>

                        <Title
                            order={2}
                            fw={800}
                            style={{
                                fontFamily: "'Manrope', sans-serif",
                                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                                letterSpacing: '-0.04em',
                                color: C.text,
                                marginBottom: '1rem',
                            }}
                        >
                            Your business, fully in view.
                        </Title>
                        <Text size="md" style={{ color: C.text2, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 2.5rem' }}>
                            Every sale, every product, every expense — tracked and visible
                            to the right people, in real time. Sign in and see it for yourself.
                        </Text>

                        <Group justify="center" gap="md">
                            <Button
                                component={Link}
                                to="/login"
                                size="lg"
                                rightSection={<ArrowRight size={18} />}
                                style={{
                                    background: C.amber,
                                    color: '#0c0c10',
                                    fontWeight: 700,
                                    fontFamily: "'Inter', sans-serif",
                                    border: 'none',
                                    boxShadow: 'none',
                                    borderRadius: 10,
                                    paddingLeft: '1.75rem',
                                    paddingRight: '1.75rem',
                                }}
                            >
                                Sign in to Echo
                            </Button>
                        </Group>
                    </Box>
                </Container>
            </Box>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <Box
                component="footer"
                style={{
                    borderTop: `1px solid ${C.border}`,
                    padding: '2.5rem 1rem',
                }}
            >
                <Container size="xl">
                    <Group justify="space-between" wrap="wrap" gap="lg">
                        <Group gap={9} style={{ userSelect: 'none' }}>
                            <Box
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 7,
                                    background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Zap size={14} color="#0c0c10" fill="#0c0c10" />
                            </Box>
                            <Text
                                fw={700}
                                size="sm"
                                style={{ fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.02em', color: C.text }}
                            >
                                {APP_NAME}
                            </Text>
                        </Group>

                        <Text size="xs" style={{ color: C.text3 }}>
                            © {new Date().getFullYear()} {COMPANY_NAME}. Powered by {APP_NAME}.
                        </Text>
                    </Group>
                </Container>
            </Box>
        </Box>
    );
}
