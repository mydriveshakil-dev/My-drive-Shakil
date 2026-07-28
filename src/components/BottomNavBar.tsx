import React from 'react';
import { LayoutDashboard, Zap, PieChart, Users, Plus } from 'lucide-react';
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
    { id: 'utilities' as const, label: 'Bills/Rent', icon: Zap },
    { id: 'report' as const, label: 'Report', icon: PieChart },
    { id: 'group' as const, label: 'Group', icon: Users },
  ];

  const handleTabClick = (tabId: AppTabType) => {
    triggerHaptic(hapticPatterns.click);
    onSelectTab(tabId);
  };

  return (
    <div className="fixed bottom-7 left-0 right-0 z-40 px-2 sm:px-4 flex flex-col items-center pointer-events-none">
      {/* Central circular floating action button (+) */}
      <div className="pointer-events-auto mb-2 relative z-50">
        <motion.button
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            triggerHaptic(hapticPatterns.click);
            onOpenAddExpense();
          }}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black hover:bg-slate-800 text-white shadow-xl border-2 border-black flex items-center justify-center transition-all cursor-pointer ring-4 ring-slate-100"
          title="Add New Expense (+)"
        >
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3.2]" />
        </motion.button>
      </div>

      <GlassContainer
        variant="card"
        blur="3xl"
        className="pointer-events-auto w-full max-w-lg rounded-full p-1.5 sm:p-2 border-2 border-black shadow-2xl bg-white text-black"
      >
        <div className="flex items-center justify-around relative px-1 sm:px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-3 sm:px-4 rounded-full transition-all relative cursor-pointer ${
                  isActive ? 'text-white font-black' : 'text-black hover:text-slate-700'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomTabPill"
                    className="absolute inset-0 bg-black rounded-full shadow-lg border border-black"
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



