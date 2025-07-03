import React from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MI</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Mini Inventory
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/")
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              }`}
            >
              Home
            </Link>
            <Link
              to="/products"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/products")
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              }`}
            >
              Products
            </Link>
            <Link
              to="/transactions"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/transactions")
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              }`}
            >
              Transactions
            </Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {/* Placeholder for user info */}
            <div className="hidden md:flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">U</span>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                User
              </span>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Login
              </Button>
              <Button size="sm">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}