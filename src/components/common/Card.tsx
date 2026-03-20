import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  shadow?: "sm" | "md" | "lg";
}

const shadowClasses = { sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg" };

export function Card({ children, className = "", padding = true, shadow = "sm" }: CardProps) {
  return (
    <div
      className={`bg-white/95 rounded-3xl border border-blue-100 ${shadowClasses[shadow]} shadow-blue-500/10 ${padding ? "p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
