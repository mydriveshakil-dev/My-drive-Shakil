import React, { useState, useEffect } from 'react';
import { UserAuthProfile } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { loginWithGoogleAuth, getUserProfileFromFirestore } from '../lib/firebase';
import {
  ShieldCheck,
  Smartphone,
  User,
  ArrowRight,
  Lock,
  AlertTriangle,
  Info,
  CheckSquare,
  Square,
  Globe,
} from 'lucide-react';
import { GlassContainer } from './GlassContainer';

interface UaeLoginModalProps {
  isOpen: boolean;
  defaultEmail: string;
  onLoginSuccess: (authData: UserAuthProfile) => void;
}

const SAVED_CREDENTIALS_KEY = 'uae_saved_login_credentials';

export const UaeLoginModal: React.FC<UaeLoginModalProps> = ({
  isOpen,
  defaultEmail,
  onLoginSuccess,
}) => {
  // Form State
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSearchingCloud, setIsSearchingCloud] = useState(false);

  // Load saved credentials on mount / open
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_CREDENTIALS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mobileNumber) setMobileNumber(parsed.mobileNumber);
        if (parsed.password) setUserPassword(parsed.password);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (typeof parsed.rememberMe === 'boolean') setRememberMe(parsed.rememberMe);
      }
    } catch {
      // ignore parse errors
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setIsLoadingGoogle(true);
      setLoginError(null);
      const googleUser = await loginWithGoogleAuth();
      if (googleUser && googleUser.email) {
        triggerHaptic(hapticPatterns.success);
        const isAdmin = googleUser.email.toLowerCase() === 'mydriveshakil@gmail.com';
        onLoginSuccess({
          name: googleUser.displayName || (isAdmin ? 'KAZI MD SHAKIL (App Admin)' : 'Mess Member'),
          email: googleUser.email,
          mobileNumber: mobileNumber.trim() || (isAdmin ? '+971544874028' : '+971500000000'),
          password: userPassword.trim() || 'GoogleAuth',
          idNumber: isAdmin ? 'ADMIN-01' : '',
          identity: null,
          isLoggedIn: true,
          role: isAdmin ? 'admin' : 'user',
        });
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      triggerHaptic(hapticPatterns.error);
      setLoginError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedMobile = mobileNumber.trim();
    const trimmedPass = userPassword.trim();

    if (!trimmedMobile) {
      triggerHaptic(hapticPatterns.error);
      setLoginError('Please enter your Mobile Number.');
      return;
    }

    if (!trimmedPass) {
      triggerHaptic(hapticPatterns.error);
      setLoginError('Please enter your Password.');
      return;
    }

    // Save or clear remembered credentials
    if (rememberMe) {
      localStorage.setItem(
        SAVED_CREDENTIALS_KEY,
        JSON.stringify({
          fullName: fullName.trim(),
          mobileNumber: trimmedMobile,
          password: trimmedPass,
          rememberMe: true,
        })
      );
    } else {
      localStorage.removeItem(SAVED_CREDENTIALS_KEY);
    }

    // Check Admin Credentials: Mobile +971544874028 and Password UAE@@2024
    const cleanDigits = trimmedMobile.replace(/\D/g, '');
    const isAdminMobile =
      cleanDigits === '971544874028' ||
      cleanDigits === '0544874028' ||
      cleanDigits.endsWith('544874028');

    if (isAdminMobile) {
      if (trimmedPass !== 'UAE@@2024') {
        triggerHaptic(hapticPatterns.error);
        setLoginError('Incorrect password entered.');
        return;
      }

      setLoginError(null);
      triggerHaptic(hapticPatterns.success);

      // Authenticate as App Administrator
      onLoginSuccess({
        name: fullName.trim() || 'KAZI MD SHAKIL (App Admin)',
        email: defaultEmail || 'mydriveshakil@gmail.com',
        mobileNumber: trimmedMobile,
        password: trimmedPass,
        idNumber: 'ADMIN-01',
        identity: null,
        isLoggedIn: true,
        role: 'admin',
      });
      return;
    }

    // Cloud Lookup check for multi-device cross login
    setIsSearchingCloud(true);
    const cloudProfile = await getUserProfileFromFirestore(trimmedMobile);
    setIsSearchingCloud(false);

    if (cloudProfile && cloudProfile.password && cloudProfile.password !== trimmedPass) {
      triggerHaptic(hapticPatterns.error);
      setLoginError('Incorrect password for this mobile number.');
      return;
    }

    // General Member Login
    setLoginError(null);
    triggerHaptic(hapticPatterns.success);

    onLoginSuccess({
      name: fullName.trim() || cloudProfile?.name || undefined,
      email: defaultEmail || cloudProfile?.email || 'user@mess.com',
      mobileNumber: trimmedMobile,
      password: trimmedPass,
      idNumber: cloudProfile?.idNumber || '',
      identity: null,
      isLoggedIn: true,
      role: cloudProfile?.role || 'user',
      linkedGroupId: cloudProfile?.linkedGroupId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 max-w-full overflow-x-hidden overflow-y-auto">
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="w-full max-w-lg max-h-[92vh] rounded-3xl border border-white/30 shadow-2xl flex flex-col overflow-hidden relative my-auto box-border"
      >
        {/* Header Banner */}
        <div className="p-4 sm:p-5 border-b border-white/20 bg-emerald-950/60 flex items-center justify-between backdrop-blur-2xl shrink-0 gap-3 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/src/assets/images/uae_mess_logo_1785022712689.jpg"
              alt="UAE MESS SYSTEM Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-amber-400/80 shadow-xl shadow-amber-500/20 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black tracking-wider text-amber-300 uppercase">
                  UAE MESS SYSTEM
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap">
                  Portal Login
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                Member & Admin Portal Access
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 font-medium truncate">
                Log in using Mobile Number & Password
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-white max-w-full">
          <div className="bg-emerald-950/70 border border-emerald-400/30 p-3 rounded-2xl text-xs text-emerald-200 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              Enter your <strong>Mobile Number</strong> and <strong>Password</strong> to access your group. Data automatically syncs across all devices logged into the same account.
            </div>
          </div>

          {/* 1. Name Field (for new registrations) */}
          <div>
            <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#F9A826]" />
              Full Name <span className="text-[10px] text-amber-300 font-normal lowercase">(for new registrations)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mahfuzur Rahman"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setLoginError(null);
              }}
              className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-2xl text-xs sm:text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-xl"
            />
          </div>

          {/* 2. Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#F9A826]" />
              Mobile Number *
            </label>
            <input
              type="tel"
              placeholder="e.g. +971501234567"
              value={mobileNumber}
              onChange={(e) => {
                setMobileNumber(e.target.value);
                setLoginError(null);
              }}
              className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-2xl text-xs sm:text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-xl"
            />
          </div>

          {/* 3. Password */}
          <div>
            <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#F9A826]" />
                Password *
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={userPassword}
                onChange={(e) => {
                  setUserPassword(e.target.value);
                  setLoginError(null);
                }}
                className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-2xl text-xs sm:text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-xl pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-300/90 hover:text-amber-300 cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* 4. Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setRememberMe(!rememberMe);
                triggerHaptic(hapticPatterns.click);
              }}
              className="flex items-center gap-2 text-xs font-bold text-amber-200 hover:text-amber-300 cursor-pointer select-none"
            >
              {rememberMe ? (
                <CheckSquare className="w-4 h-4 text-[#F9A826]" />
              ) : (
                <Square className="w-4 h-4 text-emerald-200/60" />
              )}
              <span>Remember my credentials on this device</span>
            </button>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="bg-rose-950/90 border border-rose-500 p-3.5 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Submit Button inside form for Enter key support */}
          <button type="submit" className="hidden" />
        </form>

        {/* Footer Login Button */}
        <div className="p-4 sm:p-5 bg-emerald-950/80 border-t border-white/20 backdrop-blur-2xl shrink-0">
          <button
            type="button"
            onClick={() => handleLogin()}
            disabled={isSearchingCloud}
            className="w-full bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black py-4 rounded-2xl shadow-xl transition-all text-sm flex items-center justify-center gap-2 border border-white/30 active:scale-98 cursor-pointer ring-2 ring-amber-400/50 disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            <span>{isSearchingCloud ? 'Connecting Cloud...' : 'Login to Mess Portal'}</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>
        </div>
      </GlassContainer>
    </div>
  );
};
