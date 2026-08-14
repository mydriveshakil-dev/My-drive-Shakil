import React from 'react';
import { LayoutDashboard, Zap, PieChart, Users, Plus } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export type AppTabType = 'dashboard' | 'home' | 'utilities' | 'report' | 'group' | 'payto';

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
      className={`fixed bottom-3 sm:bottom-5 left-0 right-0 z-[120] px-2 sm:px-4 flex flex-col items-center pointer-events-none select-none transition-all duration-300 ease-in-out ${
        isHidden ? 'translate-y-36 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Ambient soft blue background glow */}
      <div className="absolute inset-x-0 -bottom-6 h-28 bg-[#0052FF]/20 blur-3xl rounded-full pointer-events-none -z-10" />

      {/* Main floating container with exact curved notch SVG background */}
      <div className={`relative w-full max-w-lg h-[68px] filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.6)] ${isHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}>
        
        {/* SVG Curved Bar Frame */}
        <svg
          className="absolute inset-0 w-full h-full text-[#061637]"
          viewBox="0 0 400 68"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          {/* 
            Path geometry: Notch cutout when default, smooth capsule when adding expense
          */}
          <path
            d={
              isAddExpenseOpen
                ? "M 34 0 L 366 0 A 34 34 0 0 1 400 34 A 34 34 0 0 1 366 68 L 34 68 A 34 34 0 0 1 0 34 A 34 34 0 0 1 34 0 Z"
                : "M 34 0 L 150 0 C 168 0, 172 34, 200 34 C 228 34, 232 0, 250 0 L 366 0 A 34 34 0 0 1 400 34 A 34 34 0 0 1 366 68 L 34 68 A 34 34 0 0 1 0 34 A 34 34 0 0 1 34 0 Z"
            }
            fill="#061637"
            stroke="#16316b"
            strokeWidth="1.2"
          />
        </svg>

        {/* Central Circular Action Button - Hidden when on Add Expense page */}
        {!isAddExpenseOpen && (
          <div className="absolute left-1/2 top-1 -translate-x-1/2 z-20 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onOpenAddExpense();
              }}
              className="-mt-6 w-[48px] h-[48px] sm:w-[50px] sm:h-[50px] rounded-full bg-[#071E55] hover:bg-[#0b2866] active:scale-90 border-2 border-[#0052FF] shadow-[0_0_18px_rgba(0,82,255,0.5)] flex items-center justify-center transition-all cursor-pointer ring-4 ring-[#061637]"
              title="Add New Expense (+)"
            >
              <div className="relative flex items-center justify-center text-white filter drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]">
                <Plus className="w-6 h-6 stroke-[3] text-white" />
              </div>
            </button>
            <span
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onOpenAddExpense();
              }}
              className="text-[10px] sm:text-[11px] font-extrabold tracking-tight text-white filter drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] mt-3 whitespace-nowrap cursor-pointer"
            >
              Add Expense
            </span>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="relative z-10 w-full h-full flex items-center justify-between px-2 sm:px-3">
          
          {/* Left Side: Dashboard & Bills/Rent */}
          <div className={`flex-1 flex justify-around items-center h-full ${isAddExpenseOpen ? 'px-1 sm:px-3' : 'pr-4 sm:pr-6'}`}>
            
            {/* 1. Dashboard */}
            <button
              type="button"
              onClick={() => handleTabClick('dashboard')}
              className="flex flex-col items-center justify-center h-full transition-all cursor-pointer group px-1"
            >
              <div className="relative flex flex-col items-center">
                <LayoutDashboard
                  className={`w-5 h-5 stroke-[2.2] transition-all ${
                    isDashboardActive
                      ? 'text-[#0052FF] filter drop-shadow-[0_0_8px_rgba(0,82,255,0.9)] scale-105'
                      : 'text-white/80 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                    isDashboardActive ? 'text-[#0052FF]' : 'text-slate-300 group-hover:text-white'
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
              className="flex flex-col items-center justify-center h-full transition-all cursor-pointer group px-1"
            >
              <div className="relative flex flex-col items-center">
                <Zap
                  className={`w-5 h-5 stroke-[2.2] transition-all ${
                    isUtilitiesActive
                      ? 'text-[#0052FF] filter drop-shadow-[0_0_8px_rgba(0,82,255,0.9)] scale-105'
                      : 'text-white/80 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                    isUtilitiesActive ? 'text-[#0052FF]' : 'text-slate-300 group-hover:text-white'
                  }`}
                >
                  Bills/Rent
                </span>
              </div>
            </button>
          </div>

          {/* Center Empty Gap for Dip Button */}
          {!isAddExpenseOpen && <div className="w-12 sm:w-14 shrink-0 pointer-events-none" />}

          {/* Right Side: Report & Group */}
          <div className={`flex-1 flex justify-around items-center h-full ${isAddExpenseOpen ? 'px-1 sm:px-3' : 'pl-4 sm:pl-6'}`}>
            
            {/* 3. Report */}
            <button
              type="button"
              onClick={() => handleTabClick('report')}
              className="flex flex-col items-center justify-center h-full transition-all cursor-pointer group px-1"
            >
              <div className="relative flex flex-col items-center">
                <PieChart
                  className={`w-5 h-5 stroke-[2.2] transition-all ${
                    isReportActive
                      ? 'text-[#0052FF] filter drop-shadow-[0_0_8px_rgba(0,82,255,0.9)] scale-105'
                      : 'text-white/80 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                    isReportActive ? 'text-[#0052FF]' : 'text-slate-300 group-hover:text-white'
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
              className="flex flex-col items-center justify-center h-full transition-all cursor-pointer group px-1"
            >
              <div className="relative flex flex-col items-center">
                <Users
                  className={`w-5 h-5 stroke-[2.2] transition-all ${
                    isGroupActive
                      ? 'text-[#0052FF] filter drop-shadow-[0_0_8px_rgba(0,82,255,0.9)] scale-105'
                      : 'text-white/80 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                    isGroupActive ? 'text-[#0052FF]' : 'text-slate-300 group-hover:text-white'
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




