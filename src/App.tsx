import React from "react";
import { RouterProvider, createBrowserRouter } from "react-router";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

import './index.css';

const Products = React.lazy(() => import("./pages/Products"));
const Transactions = React.lazy(() => import("./pages/Transactions"));

// Layout component that includes Navigation
function Layout({ children }: { children: React.ReactNode; }) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navigation />
            <main>{children}</main>
        </div>
    );
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout><Home /></Layout>,
    },
    {
        path: "/products",
        element: <Layout><Products /></Layout>,
    },
    {
        path: "/transactions",
        element: <Layout><Transactions /></Layout>,
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
        <React.Suspense fallback={
            <div className="flex items-center justify-center h-64">
                Loading...
            </div>
        }>
            <RouterProvider router={router} />
        </React.Suspense>
    );
}