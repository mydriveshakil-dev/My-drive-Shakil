import React, { useState, useEffect } from 'react';
import { UserAuthProfile, Group, Member } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import {
  loginWithGoogleAuth,
  getUserProfileFromFirestore,
  isPhoneMatch,
  updateMemberPasswordAcrossFirestore,
} from '../lib/firebase';
import {
  ShieldCheck,
  Smartphone,
  User,
  ArrowRight,
  ArrowLeft,
  Lock,
  AlertTriangle,
  Info,
  CheckSquare,
  Square,
  Globe,
  X,
  MessageCircle,
  KeyRound,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import uaeMessLogo from '../assets/images/uae_mess_logo_1785022712689.jpg';

interface UaeLoginModalProps {
  isOpen: boolean;
  defaultEmail: string;
  allGroups?: Group[];
  currentGroup?: Group;
  onLoginSuccess: (authData: UserAuthProfile) => void;
  onOpenInstallPwa?: () => void;
  onClose?: () => void;
  isLoggedIn?: boolean;
  onUpdateGroup?: (updatedGroup: Group) => void;
  onUpdateAllGroups?: (allGroups: Group[]) => void;
}

const SAVED_CREDENTIALS_KEY = 'uae_saved_login_credentials';

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
  currentGroup,
  onLoginSuccess,
  onOpenInstallPwa,
  onClose,
  isLoggedIn,
  onUpdateGroup,
  onUpdateAllGroups,
}) => {
  // Mode: 'login' | 'forgot_password'
  const [viewMode, setViewMode] = useState<'login' | 'forgot_password'>('login');

  // Form State - Login
  const [mobileNumber, setMobileNumber] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSearchingCloud, setIsSearchingCloud] = useState(false);

  // Form State - Forget / Reset Password
  const [resetMobile, setResetMobile] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Check if current mobile input is Admin mobile number
  const cleanMobileDigits = mobileNumber.replace(/\D/g, '');
  const isAdminMobile =
    cleanMobileDigits === '971544874028' ||
    cleanMobileDigits === '0544874028' ||
    (cleanMobileDigits.length >= 9 && cleanMobileDigits.endsWith('544874028'));

  // Load saved credentials on mount / open
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_CREDENTIALS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mobileNumber) {
          setMobileNumber(parsed.mobileNumber);
          setResetMobile(parsed.mobileNumber);
        }
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

  // Handle Reset / Change Password
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedMobile = resetMobile.trim();
    const trimmedNewPass = newPasswordInput.trim();
    const trimmedConfirmPass = confirmPasswordInput.trim();

    if (!trimmedMobile) {
      triggerHaptic(hapticPatterns.error);
      setResetError('Please enter your registered mobile number.');
      return;
    }

    if (!trimmedNewPass) {
      triggerHaptic(hapticPatterns.error);
      setResetError('Please enter your new password.');
      return;
    }

    if (trimmedNewPass.length < 3) {
      triggerHaptic(hapticPatterns.error);
      setResetError('Password must be at least 3 characters long.');
      return;
    }

    if (trimmedNewPass !== trimmedConfirmPass) {
      triggerHaptic(hapticPatterns.error);
      setResetError('New password and confirm password do not match.');
      return;
    }

    try {
      setIsResetting(true);
      setResetError(null);
      setResetSuccess(null);

      // Check if user is Admin mobile number
      const cleanDigits = trimmedMobile.replace(/\D/g, '');
      const isAdminMobile =
        cleanDigits === '971544874028' ||
        cleanDigits === '0544874028' ||
        cleanDigits.endsWith('544874028');

      if (isAdminMobile) {
        triggerHaptic(hapticPatterns.error);
        setResetError('Admin Master password is fixed by system. Please use UAE@@2024 to login.');
        setIsResetting(false);
        return;
      }

      // Check if mobile number exists across groups or cloud users
      let foundMemberInAnyGroup = false;
      let matchedMemberName = '';
      let matchedGroupName = '';

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
              foundMemberInAnyGroup = true;
              matchedMemberName = match.name;
              matchedGroupName = g.name;
              break;
            }
          }
        }
      }

      // 1. Update in Firestore Cloud Database (both 'groups' and 'users' collections)
      const firestoreResult = await updateMemberPasswordAcrossFirestore(trimmedMobile, trimmedNewPass);

      if (!firestoreResult.success && !foundMemberInAnyGroup) {
        triggerHaptic(hapticPatterns.error);
        setResetError(firestoreResult.error || `Mobile number (${trimmedMobile}) is not registered in any room group.`);
        setIsResetting(false);
        return;
      }

      // 2. Update local state for allGroups so Admin group page immediately shows the updated password
      if (allGroups && allGroups.length > 0) {
        const updatedGroups = allGroups.map((g) => {
          let hasChange = false;
          const updatedMembers = (g.members || []).map((m) => {
            if (
              isPhoneMatch(m.mobileNumber, trimmedMobile) ||
              isPhoneMatch(m.phone, trimmedMobile) ||
              isPhoneMatch(m.email, trimmedMobile)
            ) {
              hasChange = true;
              matchedMemberName = m.name;
              matchedGroupName = g.name;
              return { ...m, password: trimmedNewPass };
            }
            return m;
          });

          if (hasChange) {
            return { ...g, members: updatedMembers };
          }
          return g;
        });

        if (onUpdateAllGroups) {
          onUpdateAllGroups(updatedGroups);
        }

        if (currentGroup && onUpdateGroup) {
          const currentMatch = updatedGroups.find((g) => g.id === currentGroup.id);
          if (currentMatch) {
            onUpdateGroup(currentMatch);
          }
        }

        localStorage.setItem('all_room_groups', JSON.stringify(updatedGroups));
      }

      // 3. Update login credentials in form & localStorage
      setMobileNumber(trimmedMobile);
      setUserPassword(trimmedNewPass);
      if (rememberMe) {
        localStorage.setItem(
          SAVED_CREDENTIALS_KEY,
          JSON.stringify({
            mobileNumber: trimmedMobile,
            password: trimmedNewPass,
            rememberMe: true,
          })
        );
      }

      triggerHaptic(hapticPatterns.success);
      const dispName = matchedMemberName || firestoreResult.memberName || 'Member';
      const dispGroup = matchedGroupName || firestoreResult.groupName || '';
      setResetSuccess(
        `Password changed successfully for ${dispName}${dispGroup ? ` (${dispGroup})` : ''}! You can now login with your new password.`
      );

      // Auto switch back to login mode after 2.5 seconds
      setTimeout(() => {
        setViewMode('login');
        setResetSuccess(null);
      }, 2500);
    } catch (err: any) {
      console.error('Password reset error:', err);
      triggerHaptic(hapticPatterns.error);
      setResetError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsResetting(false);
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
    let foundGroupId: string | undefined = cloudProfile?.linkedGroupId;

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
            foundGroupId = g.id;
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
      email: cloudProfile?.email || foundMember?.email || 'user@mess.com',
      mobileNumber: trimmedMobile,
      password: trimmedPass,
      idNumber: cloudProfile?.idNumber || '',
      identity: null,
      isLoggedIn: true,
      role: cloudProfile?.role || 'user',
      linkedGroupId: foundGroupId || cloudProfile?.linkedGroupId,
    });
  };

  return (
    <div className="uae-login-modal w-full min-h-[85vh] sm:min-h-screen py-6 sm:py-10 px-3 sm:px-6 md:px-8 flex items-center justify-center bg-[#ebf0f7] max-w-full selection:bg-sky-500/20 my-auto">
      {/* Neumorphic Soft UI Card */}
      <div className="neu-card w-full max-w-[420px] rounded-[36px] sm:rounded-[42px] border border-white/70 flex flex-col overflow-hidden relative my-auto box-border text-slate-800 p-6 sm:p-8 transition-all">
        
        {/* Top Header Actions (Install App / Back / Close) */}
        <div className="flex items-center justify-between w-full mb-3">
          {viewMode === 'forgot_password' ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                setViewMode('login');
                setResetError(null);
                setResetSuccess(null);
              }}
              className="neu-flat-sm w-9 h-9 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all active:scale-95 cursor-pointer border border-white/80"
              title="Back to Login"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}

          <div className="flex items-center gap-2">
            {onOpenInstallPwa && viewMode === 'login' && (
              <button
                type="button"
                onClick={onOpenInstallPwa}
                className="neu-flat-sm inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 active:scale-95 text-xs font-bold px-3 py-1.5 rounded-full transition-all border border-white/80 cursor-pointer"
                title="Install Mobile App / Add to Home Screen"
              >
                <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Install App</span>
              </button>
            )}
            {isLoggedIn && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="neu-flat-sm w-9 h-9 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all active:scale-95 border border-white/80 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Center Logo Section in Neumorphic Embossed Frame */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="neu-flat w-20 h-20 sm:w-24 sm:h-24 rounded-full p-2.5 flex items-center justify-center border border-white/80 mb-3.5 relative">
            <img
              src={uaeMessLogo}
              alt="UAE MESS SYSTEM Logo"
              className="w-full h-full rounded-full object-cover shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-wide uppercase">
              UAE MESS SYSTEM
            </h1>
          </div>

          {viewMode === 'forgot_password' ? (
            <>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="bg-sky-500/15 text-sky-700 border border-sky-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Reset Password
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium mt-1">
                Update your password for login & room member list
              </p>
            </>
          ) : (
            /* Blank space placeholder to preserve exact layout spacing without text */
            <div className="h-[44px] w-full" aria-hidden="true" />
          )}
        </div>

        {/* View Mode: FORGOT PASSWORD */}
        {viewMode === 'forgot_password' ? (
          <>
            <form onSubmit={handleResetPassword} className="space-y-4 flex-1 text-slate-800">
              <div className="neu-flat-sm border border-sky-200/60 rounded-2xl p-3 text-xs text-slate-700 font-medium flex items-start gap-2.5">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  Enter your registered mobile number and set a new password. It will update immediately in the active member directory.
                </span>
              </div>

              {/* 1. Mobile Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 px-1">
                  Registered Mobile Number *
                </label>
                <div className="neu-inset rounded-[22px] px-4 py-3.5 flex items-center gap-3 border border-white/60 transition-all">
                  <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="0501234567"
                    value={resetMobile}
                    onChange={(e) => {
                      setResetMobile(e.target.value);
                      setResetError(null);
                    }}
                    className="uae-login-input w-full !bg-transparent !border-none !outline-none !shadow-none text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* 2. New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 px-1">
                  New Password *
                </label>
                <div className="neu-inset rounded-[22px] px-4 py-3.5 flex items-center gap-3 border border-white/60 transition-all relative">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    value={newPasswordInput}
                    onChange={(e) => {
                      setNewPasswordInput(e.target.value);
                      setResetError(null);
                    }}
                    className="uae-login-input w-full !bg-transparent !border-none !outline-none !shadow-none text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3.5 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer select-none"
                  >
                    {showResetPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* 3. Confirm New Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 px-1">
                  Confirm New Password *
                </label>
                <div className="neu-inset rounded-[22px] px-4 py-3.5 flex items-center gap-3 border border-white/60 transition-all">
                  <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPasswordInput}
                    onChange={(e) => {
                      setConfirmPasswordInput(e.target.value);
                      setResetError(null);
                    }}
                    className="uae-login-input w-full !bg-transparent !border-none !outline-none !shadow-none text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Reset Error Alert */}
              {resetError && (
                <div className="neu-flat-sm bg-rose-50/80 text-rose-900 border border-rose-300/80 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* Reset Success Alert */}
              {resetSuccess && (
                <div className="neu-flat-sm bg-emerald-50/80 text-emerald-900 border border-emerald-300/80 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <button type="submit" className="hidden" />

              {/* Set New Password Button */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleResetPassword()}
                  disabled={isResetting}
                  className="neu-btn-cyan w-full py-4 rounded-[22px] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50 border border-white/40 transition-all"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4.5 h-4.5 text-white" />
                      <span>Set New Password</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(hapticPatterns.click);
                    setViewMode('login');
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  className="neu-flat-sm w-full py-3 rounded-[20px] text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:text-slate-900 cursor-pointer border border-white/80 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          /* View Mode: LOGIN */
          <>
            <form
              onSubmit={(e) => {
                if (loginError) {
                  e.preventDefault();
                  window.open('https://wa.me/message/Z4DT5UO7MABQL1', '_blank');
                } else {
                  handleLogin(e);
                }
              }}
              className="space-y-4 flex-1 text-slate-800"
            >
              {/* 1. Mobile Number / Username */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 px-1">
                  Mobile Number *
                </label>
                <div className="neu-inset rounded-[22px] px-4 py-3.5 sm:py-4 flex items-center gap-3 border border-white/60 transition-all">
                  <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="0501234567"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      setLoginError(null);
                    }}
                    className="uae-login-input w-full !bg-transparent !border-none !outline-none !shadow-none text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* 2. Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 px-1">
                  Password *
                </label>
                <div className="neu-inset rounded-[22px] px-4 py-3.5 sm:py-4 flex items-center gap-3 border border-white/60 transition-all relative">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={userPassword}
                    onChange={(e) => {
                      setUserPassword(e.target.value);
                      setLoginError(null);
                    }}
                    className="uae-login-input w-full !bg-transparent !border-none !outline-none !shadow-none text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-xs font-bold text-sky-600 hover:text-sky-800 cursor-pointer select-none"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* 3. Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setRememberMe(!rememberMe);
                    triggerHaptic(hapticPatterns.click);
                  }}
                  className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer select-none"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      rememberMe
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'neu-flat-sm text-transparent border border-white/80'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </div>
                  <span>Remember my credentials</span>
                </button>
              </div>

              {/* Error Alert */}
              {loginError && (
                <div className="neu-flat-sm bg-rose-50/80 text-rose-900 border border-rose-300/80 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Submit Button inside form for Enter key support */}
              <button type="submit" className="hidden" />

              {/* Primary Action Button (Login or Contact Admin) */}
              <div className="pt-2">
                {loginError ? (
                  <button
                    type="button"
                    onClick={() => window.open('https://wa.me/message/Z4DT5UO7MABQL1', '_blank')}
                    className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-black py-4 rounded-[22px] shadow-lg shadow-emerald-900/20 transition-all text-sm flex items-center justify-center gap-2 active:scale-98 cursor-pointer border border-emerald-300/40 uppercase tracking-wider"
                  >
                    <MessageCircle className="w-4.5 h-4.5 text-white" />
                    <span>Contact with Admin</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLogin()}
                    disabled={isSearchingCloud}
                    className="neu-btn-cyan w-full py-4 rounded-[22px] text-white font-black text-base shadow-[0_10px_24px_rgba(45,178,212,0.4)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50 border border-white/40 uppercase tracking-wider"
                  >
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <span>{isSearchingCloud ? 'Connecting Cloud...' : 'Login'}</span>
                  </button>
                )}
              </div>

              {/* Forget Password Link below the Login button (Hidden if Admin mobile number is matched) */}
              {!isAdminMobile && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(hapticPatterns.click);
                      setResetMobile(mobileNumber);
                      setNewPasswordInput('');
                      setConfirmPasswordInput('');
                      setResetError(null);
                      setResetSuccess(null);
                      setViewMode('forgot_password');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-sky-600 hover:underline cursor-pointer transition-all py-1 px-2.5 rounded-xl active:scale-95"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Forget password?</span>
                  </button>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};
