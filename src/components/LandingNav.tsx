import React from 'react';
import { Link } from 'react-router';
import {
    Box,
    Group,
    Text,
    Button,
    Container,
    Divider,
    Avatar,
    Skeleton,
} from '@mantine/core';
import { Zap, LayoutDashboard, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* always-dark palette — landing pages are dark regardless of system theme */
const C = {
    bg:          'rgba(11,12,19,0.82)',
    border:      'rgba(255,255,255,0.08)',
    text:        '#eeeffe',
    text2:       '#8892b2',
    amber:       '#fbbf24',
    amberDim:    '#d97706',
    amberBg:     'rgba(251,191,36,0.11)',
    amberBorder: 'rgba(251,191,36,0.22)',
    indigo:      '#818cf8',
    indigoBg:    'rgba(129,140,248,0.12)',
} as const;

const NAV_LINKS = [
    { label: 'Features',     href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
];

export function LandingNav() {
    const { user, isAuthenticated, isLoading } = useAuth();

    return (
        <Box
            component="header"
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: C.bg,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${C.border}`,
            }}
        >
            <Container size="xl">
                <Group justify="space-between" h={64} wrap="nowrap">

                    {/* ── Logo ──────────────────────────────────────────── */}
                    <Group gap={10} wrap="nowrap" style={{ userSelect: 'none', flexShrink: 0 }}>
                        <Box
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Zap size={17} color="#0c0c10" fill="#0c0c10" />
                        </Box>
                        <Box>
                            <Text
                                fw={800}
                                size="sm"
                                style={{
                                    fontFamily: "'Manrope', sans-serif",
                                    letterSpacing: '-0.03em',
                                    lineHeight: 1,
                                    color: '#f0f0fa',
                                }}
                            >
                                Echo
                            </Text>
                            <Text
                                size="xs"
                                style={{ color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em', lineHeight: 1.2 }}
                            >
                                Mini Inventory
                            </Text>
                        </Box>
                    </Group>

                    {/* ── Right side ────────────────────────────────────── */}
                    <Group gap="lg" wrap="nowrap">

                        {/* Nav links — always visible on desktop */}
                        <Group gap="xl" visibleFrom="sm" wrap="nowrap">
                            {NAV_LINKS.map(({ label, href }) => (
                                <Text
                                    key={label}
                                    component="a"
                                    href={href}
                                    size="sm"
                                    fw={500}
                                    style={{
                                        color: C.text2,
                                        textDecoration: 'none',
                                        transition: 'color 160ms ease',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = C.text2)}
                                >
                                    {label}
                                </Text>
                            ))}
                        </Group>

                        {/* Auth-aware CTA */}
                        {isLoading ? (
                            /* Resolving — show neutral skeleton to avoid flash */
                            <Skeleton height={34} width={110} radius={8} />
                        ) : isAuthenticated && user ? (
                            /* Authenticated — show user info + Dashboard button */
                            <>
                                <Divider
                                    orientation="vertical"
                                    visibleFrom="sm"
                                    style={{ borderColor: C.border, height: 22 }}
                                />
                                <Group gap="sm" wrap="nowrap" visibleFrom="sm">
                                    <Avatar
                                        size={30}
                                        radius="md"
                                        style={{
                                            background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                                            color: '#0c0c10',
                                            fontFamily: "'Manrope', sans-serif",
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {user.username.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box style={{ minWidth: 0 }}>
                                        <Text
                                            size="xs"
                                            fw={700}
                                            style={{
                                                color: '#f0f0fa',
                                                fontFamily: "'Manrope', sans-serif",
                                                lineHeight: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: 130,
                                            }}
                                        >
                                            {user.full_name || user.username}
                                        </Text>
                                        <Text size="xs" style={{ color: 'rgba(255,255,255,0.30)', lineHeight: 1.4 }}>
                                            {user.role}
                                        </Text>
                                    </Box>
                                </Group>
                                <Button
                                    component={Link}
                                    to="/dashboard"
                                    size="sm"
                                    leftSection={<LayoutDashboard size={15} />}
                                    style={{
                                        background: C.amber,
                                        color: '#0c0c10',
                                        fontWeight: 700,
                                        fontFamily: "'Inter', sans-serif",
                                        border: 'none',
                                        boxShadow: 'none',
                                        borderRadius: 8,
                                    }}
                                >
                                    Dashboard
                                </Button>
                            </>
                        ) : (
                            /* Unauthenticated — Sign In button */
                            <>
                                <Divider
                                    orientation="vertical"
                                    visibleFrom="sm"
                                    style={{ borderColor: C.border, height: 22 }}
                                />
                                <Button
                                    component={Link}
                                    to="/login"
                                    size="sm"
                                    leftSection={<LogIn size={15} />}
                                    style={{
                                        background: C.amber,
                                        color: '#0c0c10',
                                        fontWeight: 700,
                                        fontFamily: "'Inter', sans-serif",
                                        border: 'none',
                                        boxShadow: 'none',
                                        borderRadius: 8,
                                    }}
                                >
                                    Sign In
                                </Button>
                            </>
                        )}
                    </Group>
                </Group>
            </Container>
        </Box>
    );
}
