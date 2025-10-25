import React from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { RouterProvider, createBrowserRouter } from "react-router";
import Navigation from "./components/Navigation";
import Breadcrumb from "./components/Breadcrumb";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import { Toaster } from "./components/ui/sonner";

import './index.css';

const Products = React.lazy(() => import("./pages/Products"));
const Sales = React.lazy(() => import("./pages/Sales"));
const Repairs = React.lazy(() => import("./pages/Repairs"));
const Expenses = React.lazy(() => import("./pages/Expenses"));
const Returns = React.lazy(() => import("./pages/Returns"));
const Transactions = React.lazy(() => import("./pages/Transactions"));
const Categories = React.lazy(() => import("./pages/Categories"));
const Subcategories = React.lazy(() => import("./pages/Subcategories"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const ERP = React.lazy(() => import("./pages/ERP"));

// Layout component that includes Navigation and Breadcrumb
function Layout({ children }: { children: React.ReactNode; }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <Navigation />
            <Breadcrumb />
            <main className="flex-1 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-blue-100/20 dark:from-gray-800/40 dark:via-transparent dark:to-blue-900/20 pointer-events-none" />
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}

// Error element for routes
const RouteError = () => (
    <div className="flex gap-2 flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Page Error
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
                There was a problem loading this page. Please try again later.
            </p>
            <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
                Return Home
            </button>
        </div>
    </div>
);

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout><Home /></Layout>,
    },
    {
        path: "/products",
        element: <Layout><ErrorBoundary><Products /></ErrorBoundary></Layout>,
        errorElement: <RouteError />,
    },
    {
        path: "/sales",
        element: <Layout><ErrorBoundary><Sales /></ErrorBoundary></Layout>,
        errorElement: <RouteError />,
    },
    {
        path: "/repairs",
        element: <Layout><ErrorBoundary><Repairs /></ErrorBoundary></Layout>,
        errorElement: <RouteError />,
    },
    {
        path: "/expenses",
        element: <Layout><ErrorBoundary><Expenses /></ErrorBoundary></Layout>,
        errorElement: <RouteError />,
    },
    {
        path: "/returns",
        element: <Layout><ErrorBoundary><Returns /></ErrorBoundary></Layout>,
        errorElement: <RouteError />,
    },
            {
          path: "/transactions",
          element: <Layout><ErrorBoundary><Transactions /></ErrorBoundary></Layout>,
          errorElement: <RouteError />,
        },
        {
          path: "/categories",
          element: <Layout><ErrorBoundary><Categories /></ErrorBoundary></Layout>,
          errorElement: <RouteError />,
        },
        {
          path: "/categories/:categoryId/subcategories",
          element: <Layout><ErrorBoundary><Subcategories /></ErrorBoundary></Layout>,
          errorElement: <RouteError />,
        },
        {
          path: "/analytics",
          element: <Layout><ErrorBoundary><Analytics /></ErrorBoundary></Layout>,
          errorElement: <RouteError />,
        },
        {
          path: "/erp",
          element: <Layout><ErrorBoundary><ERP /></ErrorBoundary></Layout>,
          errorElement: <RouteError />,
        },
    {
        path: "*",
        element: <NotFound />,
    },
], {
    future: {}
});

export default function App() {
    return (
        <ErrorBoundary>
            <React.Suspense fallback={
                <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                    <div className="flex flex-col items-center space-y-6">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800"></div>
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 absolute top-0 left-0"></div>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading...</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please wait while we prepare your dashboard</p>
                        </div>
                    </div>
                </div>
            }>
                <RouterProvider router={router} />
                <Toaster />
            </React.Suspense>
        </ErrorBoundary>
    );
}