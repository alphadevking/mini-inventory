import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export default function Container({
  children,
  className,
  size = "xl"
}: ContainerProps) {
  const sizeClasses = {
    sm: "max-w-3xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-none"
  };

  return (
    <div className={cn(
      "mx-auto px-4 sm:px-6 lg:px-8 relative",
      sizeClasses[size],
      className
    )}>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
