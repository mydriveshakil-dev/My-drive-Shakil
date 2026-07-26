import React from 'react';
import { LayoutDashboard, Home, Zap, PieChart, Users, Plus } from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { motion } from 'motion/react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export type AppTabType = 'dashboard' | 'home' | 'utilities' | 'report' | 'group';

interface BottomNavBarProps {
  activeTab: AppTabType;
  onSelectTab: (tab: AppTabType) => void;
  onOpenAddExpense: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddExpense,
}) => {
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'utilities' as const, label: 'Bills/Rent', icon: Zap },
    { id: 'report' as const, label: 'Report', icon: PieChart },
    { id: 'group' as const, label: 'Group', icon: Users },
  ];

  const handleTabClick = (tabId: AppTabType) => {
    triggerHaptic(hapticPatterns.click);
    onSelectTab(tabId);
  };

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 px-2 sm:px-4 flex flex-col items-center pointer-events-none">
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="pointer-events-auto w-full max-w-xl rounded-full p-1.5 sm:p-2 border border-white/30 shadow-2xl shadow-emerald-950/60"
      >
        <div className="flex items-center justify-around relative px-1 sm:px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-2 sm:px-3 rounded-full transition-all relative cursor-pointer ${
                  isActive ? 'text-[#0B4A3F] font-black' : 'text-emerald-100/70 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomTabPill"
                    className="absolute inset-0 bg-[#F9A826] rounded-full shadow-lg shadow-amber-500/30 border border-white/40"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                  <span className="text-[9px] sm:text-[10px] font-black mt-0.5 tracking-tight">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </GlassContainer>
    </div>
  );
};


