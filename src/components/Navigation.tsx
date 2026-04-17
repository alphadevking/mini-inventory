import React, { useState } from 'react';
import { COMPANY_SHORT } from '../config/app';
import {
  AppShell,
  Group,
  Box,
  Burger,
  Stack,
  Divider,
  Text,
  Avatar,
  Badge,
  ActionIcon,
  Tooltip,
  NavLink,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import {
  ChevronDown,
  Package,
  ShoppingCart,
  Wrench,
  DollarSign,
  RotateCcw,
  FileText,
  Settings,
  BarChart3,
  TrendingUp,
  LogOut,
  Users,
  Sun,
  Moon,
  Zap,
  Building2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router';

/* ── types ─────────────────────────────────────────────────────────── */
interface SubItem  { label: string; path: string }
interface MenuItem {
  label: string;
  icon:  React.ElementType;
  path:  string;
  items: SubItem[];
  roles: string[];
}
interface MenuSection {
  heading?: string;   // undefined = no label
  items:    MenuItem[];
}

interface NavigationProps { children: React.ReactNode }

/* ── color scheme toggle ────────────────────────────────────────────── */
function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computed === 'dark';
  return (
    <Tooltip label={isDark ? 'Light mode' : 'Dark mode'} position="bottom">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="md"
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
        style={{ color: 'var(--echo-text-2)' }}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </ActionIcon>
    </Tooltip>
  );
}

/* ── role badge colors ───────────────────────────────────────────────── */
const ROLE_COLOR: Record<string, string> = {
  admin:      'indigo',
  manager:    'blue',
  technician: 'teal',
  cashier:    'green',
};

/* ── page label lookup ───────────────────────────────────────────────── */
const PAGE_LABELS: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/products':     'Products',
  '/sales':        'Sales',
  '/returns':      'Returns',
  '/repairs':      'Repairs',
  '/expenses':     'Expenses',
  '/purchases': 'Purchases',
  '/analytics':    'Analytics',
  '/erp':          'ERP',
  '/categories':   'Categories',
  '/users':        'Users',
};

function getPageLabel(pathname: string): string {
  if (pathname.includes('/subcategories')) return 'Subcategories';
  return PAGE_LABELS[pathname] ?? PAGE_LABELS[Object.keys(PAGE_LABELS).find(k => k !== '/' && pathname.startsWith(k)) ?? ''] ?? 'Echo';
}

