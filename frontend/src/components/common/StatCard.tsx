import React from "react";
import { motion } from "motion/react";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  bg: string;
  index?: number;
}

export function StatCard({ title, value, icon, bg, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.05, 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1], // Custom spring-like easing
      }}
      whileHover={{ 
        y: -4, 
        scale: 1.02,
        boxShadow: "0 12px 32px rgba(0,0,0,0.08)" 
      }}
      className="app-surface p-5 rounded-3xl flex items-center gap-4 cursor-default transition-colors duration-300 hover:border-black/10"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider app-soft mb-1">{title}</p>
        <p className="text-2xl font-serif font-bold app-heading">{value}</p>
      </div>
    </motion.div>
  );
}
