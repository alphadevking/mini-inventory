import React, { useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Menu, X, ChevronDown, Package, ShoppingCart, Wrench, DollarSign, RotateCcw, FileText, Settings, BarChart3, TrendingUp } from "lucide-react";

export default function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isActiveGroup = (paths: string[]) => {
    return paths.some(path => location.pathname.startsWith(path));
  };

  const navigationItems: Array<{
    name: string;
    path?: string;
    icon?: React.ComponentType<any>;
    items?: Array<{ name: string; path: string; icon: React.ComponentType<any> }>;
  }> = [
    {
      name: "Home",
      path: "/"
    },
    {
      name: "Inventory",
      icon: Package,
      items: [
        { name: "Products", path: "/products", icon: Package },
        { name: "Categories", path: "/categories", icon: Settings },
      ]
    },
    {
      name: "Sales",
      icon: ShoppingCart,
      items: [
        { name: "Sales", path: "/sales", icon: ShoppingCart },
        { name: "Transactions", path: "/transactions", icon: FileText },
      ]
    },
    {
      name: "Services",
      icon: Wrench,
      items: [
        { name: "Repairs", path: "/repairs", icon: Wrench },
        { name: "Returns", path: "/returns", icon: RotateCcw },
      ]
    },
    {
      name: "Finance",
      icon: DollarSign,
      items: [
        { name: "Expenses", path: "/expenses", icon: DollarSign },
      ]
    },
    {
      name: "Analytics",
      icon: BarChart3,
      items: [
        { name: "Analytics", path: "/analytics", icon: BarChart3 },
        { name: "ERP Dashboard", path: "/erp", icon: TrendingUp },
      ]
    }
  ];

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  GadgetHub
              </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Inventory Management</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              if (item.path) {
                // Single item
                return (
            <Link
                    key={item.name}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/80"
                    }`}
                  >
                    {item.name}
            </Link>
                );
              } else {
                // Dropdown item
                const Icon = item.icon;
                return (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`px-4 py-2 h-auto text-sm font-medium transition-all duration-200 ${
                          isActiveGroup(item.items?.map(i => i.path) || [])
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/80"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {Icon && <Icon className="w-4 h-4" />}
                          <span>{item.name}</span>
                          <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                      {item.items?.map((subItem, index) => {
                        const SubIcon = subItem.icon;
                        return (
                          <React.Fragment key={subItem.name}>
                            <DropdownMenuItem asChild>
            <Link
                                to={subItem.path}
                                className={`flex items-center w-full px-3 py-2 text-sm transition-all duration-200 rounded-md ${
                                  isActive(subItem.path)
                                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 dark:from-blue-900/50 dark:to-indigo-900/50 dark:text-blue-300"
                                    : "text-gray-700 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-700/80"
                                }`}
                              >
                                <SubIcon className="w-4 h-4 mr-3" />
                                {subItem.name}
            </Link>
                            </DropdownMenuItem>
                            {index < (item.items?.length || 0) - 1 && <DropdownMenuSeparator />}
                          </React.Fragment>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
            })}
          </div>

          {/* Auth Section */}
          <div className="flex gap-2 items-center space-x-4">
            {/* User info - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">U</span>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                User
              </span>
            </div>

            {/* Auth Buttons - hidden on mobile */}
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Login
              </Button>
              <Button size="sm">
                Sign Up
              </Button>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden transition-all duration-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 shadow-lg">
            <div className="px-4 pt-4 pb-6 space-y-2">
              {navigationItems.map((item) => {
                if (item.path) {
                  // Single item
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive(item.path)
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                          : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/80"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  );
                } else {
                  // Group with sub-items
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex gap-2 items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300">
                        {Icon && <Icon className="w-4 h-4 mr-2" />}
                        {item.name}
                      </div>
                      <div className="pl-6 space-y-1">
                        {item.items?.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.path}
                              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                                isActive(subItem.path)
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : "text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                              }`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <SubIcon className="w-4 h-4 mr-2 inline" />
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              })}

              {/* Mobile Auth Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2 items-center space-x-2 px-3 py-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">U</span>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    User
                  </span>
                </div>
                <div className="flex gap-2 flex-col space-y-2 px-3 pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Login
                  </Button>
                  <Button size="sm" className="w-full">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
          </div>
        )}
      </div>
    </nav>
  );
}