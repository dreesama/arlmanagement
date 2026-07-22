import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  description,
}) => {
  return (
    <div className="zen-card p-5 zen-card-hover">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6B65]">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-[#F5F2EC] border border-[#E5E0D8] flex items-center justify-center text-[#C84B31] shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-[#1C1B18] tracking-tight">{value}</div>
        {change && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded ${
              isPositive
                ? 'bg-[#EBF5EF] text-[#2D5A39] border border-[#BCE3C8]'
                : 'bg-[#FDF2F0] text-[#992E1B] border border-[#F8C8C1]'
            }`}
          >
            {isPositive ? '+' : ''}{change}
          </span>
        )}
      </div>
      {description && <p className="text-[11px] text-[#6E6B65] mt-1 font-medium">{description}</p>}
    </div>
  );
};