/* ═══════════════════════════════════════════════════════════════════ */
const Navigation: React.FC<NavigationProps> = ({ children }) => {
  const { user, logout }  = useAuth();
  const location          = useLocation();
  const [opened, setOpened]           = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const role      = user?.role ?? '';
  const isManager = role === 'manager' || role === 'admin';

  /* ── menu structure with sections ─────────────────────────────── */
  const allSections: MenuSection[] = [
    {
      items: [
        { label: 'Dashboard', icon: BarChart3, path: '/dashboard', items: [], roles: ['admin','manager','technician','cashier'] },
      ],
    },
    {
      heading: 'Operations',
      items: [
        {
          label: 'Products', icon: Package, path: '/products',
          items: isManager
            ? [{ label: 'All Products', path: '/products' }, { label: 'Categories', path: '/categories' }]
            : [],
          roles: ['admin','manager','technician','cashier'],
        },
        { label: 'Sales',    icon: ShoppingCart, path: '/sales',    items: [], roles: ['admin','manager','cashier'] },
        { label: 'Returns',  icon: RotateCcw,    path: '/returns',  items: [], roles: ['admin','manager','cashier'] },
        { label: 'Repairs',  icon: Wrench,       path: '/repairs',  items: [], roles: ['admin','manager','technician'] },
      ],
    },
    {
      heading: 'Finance',
      items: [
        { label: 'Expenses',     icon: DollarSign, path: '/expenses',     items: [], roles: ['admin','manager'] },
        { label: 'Purchases',    icon: FileText,   path: '/purchases',    items: [], roles: ['admin','manager'] },
      ],
    },
    {
      heading: 'Insights',
      items: [
        { label: 'Analytics', icon: TrendingUp, path: '/analytics', items: [], roles: ['admin','manager'] },
        { label: 'ERP',       icon: Settings,   path: '/erp',       items: [], roles: ['admin'] },
      ],
    },
  ];

  /* filter each section by role, drop empty sections */
  const sections = allSections
    .map(s => ({ ...s, items: s.items.filter(i => role && i.roles.includes(role)) }))
    .filter(s => s.items.length > 0);

  const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  /* ── render a single nav item ──────────────────────────────────── */
  const renderItem = (item: MenuItem) => {
    const Icon      = item.icon;
    const active    = isActive(item.path);
    const hasChildren = item.items.length > 0;
    const isExpanded  = expandedItem === item.label;

    if (hasChildren) {
      return (
        <Box key={item.label}>
          <NavLink
            label={item.label}
            leftSection={<Icon size={16} />}
            rightSection={
              <ChevronDown
                size={13}
                style={{
                  transform:  isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease',
                  opacity:    0.45,
                }}
              />
            }
            active={active}
            onClick={() => setExpandedItem(isExpanded ? null : item.label)}
          />
          {isExpanded && (
            <Stack gap={1} mt={2} style={{ paddingLeft: '0.75rem' }}>
              {item.items.map(sub => (
                <NavLink
                  key={sub.label}
                  component={Link}
                  to={sub.path}
                  label={sub.label}
                  active={location.pathname === sub.path}
                  style={{ fontSize: '0.8125rem' }}
                />
              ))}
            </Stack>
          )}
        </Box>
      );
    }

    return (
      <NavLink
        key={item.label}
        component={Link}
        to={item.path}
        label={item.label}
        leftSection={<Icon size={16} />}
        active={active}
      />
    );
  };

  const pageLabel = getPageLabel(location.pathname);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 264, breakpoint: 'sm', collapsed: { mobile: !opened, desktop: false } }}
      padding="md"
    >
      {/* ══════════════════════════════════════════════════════════════
          HEADER — Split: dark brand zone (264px) + content zone
         ══════════════════════════════════════════════════════════════ */}
      <AppShell.Header className="echo-header" style={{ display: 'flex' }}>

        {/* ── Brand zone ──────────────────────────────────────────── */}
        <div className="echo-header-brand">
          <Group gap="sm" wrap="nowrap" style={{ width: '100%', height: '100%' }}>
            <Burger
              opened={opened}
              onClick={() => setOpened(o => !o)}
              hiddenFrom="sm"
              size="sm"
              color="rgba(255,255,255,0.6)"
            />
            <Group gap={9} wrap="nowrap" style={{ userSelect: 'none', flex: 1 }}>
              <Box
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Zap size={16} color="#0c0c10" fill="#0c0c10" />
              </Box>
              <Box style={{ minWidth: 0 }}>
                <Text
                  fw={800} size="sm"
                  style={{ fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.03em', lineHeight: 1, color: '#f0f0fa' }}
                >
                  Echo
                </Text>
                <Text
                  size="xs"
                  style={{ color: 'rgba(255,255,255,0.26)', lineHeight: 1.3, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  Mini Inventory
                </Text>
              </Box>
            </Group>
          </Group>
        </div>

        {/* ── Content zone ────────────────────────────────────────── */}
        <div className="echo-header-content">
          <Group justify="space-between" style={{ width: '100%' }} wrap="nowrap">

            {/* Current page label */}
            <Text
              fw={700}
              size="sm"
              visibleFrom="sm"
              style={{
                fontFamily:    "'Manrope', sans-serif",
                letterSpacing: '-0.02em',
                color:         'var(--echo-text)',
              }}
            >
              {pageLabel}
            </Text>

            {/* Right controls */}
            <Group gap="xs" wrap="nowrap">
              <ColorSchemeToggle />

              {user && (
                <>
                  <Divider
                    orientation="vertical"
                    style={{ height: 22, borderColor: 'var(--echo-border)' }}
                  />

                  <Avatar
                    size={28}
                    radius="sm"
                    style={{
                      background:  'linear-gradient(135deg, var(--echo-amber) 0%, var(--echo-primary) 100%)',
                      color:       '#fff',
                      fontFamily:  "'Manrope', sans-serif",
                      fontWeight:  800,
                      fontSize:    '0.7rem',
                      flexShrink:  0,
                    }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>

                  <Box visibleFrom="sm" style={{ minWidth: 0 }}>
                    <Text
                      size="xs"
                      fw={700}
                      style={{
                        fontFamily:    "'Manrope', sans-serif",
                        color:         'var(--echo-text)',
                        lineHeight:    1,
                        whiteSpace:    'nowrap',
                        overflow:      'hidden',
                        textOverflow:  'ellipsis',
                        maxWidth:      140,
                      }}
                    >
                      {user.full_name || user.username}
                    </Text>
                    <Text size="xs" style={{ color: 'var(--echo-text-3)', lineHeight: 1.4 }}>
                      {user.email}
                    </Text>
                  </Box>

                  <Badge
                    color={ROLE_COLOR[user.role] ?? 'indigo'}
                    variant="light"
                    size="sm"
                    visibleFrom="md"
                  >
                    {user.role}
                  </Badge>

                  <Tooltip label="Sign out" position="bottom">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="md"
                      onClick={logout}
                      style={{ color: 'var(--echo-text-2)' }}
                    >
                      <LogOut size={16} />
                    </ActionIcon>
                  </Tooltip>
                </>
              )}
            </Group>
          </Group>
        </div>
      </AppShell.Header>

      {/* ══════════════════════════════════════════════════════════════
          SIDEBAR — Always dark, amber active, section grouping
         ══════════════════════════════════════════════════════════════ */}
      <AppShell.Navbar className="echo-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Company identifier — top of sidebar */}
        <Box
          px="sm"
          py="xs"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink:   0,
          }}
        >
          <Group gap={8} wrap="nowrap">
            <Box
              style={{
                width:           30,
                height:          30,
                borderRadius:    6,
                background:      'rgba(251,191,36,0.12)',
                border:          '1px solid rgba(251,191,36,0.18)',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                flexShrink:      0,
              }}
            >
              <Building2 size={15} color="#fbbf24" />
            </Box>
            <Box style={{ minWidth: 0 }}>
              <Text
                size="xs"
                fw={700}
                style={{
                  fontFamily:    "'Manrope', sans-serif",
                  color:         '#f0f0fa',
                  lineHeight:    1,
                  whiteSpace:    'nowrap',
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                }}
              >
                {COMPANY_SHORT}
              </Text>
              <Text
                size="xs"
                style={{
                  color:    'rgba(255,255,255,0.28)',
                  fontSize: '0.68rem',
                  lineHeight: 1.4,
                }}
              >
                Enterprises
              </Text>
            </Box>
          </Group>
        </Box>

        {/* Scrollable nav area */}
        <Box style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.5rem 0' }}>
          <Stack gap={0}>
            {sections.map((section, si) => (
              <Box key={si} mb="sm">
                {section.heading && (
                  <Text
                    size="xs"
                    fw={700}
                    px="xs"
                    mb={4}
                    style={{
                      color:          'rgba(255,255,255,0.22)',
                      letterSpacing:  '0.08em',
                      textTransform:  'uppercase',
                      fontSize:       '0.65rem',
                      marginTop:      si === 0 ? 0 : '0.25rem',
                    }}
                  >
                    {section.heading}
                  </Text>
                )}
                <Stack gap={1}>
                  {section.items.map(renderItem)}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Bottom — Users link + user identity card */}
        <Box
          style={{
            flexShrink:   0,
            padding:      '0 0.5rem 0.5rem',
            borderTop:    '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {user && (user.role === 'admin' || user.role === 'manager') && (
            <Box pt="xs">
              <NavLink
                component={Link}
                to="/users"
                label="Users"
                leftSection={<Users size={16} />}
                active={location.pathname === '/users'}
              />
            </Box>
          )}

          {/* User identity footer */}
          {user && (
            <Box
              mt="xs"
              px="xs"
              py="sm"
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '0.625rem',
                borderTop:      '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Avatar
                size={32}
                radius="sm"
                style={{
                  background:  'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                  color:       '#0c0c10',
                  fontFamily:  "'Manrope', sans-serif",
                  fontWeight:  800,
                  fontSize:    '0.75rem',
                  flexShrink:  0,
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>

              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  size="xs"
                  fw={700}
                  style={{
                    fontFamily:    "'Manrope', sans-serif",
                    color:         'var(--echo-sidebar-text)',
                    lineHeight:    1,
                    overflow:      'hidden',
                    textOverflow:  'ellipsis',
                    whiteSpace:    'nowrap',
                  }}
                >
                  {user.full_name || user.username}
                </Text>
                <Text
                  size="xs"
                  style={{
                    color:          'var(--echo-sidebar-text-muted)',
                    lineHeight:     1.5,
                    textTransform:  'capitalize',
                  }}
                >
                  {user.role}
                </Text>
              </Box>

              <Tooltip label="Sign out" position="top">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={logout}
                  style={{ color: 'var(--echo-sidebar-text-muted)', flexShrink: 0 }}
                >
                  <LogOut size={14} />
                </ActionIcon>
              </Tooltip>
            </Box>
          )}
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
};

export default Navigation;
