import React from 'react';
import { LayoutDashboard, Zap, PieChart, Users, Plus } from 'lucide-react';
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
  const handleTabClick = (tabId: AppTabType) => {
    triggerHaptic(hapticPatterns.click);
    onSelectTab(tabId);
  };

  const isDashboardActive = activeTab === 'dashboard' || activeTab === 'home';
  const isUtilitiesActive = activeTab === 'utilities';
  const isReportActive = activeTab === 'report';
  const isGroupActive = activeTab === 'group' || activeTab === 'payto';

  return (
    <div className="fixed bottom-3 sm:bottom-5 left-0 right-0 z-40 px-2 sm:px-4 flex flex-col items-center pointer-events-none select-none">
      {/* Ambient soft mint green / pale teal background glow */}
      <div className="absolute inset-x-0 -bottom-6 h-28 bg-emerald-300/20 blur-3xl rounded-full pointer-events-none -z-10" />

      {/* Main floating container with exact curved notch SVG background */}
      <div className="pointer-events-auto relative w-full max-w-lg h-[68px] filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.6)]">
        
        {/* SVG Curved Bar Frame */}
        <svg
          className="absolute inset-0 w-full h-full text-[#1b1b1e]"
          viewBox="0 0 400 68"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          {/* 
            Path geometry with exact center dip cutout (r=22 corners)
          */}
          <path
            d="M 22 0 
               L 150 0 
               C 168 0, 172 34, 200 34 
               C 228 34, 232 0, 250 0 
               L 378 0 
               A 22 22 0 0 1 400 22 
               L 400 44 
               A 22 22 0 0 1 378 66 
               L 22 66 
               A 22 22 0 0 1 0 44 
               L 0 22 
               A 22 22 0 0 1 22 0 Z"
            fill="#1c1c20"
            stroke="#2d2d34"
            strokeWidth="1.2"
          />
        </svg>

        {/* Central Circular Action Button */}
        <div className="absolute left-1/2 -top-3.5 -translate-x-1/2 z-20 flex flex-col items-center">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(hapticPatterns.click);
              onOpenAddExpense();
            }}
            className="w-[48px] h-[48px] sm:w-[50px] sm:h-[50px] rounded-full bg-[#141417] hover:bg-[#1a1a1f] active:scale-90 border-2 border-emerald-500/70 shadow-[0_0_18px_rgba(34,197,94,0.4)] flex items-center justify-center transition-all cursor-pointer ring-4 ring-[#1c1c20]"
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
            className="text-[9px] sm:text-[10px] font-black tracking-tight text-emerald-400 filter drop-shadow-[0_0_6px_rgba(34,197,94,0.6)] mt-0.5 whitespace-nowrap cursor-pointer"
          >
            Add Expense
          </span>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="relative z-10 w-full h-full flex items-center justify-between px-2 sm:px-3">
          
          {/* Left Side: Dashboard & Bills/Rent */}
          <div className="flex-1 flex justify-around items-center h-full pr-4 sm:pr-6">
            
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
                      ? 'text-[#22c55e] filter drop-shadow-[0_0_8px_rgba(34,197,94,0.9)] scale-105'
                      : 'text-white/80 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                    isDashboardActive ? 'text-[#22c55e]' : 'text-slate-300 group-hover:text-white'
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
                      ? 'text-[#22c55e] filter drop-shadow-[0_0_8px_rgba(34,197,94,0.9)] scale-105'
                      : 'text-white/80 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                    isUtilitiesActive ? 'text-[#22c55e]' : 'text-slate-300 group-hover:text-white'
                  }`}
                >
                  Bills/Rent
                </span>
              </div>
            </button>
          </div>

          {/* Center Empty Gap for Dip Button */}
          <div className="w-12 sm:w-14 shrink-0 pointer-events-none" />

          {/* Right Side: Report & Group */}
          <div className="flex-1 flex justify-around items-center h-full pl-4 sm:pl-6">
            
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
                      ? 'text-[#22c55e] filter drop-shadow-[0_0_8px_rgba(34,197,94,0.9)] scale-105'
                      : 'text-white/80 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                    isReportActive ? 'text-[#22c55e]' : 'text-slate-300 group-hover:text-white'
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
                      ? 'text-[#22c55e] filter drop-shadow-[0_0_8px_rgba(34,197,94,0.9)] scale-105'
                      : 'text-white/80 group-hover:text-white filter drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight mt-0.5 whitespace-nowrap transition-colors ${
                    isGroupActive ? 'text-[#22c55e]' : 'text-slate-300 group-hover:text-white'
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




