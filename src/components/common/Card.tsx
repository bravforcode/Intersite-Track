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
      className={`bg-white rounded-3xl border border-black/5 ${shadowClasses[shadow]} ${padding ? "p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
