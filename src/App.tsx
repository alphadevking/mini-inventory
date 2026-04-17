import React, { useMemo } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { RouterProvider, createBrowserRouter, useLocation } from "react-router";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { MantineProvider, createTheme, Container, Box, Center } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';

import { Breadcrumb } from "./components/Breadcrumb";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorDisplay } from "./components/ErrorDisplay";

import './index.css';
import { LoadingState } from "./components/LoadingState";

const theme = createTheme({
    // Primary = indigo (interactive: buttons, focuses, links)
    // Amber is decorative only (sidebar active, brand marks) — handled in CSS
    primaryColor: 'indigo',
    primaryShade: { light: 7, dark: 4 },
    defaultRadius: 'md',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontSmoothing: true,
    headings: {
        fontFamily: "'Manrope', system-ui, sans-serif",
        fontWeight: '800',
    },
    colors: {
        indigo: [
            '#eef2ff',
            '#e0e7ff',
            '#c7d2fe',
            '#a5b4fc',
            '#818cf8',
            '#6366f1',
            '#4f46e5',
            '#4338ca',
            '#3730a3',
            '#312e81',
        ],
    },
    components: {
        Button: {
            defaultProps: { radius: 'md' },
            styles: {
                root: {
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    boxShadow: 'none',
                    transition: 'background-color 160ms ease, border-color 160ms ease',
                },
            },
        },
        Card: {
            defaultProps: { radius: 'md', shadow: 'none' },
            styles: {
                root: {
                    backgroundColor: 'var(--echo-surface)',
                    border: '1px solid var(--echo-border)',
                    boxShadow: 'none',
                    transition: 'border-color 160ms ease',
                },
            },
        },
        Paper: {
            defaultProps: { radius: 'md' },
            styles: {
                root: {
                    backgroundColor: 'var(--echo-surface)',
                    border: '1px solid var(--echo-border)',
                    boxShadow: 'none',
                },
            },
        },
        TextInput: {
            defaultProps: { radius: 'md' },
            styles: {
                input: {
                    backgroundColor: 'var(--echo-surface)',
                    borderColor: 'var(--echo-border-strong)',
                    color: 'var(--echo-text)',
                    boxShadow: 'none',
                    transition: 'border-color 160ms ease',
                },
                label: {
                    fontFamily: "'Inter', sans-serif",
                    color: 'var(--echo-text-2)',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    marginBottom: '6px',
                },
            },
        },
        PasswordInput: {
            defaultProps: { radius: 'md' },
            styles: {
                input: {
                    backgroundColor: 'var(--echo-surface)',
                    borderColor: 'var(--echo-border-strong)',
                    color: 'var(--echo-text)',
                    boxShadow: 'none',
                },
                label: {
                    fontFamily: "'Inter', sans-serif",
                    color: 'var(--echo-text-2)',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    marginBottom: '6px',
                },
            },
        },
        Select: {
            defaultProps: { radius: 'md' },
            styles: {
                input: {
                    backgroundColor: 'var(--echo-surface)',
                    borderColor: 'var(--echo-border-strong)',
                    color: 'var(--echo-text)',
                    boxShadow: 'none',
                },
                label: {
                    fontFamily: "'Inter', sans-serif",
                    color: 'var(--echo-text-2)',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    marginBottom: '6px',
                },
                dropdown: {
                    backgroundColor: 'var(--echo-surface)',
                    border: '1px solid var(--echo-border-strong)',
                    boxShadow: 'none',
                },
            },
        },
        NumberInput: {
            defaultProps: { radius: 'md' },
            styles: {
                input: {
                    backgroundColor: 'var(--echo-surface)',
                    borderColor: 'var(--echo-border-strong)',
                    color: 'var(--echo-text)',
                    boxShadow: 'none',
                },
                label: {
                    fontFamily: "'Inter', sans-serif",
                    color: 'var(--echo-text-2)',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    marginBottom: '6px',
                },
            },
        },
        Textarea: {
            defaultProps: { radius: 'md' },
            styles: {
                input: {
                    backgroundColor: 'var(--echo-surface)',
                    borderColor: 'var(--echo-border-strong)',
                    color: 'var(--echo-text)',
                    boxShadow: 'none',
                },
                label: {
                    fontFamily: "'Inter', sans-serif",
                    color: 'var(--echo-text-2)',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    marginBottom: '6px',
                },
            },
        },
        Badge: {
            defaultProps: { variant: 'light', radius: 'xl' },
            styles: {
                root: {
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.67rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                },
            },
        },
        Modal: {
            defaultProps: { radius: 'lg', centered: true },
            styles: {
                content: {
                    backgroundColor: 'var(--echo-surface)',
                    border: '1px solid var(--echo-border-strong)',
                    boxShadow: 'none',
                },
                header: {
                    backgroundColor: 'transparent',
                    borderBottom: '1px solid var(--echo-border)',
                    paddingBottom: '1rem',
                },
                title: {
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 800,
                    fontSize: '1.125rem',
                    letterSpacing: '-0.02em',
                    color: 'var(--echo-text)',
                },
                overlay: {
                    background: 'rgba(13, 14, 26, 0.45)',
                    backdropFilter: 'blur(4px)',
                },
            },
        },
        Divider: {
            styles: { root: { borderColor: 'var(--echo-border)' } },
        },
        Table: {
            styles: {
                table: { borderCollapse: 'separate', borderSpacing: 0 },
                th: {
                    backgroundColor: 'var(--echo-surface-2)',
                    color: 'var(--echo-text-2)',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--echo-border-strong)',
                    padding: '0.75rem 1rem',
                },
                td: {
                    borderBottom: '1px solid var(--echo-border)',
                    color: 'var(--echo-text)',
                    padding: '0.8rem 1rem',
                    fontSize: '0.875rem',
                },
            },
        },
        Progress: {
            defaultProps: { radius: 'xl' },
            styles: {
                root: {
                    backgroundColor: 'var(--echo-surface-2)',
                    border: 'none',
                    boxShadow: 'none',
                },
            },
        },
        Tooltip: {
            defaultProps: { radius: 'sm', withArrow: true },
            styles: {
                tooltip: {
                    backgroundColor: 'var(--echo-surface-3)',
                    border: '1px solid var(--echo-border-strong)',
                    color: 'var(--echo-text)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    boxShadow: 'none',
                },
            },
        },
        ActionIcon: { defaultProps: { radius: 'md' } },
        ThemeIcon: { defaultProps: { radius: 'md' } },
        Loader: { defaultProps: { color: 'indigo' } },
        NavLink: {
            styles: {
                root: {
                    borderRadius: 'var(--echo-radius-sm)',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    transition: 'background-color 150ms ease, color 150ms ease',
                },
            },
        },
        AppShell: {
            styles: {
                main: { backgroundColor: 'var(--echo-bg)' },
                header: { background: 'transparent', border: 'none' },
                navbar: { background: '#0c0c10', borderRight: '1px solid rgba(255,255,255,0.06)' },
            },
        },
    },
});

