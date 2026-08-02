import React, { useState, useEffect } from 'react';
import { UserAuthProfile, Group, Member } from '../types';
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
import uaeMessLogo from '../assets/images/uae_mess_logo_1785022712689.jpg';

interface UaeLoginModalProps {
  isOpen: boolean;
  defaultEmail: string;
  allGroups?: Group[];
  onLoginSuccess: (authData: UserAuthProfile) => void;
}

const SAVED_CREDENTIALS_KEY = 'uae_saved_login_credentials';

function cleanPhone(p?: string): string {
  if (!p) return '';
  return p.replace(/\D/g, '');
}

function isPhoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const c1 = cleanPhone(p1);
  const c2 = cleanPhone(p2);
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  if (c1.length >= 7 && c2.length >= 7) {
    return c1.slice(-7) === c2.slice(-7);
  }
  return false;
}

function isNameMatch(inputName: string, registeredName: string): boolean {
  if (!inputName || !registeredName) return false;

  const norm1 = inputName.trim().toLowerCase().replace(/\s+/g, ' ');
  const norm2 = registeredName.trim().toLowerCase().replace(/\s+/g, ' ');

  if (norm1 === norm2) return true;

  const clean1 = norm1.replace(/[^a-z0-9]/g, '');
  const clean2 = norm2.replace(/[^a-z0-9]/g, '');

  if (clean1 === clean2) return true;
  if (clean1.length >= 3 && clean2.length >= 3) {
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
  }

  const words1 = norm1.split(' ').filter((w) => w.length > 2);
  const words2 = norm2.split(' ').filter((w) => w.length > 2);

  const overlappingWords = words1.filter((w) => words2.includes(w));
  if (overlappingWords.length > 0) return true;

  return false;
}

export const UaeLoginModal: React.FC<UaeLoginModalProps> = ({
  isOpen,
  defaultEmail,
  allGroups,
  onLoginSuccess,
}) => {
  // Form State
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
        if (typeof parsed.rememberMe === 'boolean') setRememberMe(parsed.rememberMe);
      }
    } catch {
      // ignore parse errors
    }
  }, [isOpen]);

  // Prevent background scrolling when login modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
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
          name: googleUser.displayName || (isAdmin ? 'Owner & Admin' : 'Mess Member'),
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
        name: 'Owner & Admin',
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

    // Member Validation: Lookup in allGroups and Cloud Firestore
    setIsSearchingCloud(true);
    const cloudProfile = await getUserProfileFromFirestore(trimmedMobile);
    setIsSearchingCloud(false);

    let foundMember: Member | null = null;
    if (allGroups && allGroups.length > 0) {
      for (const g of allGroups) {
        if (g.members) {
          const match = g.members.find(
            (m) =>
              isPhoneMatch(m.mobileNumber, trimmedMobile) ||
              isPhoneMatch(m.phone, trimmedMobile) ||
              isPhoneMatch(m.email, trimmedMobile)
          );
          if (match) {
            foundMember = match;
            break;
          }
        }
      }
    }

    // 1. Mobile number registration check
    if (!foundMember && !cloudProfile) {
      triggerHaptic(hapticPatterns.error);
      setLoginError(`Mobile number (${trimmedMobile}) is not registered in any mess group by Admin. Please contact Admin to create your account.`);
      return;
    }

    // Determine the registered name created by Admin
    const registeredName = foundMember?.name || cloudProfile?.name || 'Mess Member';
    const expectedPassword = foundMember?.password || cloudProfile?.password;

    // 2. Password check against Admin-set password (if password is set)
    if (expectedPassword && expectedPassword.trim() !== '' && expectedPassword !== trimmedPass) {
      triggerHaptic(hapticPatterns.error);
      setLoginError('Incorrect password for this mobile number.');
      return;
    }

    // General Member Login with Admin-created Name
    setLoginError(null);
    triggerHaptic(hapticPatterns.success);

    onLoginSuccess({
      name: registeredName,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 max-w-full overflow-x-hidden overflow-y-auto">
      <GlassContainer
        variant="card"
        blur="3xl"
        className="w-full max-w-lg max-h-[92vh] rounded-3xl border-2 border-black shadow-2xl flex flex-col overflow-hidden relative my-auto box-border text-slate-900 bg-white"
      >
        {/* Header Banner */}
        <div className="p-4 sm:p-5 border-b-2 border-black bg-white flex items-center justify-between shrink-0 gap-3 overflow-hidden text-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={uaeMessLogo}
              alt="UAE MESS SYSTEM Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-black shadow-md shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black tracking-wider text-slate-950 uppercase">
                  UAE MESS SYSTEM
                </span>
                <span className="bg-black text-white border border-black text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap">
                  Portal Login
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-950 truncate mt-0.5">
                Member & Admin Portal Access
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-700 font-medium truncate">
                Log in using Mobile Number & Password
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-900 max-w-full">
          {/* 1. Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-900" />
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
              className="w-full px-4 py-3 bg-white border border-black rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* 2. Password */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-900" />
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
                className="w-full px-4 py-3 bg-white border border-black rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-900 hover:text-black cursor-pointer"
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
              className="flex items-center gap-2 text-xs font-bold text-slate-900 hover:text-black cursor-pointer select-none"
            >
              {rememberMe ? (
                <CheckSquare className="w-4 h-4 text-black" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Remember my credentials on this device</span>
            </button>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="bg-slate-900 text-white border border-black p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <AlertTriangle className="w-4.5 h-4.5 text-white shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Submit Button inside form for Enter key support */}
          <button type="submit" className="hidden" />
        </form>

        {/* Footer Login Button */}
        <div className="p-4 sm:p-5 bg-white border-t-2 border-black shrink-0">
          <button
            type="button"
            onClick={() => handleLogin()}
            disabled={isSearchingCloud}
            className="w-full bg-black hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl transition-all text-sm flex items-center justify-center gap-2 border border-black active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5 stroke-[2.5] text-white" />
            <span>{isSearchingCloud ? 'Connecting Cloud...' : 'Login to Mess Portal'}</span>
            <ArrowRight className="w-5 h-5 stroke-[3] text-white" />
          </button>
        </div>
      </GlassContainer>
    </div>
  );
};
