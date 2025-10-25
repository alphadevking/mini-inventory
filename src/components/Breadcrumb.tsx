import React from "react";
import { Link, useLocation } from "react-router";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  name: string;
  path: string;
}

export default function Breadcrumb() {
  const location = useLocation();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { name: "Home", path: "/" }
    ];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Convert segment to readable name
      const name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        name,
        path: currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Don't show breadcrumb on home page
  if (location.pathname === "/") {
    return null;
  }

  return (
    <nav className="flex gap-2 items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
      <Link
        to="/"
        className="flex gap-2 items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.slice(1).map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.path}>
          <ChevronRight className="w-4 h-4" />
          {index === breadcrumbs.length - 2 ? (
            // Last item - not clickable
            <span className="text-gray-900 dark:text-white font-medium">
              {breadcrumb.name}
            </span>
          ) : (
            // Clickable items
            <Link
              to={breadcrumb.path}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {breadcrumb.name}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
