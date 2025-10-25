import React, { useState, useEffect } from "react";
import { useFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { usePageState } from "@/hooks/usePageState";
import {
  Package,
  Wrench,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  BarChart3,
  Plus
} from "lucide-react";
import { Link, useNavigate } from "react-router";

interface DashboardStats {
  total_products: number;
  low_stock_products: number;
  total_repairs: number;
  pending_repairs: number;
  completed_repairs: number;
  total_transactions: number;
  total_expenses: number;
  monthly_revenue: number;
  monthly_profit: number;
}

export default function Home() {
  const { data: stats, loading, error, refetch } = useFetch<DashboardStats>("/api/analytics/dashboard/stats");
  const { isRefreshing, handleRefresh } = usePageState();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (error) {
    return (
      <ErrorState
        title="Error Loading Dashboard"
        description={`Failed to load dashboard stats: ${error.message}`}
        onRetry={refetch}
        isRetrying={isRefreshing}
      />
    );
  }

  if (loading) {
    return (
      <LoadingState
        title="Dashboard"
        description="Loading your business overview..."
        cardCount={4}
        showCharts={true}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="GadgetHub Dashboard"
        description="Welcome to your comprehensive gadget inventory and repair management system"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link to="/products">
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Add Product</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">New gadget inventory</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/repairs">
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">New Repair</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customer service</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/transactions">
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200/50 dark:border-purple-700/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">New Transaction</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sale or purchase</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/expenses">
          <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200/50 dark:border-red-700/50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Add Expense</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Track costs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Products</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats?.total_products || 0}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stats?.low_stock_products || 0} low stock items
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-green-50/50 dark:from-gray-800 dark:to-green-900/20 border-green-200/50 dark:border-green-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Repairs</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Wrench className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stats?.total_repairs || 0}</div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                <Clock className="h-3 w-3 mr-1" />
                {stats?.pending_repairs || 0} pending
              </Badge>
              <Badge variant="default" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats?.completed_repairs || 0} completed
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-800 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Revenue</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              ${stats?.monthly_revenue?.toLocaleString() || "0"}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ${stats?.monthly_profit?.toLocaleString() || "0"} profit
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-800 dark:to-indigo-900/20 border-indigo-200/50 dark:border-indigo-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Transactions</CardTitle>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats?.total_transactions || 0}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ${stats?.total_expenses?.toLocaleString() || "0"} expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Low Stock Alerts</span>
            </CardTitle>
            <CardDescription>
              Products that need restocking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.low_stock_products ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.low_stock_products} products are running low on stock
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/products">View Products</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400">
                All products are well stocked! 🎉
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span>Pending Repairs</span>
            </CardTitle>
            <CardDescription>
              Repairs awaiting completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.pending_repairs ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.pending_repairs} repairs are in progress
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/repairs">View Repairs</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-green-600 dark:text-green-400">
                No pending repairs! 🎉
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <span>Inventory Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage your phone parts inventory with real-time stock tracking,
              low stock alerts, and comprehensive product information.
            </p>
            <Button asChild>
              <Link to="/products">Manage Products</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center space-x-2">
              <Wrench className="h-5 w-5 text-green-500" />
              <span>Repair Services</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Track customer repairs from intake to completion with detailed
              status updates, parts tracking, and payment management.
            </p>
            <Button asChild>
              <Link to="/repairs">Manage Repairs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <span>Financial Tracking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Monitor sales, purchases, expenses, and profits with detailed
              financial reports and analytics.
            </p>
            <Button asChild>
              <Link to="/transactions">View Transactions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <span>Customer Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage customer information, track repair history, and handle
              returns and refunds efficiently.
            </p>
            <Button variant="outline" asChild>
              <Link to="/returns">Manage Returns</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-red-500" />
              <span>Expense Tracking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Track business expenses by category, upload receipts, and
              maintain detailed financial records.
            </p>
            <Button variant="outline" asChild>
              <Link to="/expenses">Track Expenses</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <span>Analytics & Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Generate comprehensive reports on sales, profits, inventory
              turnover, and business performance metrics.
            </p>
            <Button variant="outline" asChild>
              <Link to="/analytics">View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}