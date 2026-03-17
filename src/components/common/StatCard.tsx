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
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 flex items-center gap-4 cursor-default"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
        <p className="text-2xl font-serif font-bold text-gray-900">{value}</p>
      </div>
    </motion.div>
  );
}