const Landing = React.lazy(() => import("./pages/Landing"));
const Products = React.lazy(() => import("./pages/Products"));
const Sales = React.lazy(() => import("./pages/Sales"));
const Repairs = React.lazy(() => import("./pages/Repairs"));
const Expenses = React.lazy(() => import("./pages/Expenses"));
const Returns = React.lazy(() => import("./pages/Returns"));
const Purchases = React.lazy(() => import("./pages/Purchases"));
const Categories = React.lazy(() => import("./pages/Categories"));
const Subcategories = React.lazy(() => import("./pages/Subcategories"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const ERP = React.lazy(() => import("./pages/ERP"));
const Login = React.lazy(() => import("./pages/Login"));
const Users = React.lazy(() => import("./pages/Users"));

function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    const breadcrumbItems = useMemo(() => {
        const pathnames = location.pathname.split('/').filter(Boolean);
        return pathnames.map((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
            return {
                label: value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' '),
                path: to,
            };
        });
    }, [location.pathname]);

    return (
        <Navigation>
            <Container size="xl" py="lg">
                <Breadcrumb items={breadcrumbItems} />
                <Box mt="md">{children}</Box>
            </Container>
        </Navigation>
    );
}

const RouteError = () => (
    <Center style={{ height: '100vh', padding: '2rem' }}>
        <ErrorDisplay
            title="Page Error"
            message="There was a problem loading this page."
            onRetry={() => window.location.reload()}
            onBack={() => (window.location.href = '/')}
            showBack
        />
    </Center>
);

const router = createBrowserRouter([
    { path: "/",          element: <Landing /> },
    { path: "/login",     element: <Login /> },
    { path: "/dashboard", element: <ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/products", element: <ProtectedRoute><Layout><ErrorBoundary><Products /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/sales", element: <ProtectedRoute allowedRoles={['cashier', 'manager', 'admin']}><Layout><ErrorBoundary><Sales /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/repairs", element: <ProtectedRoute allowedRoles={['technician', 'manager', 'admin']}><Layout><ErrorBoundary><Repairs /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/expenses", element: <ProtectedRoute allowedRoles={['manager', 'admin']}><Layout><ErrorBoundary><Expenses /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/returns", element: <ProtectedRoute allowedRoles={['cashier', 'manager', 'admin']}><Layout><ErrorBoundary><Returns /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/purchases", element: <ProtectedRoute allowedRoles={['manager', 'admin']}><Layout><ErrorBoundary><Purchases /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/categories", element: <ProtectedRoute allowedRoles={['manager', 'admin']}><Layout><ErrorBoundary><Categories /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/categories/:categoryId/subcategories", element: <ProtectedRoute allowedRoles={['manager', 'admin']}><Layout><ErrorBoundary><Subcategories /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/analytics", element: <ProtectedRoute allowedRoles={['manager', 'admin']}><Layout><ErrorBoundary><Analytics /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/erp", element: <ProtectedRoute allowedRoles={['admin']}><Layout><ErrorBoundary><ERP /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "/users", element: <ProtectedRoute allowedRoles={['admin', 'manager']}><Layout><ErrorBoundary><Users /></ErrorBoundary></Layout></ProtectedRoute>, errorElement: <RouteError /> },
    { path: "*", element: <NotFound /> },
], { future: {} });

export default function App() {
    return (
        <MantineProvider theme={theme} defaultColorScheme="auto">
            <Notifications position="top-right" />
            <ModalsProvider>
                <AuthProvider>
                    <ErrorBoundary>
                        <React.Suspense fallback={
                            <Center style={{ height: '100vh', backgroundColor: 'var(--echo-bg)' }}>
                                <LoadingState message="Loading Echo..." />
                            </Center>
                        }>
                            <RouterProvider router={router} />
                        </React.Suspense>
                    </ErrorBoundary>
                </AuthProvider>
            </ModalsProvider>
        </MantineProvider>
    );
}
