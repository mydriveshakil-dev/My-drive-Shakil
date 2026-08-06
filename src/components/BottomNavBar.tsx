import React from 'react';
import { LayoutDashboard, Zap, PieChart, Users, Plus, HandCoins } from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export type AppTabType = 'dashboard' | 'home' | 'utilities' | 'report' | 'group' | 'payto';

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
    { id: 'payto' as const, label: 'PAY TO', icon: HandCoins },
  ];

  const handleTabClick = (tabId: AppTabType) => {
    triggerHaptic(hapticPatterns.click);
    onSelectTab(tabId);
  };

  return (
    <div className="fixed bottom-5 left-0 right-0 z-40 px-3 sm:px-4 flex flex-col items-center pointer-events-none">
      {/* Central circular floating action button (+) */}
      <AnimatePresence>
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="pointer-events-auto -mb-4 relative z-50"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onOpenAddExpense();
              }}
              className="w-14 h-14 rounded-full bg-[#0052FF] hover:bg-[#0047E0] text-white shadow-xl shadow-blue-600/40 border border-blue-400/30 flex items-center justify-center transition-all cursor-pointer ring-4 ring-[#F0F4FA]"
              title="Add New Expense (+)"
            >
              <Plus className="w-8 h-8 stroke-[3.2]" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto w-full max-w-lg rounded-full p-2 border border-slate-800 shadow-2xl bg-[#07193F] text-white">
        <div className="flex items-center justify-around relative px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-3 sm:px-4 rounded-2xl transition-all relative cursor-pointer ${
                  isActive ? 'text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomTabPill"
                    className="absolute inset-0 bg-[#0052FF] rounded-2xl shadow-md shadow-blue-600/30 border border-blue-400/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                  <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 tracking-tight">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};



