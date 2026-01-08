'use client';

import { TrendingUp, Briefcase, LineChart, BarChart3, Globe, Home, ShoppingCart } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: 'key-indicators', label: 'Key Indicators', icon: TrendingUp },
  { id: 'inflation', label: 'Inflation', icon: TrendingUp },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'interest-rates', label: 'Interest Rates', icon: LineChart },
  { id: 'economic-growth', label: 'Economic Growth', icon: TrendingUp },
  { id: 'exchange-rates', label: 'Exchange Rates', icon: Globe },
  { id: 'housing', label: 'Housing', icon: Home },
  { id: 'consumer-spending', label: 'Consumer Spending', icon: ShoppingCart },
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="w-[305px] bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-black">FRED Indicators</h1>
        <p className="text-sm text-gray-600 mt-1">Economic Data Dashboard</p>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
              {!isActive && <span className="text-gray-400">›</span>}
              {isActive && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8L8 12L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-5 border-t border-gray-200 text-xs text-gray-500">
        Data provided by Federal Reserve Economic Data (FRED)
      </div>
    </aside>
  );
}
