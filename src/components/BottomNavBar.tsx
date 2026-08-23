import React from 'react';
import { LayoutGrid, Zap, PieChart, Users, Plus } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export type AppTabType = 'dashboard' | 'home' | 'utilities' | 'report' | 'group' | 'payto' | 'chat';

interface BottomNavBarProps {
  activeTab: AppTabType;
  onSelectTab: (tab: AppTabType) => void;
  onOpenAddExpense: () => void;
  isAddExpenseOpen?: boolean;
  isHidden?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddExpense,
  isAddExpenseOpen = false,
  isHidden = false,
}) => {
  const handleTabClick = (tabId: AppTabType) => {
    triggerHaptic(hapticPatterns.click);
    onSelectTab(tabId);
  };

  const isDashboardActive = activeTab === 'dashboard' || activeTab === 'home';
  const isUtilitiesActive = activeTab === 'utilities';
  const isReportActive = activeTab === 'report';
  const isGroupActive = activeTab === 'group' || activeTab === 'payto';

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[120] flex flex-col items-center pointer-events-none select-none transition-all duration-300 ease-in-out ${
        isHidden ? 'translate-y-36 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Ambient soft blue glow behind the nav bar */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[#1D60FF]/20 blur-3xl pointer-events-none -z-10" />

      {/* Main Bar Container (Height increased 5mm upwards, fixed at bottom) */}
      <div className={`relative w-full max-w-lg h-[calc(72px+5mm)] sm:h-[calc(76px+5mm)] ${isHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}>
        
        {/* SVG Curved Bar Frame Background */}
        <svg
          className="absolute inset-0 w-full h-full filter drop-shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
          viewBox="0 0 400 92"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d={
              isAddExpenseOpen
                ? "M 0 92 L 0 20 C 0 8, 8 0, 22 0 L 378 0 C 392 0, 400 8, 400 20 L 400 92 Z"
                : "M 0 92 L 0 20 C 0 8, 8 0, 22 0 L 142 0 C 160 0, 166 32, 200 32 C 234 32, 240 0, 258 0 L 378 0 C 392 0, 400 8, 400 20 L 400 92 Z"
            }
            fill="#07152D"
            stroke="#132B5E"
            strokeWidth="1.2"
          />
        </svg>

        {/* Central Circular Add Expense Button & Label (Elevated with 5mm top offset) */}
        {!isAddExpenseOpen && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 z-20 flex flex-col items-center">
            {/* Elevated Circular Plus Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onOpenAddExpense();
              }}
              className="-mt-5 w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-full bg-[#07152D] hover:bg-[#0B1E3D] active:scale-90 border-[2.5px] border-[#1D60FF] shadow-[0_0_20px_rgba(29,96,255,0.7)] flex items-center justify-center transition-all cursor-pointer ring-4 ring-[#07152D]"
              title="Add New Expense"
            >
              <div className="relative flex items-center justify-center text-white filter drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]">
                <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3] text-white" />
              </div>
            </button>

            {/* Label: Add Expense */}
            <span
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onOpenAddExpense();
              }}
              className="text-[11px] sm:text-xs font-bold tracking-tight text-white mt-1 whitespace-nowrap cursor-pointer filter drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
            >
              Add Expense
            </span>
          </div>
        )}

        {/* Navigation Tabs Bar - shifted 5mm upwards from bottom */}
        <div className="relative z-10 w-full h-[72px] sm:h-[76px] flex items-center justify-between px-3 sm:px-5">
          
          {/* Left Side: Dashboard & Bills/Rent */}
          <div className={`flex-1 flex justify-around items-center h-full pt-1.5 ${isAddExpenseOpen ? 'px-2' : 'pr-5 sm:pr-8'}`}>
            
            {/* 1. Dashboard */}
            <button
              type="button"
              onClick={() => handleTabClick('dashboard')}
              className="flex flex-col items-center justify-center h-full transition-all cursor-pointer group px-2"
            >
              <div className="relative flex flex-col items-center">
                <LayoutGrid
                  className={`w-[22px] h-[22px] stroke-[2.2] transition-all ${
                    isDashboardActive
                      ? 'text-[#1D60FF] filter drop-shadow-[0_0_10px_rgba(29,96,255,0.9)] scale-105'
                      : 'text-white/90 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]'
                  }`}
                />
                <span
                  className={`text-[11px] sm:text-xs font-bold tracking-tight mt-1 whitespace-nowrap transition-colors ${
                    isDashboardActive
                      ? 'text-[#1D60FF] font-black filter drop-shadow-[0_0_8px_rgba(29,96,255,0.8)]'
                      : 'text-white/90 group-hover:text-white filter drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]'
                  }`}
                >
                  Dashboard
                </span>
              </div>
            </button>

            {/* 2. Bills/Rent */}
            <button
              type="button"
              onClick={() => handleTabClick('utilities')}
              className="flex flex-col items-center justify-center h-full transition-all cursor-pointer group px-2"
            >
              <div className="relative flex flex-col items-center">
                <Zap
                  className={`w-[22px] h-[22px] stroke-[2.2] transition-all ${
                    isUtilitiesActive
                      ? 'text-[#1D60FF] filter drop-shadow-[0_0_10px_rgba(29,96,255,0.9)] scale-105'
                      : 'text-white/90 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]'
                  }`}
                />
                <span
                  className={`text-[11px] sm:text-xs font-bold tracking-tight mt-1 whitespace-nowrap transition-colors ${
                    isUtilitiesActive
                      ? 'text-[#1D60FF] font-black filter drop-shadow-[0_0_8px_rgba(29,96,255,0.8)]'
                      : 'text-white/90 group-hover:text-white filter drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]'
                  }`}
                >
                  Bills/Rent
                </span>
              </div>
            </button>
          </div>

          {/* Center Empty Gap for Dip Button */}
          {!isAddExpenseOpen && <div className="w-14 sm:w-16 shrink-0 pointer-events-none" />}

          {/* Right Side: Report & Group */}
          <div className={`flex-1 flex justify-around items-center h-full pt-1.5 ${isAddExpenseOpen ? 'px-2' : 'pl-5 sm:pl-8'}`}>
            
            {/* 3. Report */}
            <button
              type="button"
              onClick={() => handleTabClick('report')}
              className="flex flex-col items-center justify-center h-full transition-all cursor-pointer group px-2"
            >
              <div className="relative flex flex-col items-center">
                <PieChart
                  className={`w-[22px] h-[22px] stroke-[2.2] transition-all ${
                    isReportActive
                      ? 'text-[#1D60FF] filter drop-shadow-[0_0_10px_rgba(29,96,255,0.9)] scale-105'
                      : 'text-white/90 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]'
                  }`}
                />
                <span
                  className={`text-[11px] sm:text-xs font-bold tracking-tight mt-1 whitespace-nowrap transition-colors ${
                    isReportActive
                      ? 'text-[#1D60FF] font-black filter drop-shadow-[0_0_8px_rgba(29,96,255,0.8)]'
                      : 'text-white/90 group-hover:text-white filter drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]'
                  }`}
                >
                  Report
                </span>
              </div>
            </button>

            {/* 4. Group */}
            <button
              type="button"
              onClick={() => handleTabClick('group')}
              className="flex flex-col items-center justify-center h-full transition-all cursor-pointer group px-2"
            >
              <div className="relative flex flex-col items-center">
                <Users
                  className={`w-[22px] h-[22px] stroke-[2.2] transition-all ${
                    isGroupActive
                      ? 'text-[#1D60FF] filter drop-shadow-[0_0_10px_rgba(29,96,255,0.9)] scale-105'
                      : 'text-white/90 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]'
                  }`}
                />
                <span
                  className={`text-[11px] sm:text-xs font-bold tracking-tight mt-1 whitespace-nowrap transition-colors ${
                    isGroupActive
                      ? 'text-[#1D60FF] font-black filter drop-shadow-[0_0_8px_rgba(29,96,255,0.8)]'
                      : 'text-white/90 group-hover:text-white filter drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]'
                  }`}
                >
                  Group
                </span>
              </div>
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};





