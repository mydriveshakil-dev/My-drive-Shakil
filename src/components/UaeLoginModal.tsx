import React, { useState, useEffect } from 'react';
import { UserAuthProfile, UaeVisaIdentity } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { verifyUaeVisaLive } from '../services/uaeVisaVerification';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Smartphone,
  CreditCard,
  Building2,
  User,
  Calendar,
  Globe,
  Briefcase,
  ArrowRight,
  RefreshCw,
  Search,
  Lock,
  BadgeCheck,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { GlassContainer } from './GlassContainer';

interface UaeLoginModalProps {
  isOpen: boolean;
  defaultEmail: string;
  onLoginSuccess: (authData: UserAuthProfile) => void;
}

export const UaeLoginModal: React.FC<UaeLoginModalProps> = ({
  isOpen,
  defaultEmail,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');

  // User Form State
  const [email, setEmail] = useState(defaultEmail || 'mydriveshakil@gmail.com');
  const [mobileNumber, setMobileNumber] = useState('+971 50 892 4102');
  const [idNumber, setIdNumber] = useState('784-1994-821034-1');

  // Admin Form State
  const [adminEmail, setAdminEmail] = useState(defaultEmail || 'mydriveshakil@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [passportNumber, setPassportNumber] = useState('');
  const [nationality, setNationality] = useState('Bangladeshi');

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);
  const [identityData, setIdentityData] = useState<UaeVisaIdentity | null>(null);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  useEffect(() => {
    if (defaultEmail) {
      setEmail(defaultEmail);
      setAdminEmail(defaultEmail);
    }
  }, [defaultEmail]);

  useEffect(() => {
    if (isOpen) {
      setAdminPassword('');
      setAdminError(null);
      if (!identityData) {
        handleVerify();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationDone(false);
    setApiMessage(null);

    const result = await verifyUaeVisaLive({
      idNumber,
      passportNumber,
      nationality,
    });

    setIsVerifying(false);
    setVerificationDone(true);
    setIdentityData(result.identity);
    setApiMessage(result.message);

    if (result.success && result.identity && !result.identity.isExpired) {
      triggerHaptic(hapticPatterns.success);
    } else {
      triggerHaptic(hapticPatterns.error);
    }
  };

  const handleUserLogin = () => {
    if (!identityData || identityData.isExpired) return;

    onLoginSuccess({
      email,
      mobileNumber,
      idNumber,
      identity: identityData,
      isLoggedIn: true,
      role: 'user',
    });
  };

  const handleAdminLogin = () => {
    if (adminPassword !== 'UAE@@2024') {
      triggerHaptic(hapticPatterns.error);
      setAdminError('Incorrect Admin Password!');
      return;
    }

    setAdminError(null);
    setAdminPassword('');
    triggerHaptic(hapticPatterns.success);

    onLoginSuccess({
      email: adminEmail,
      mobileNumber: '+971 50 892 4102',
      idNumber: '784-1994-ADMIN-01',
      identity: {
        idNumber: '784-1994-ADMIN-01',
        fullName: 'KAZI MD SHAKIL (App Admin)',
        visaIssueDate: '01 Jan 2024',
        visaExpiryDate: '01 Jan 2030',
        isExpired: false,
        occupation: 'System Administrator & Group Controller',
        nationality: 'Bangladeshi',
        passportNumber: 'ADMIN99823',
        sponsorName: 'Room 3 System Admin Authority',
        status: 'ACTIVE',
      },
      isLoggedIn: true,
      role: 'admin',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 max-w-full overflow-x-hidden overflow-y-auto">
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="w-full max-w-xl max-h-[92vh] rounded-3xl border border-white/30 shadow-2xl flex flex-col overflow-hidden relative my-auto box-border"
      >
        {/* Government / Portal Header Banner */}
        <div className="p-3.5 sm:p-5 border-b border-white/20 bg-emerald-950/60 flex items-center justify-between backdrop-blur-2xl shrink-0 gap-2 overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/src/assets/images/uae_mess_logo_1785022712689.jpg"
              alt="UAE MESS SYSTEM Logo"
              className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl object-cover border-2 border-amber-400/80 shadow-xl shadow-amber-500/20 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black tracking-wider text-amber-300 uppercase">
                  UAE MESS SYSTEM
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                  GDRFA & Admin Auth
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-black text-white/90 truncate mt-0.5">
                Room Suite Portal Access
              </h2>
              <p className="text-[10px] sm:text-xs text-emerald-200/80 font-medium truncate">
                {activeTab === 'user' ? 'UAE Residence Visa Identity Check' : 'Super Admin Authentication Mode'}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right text-[10px] text-amber-300 font-bold shrink-0">
            <span>UNITED ARAB EMIRATES</span>
            <span className="text-white/60 font-normal">Smart Identity & Admin</span>
          </div>
        </div>

        {/* Tab Selector: General User vs App Admin */}
        <div className="bg-emerald-950/90 p-1.5 sm:p-2 border-b border-white/15 flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('user');
              setAdminError(null);
              triggerHaptic(hapticPatterns.click);
            }}
            className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-2xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 ${
              activeTab === 'user'
                ? 'bg-[#F9A826] text-[#0B4A3F] shadow-lg border border-white/40'
                : 'text-emerald-200/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] shrink-0" />
            <span className="truncate">General Member Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setAdminError(null);
              triggerHaptic(hapticPatterns.click);
            }}
            className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-2xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 ${
              activeTab === 'admin'
                ? 'bg-amber-400 text-emerald-950 shadow-lg border border-white/40'
                : 'text-amber-300/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] shrink-0" />
            <span className="truncate">App Admin Login</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-white max-w-full">
          {activeTab === 'user' ? (
            /* GENERAL USER LOGIN WITH UAE VISA CHECK */
            <>
              {/* Real-time ICP & GDRFA Verification Status Banner */}
              <div className="bg-emerald-950/80 p-3 rounded-2xl border border-emerald-400/30 flex items-center justify-between text-xs backdrop-blur-md gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-emerald-200 font-bold text-[11px] sm:text-xs flex items-center gap-1.5 truncate">
                    <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Live ICP & GDRFA Portal Verification API</span>
                  </span>
                </div>
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                  Connected
                </span>
              </div>

              {/* 2. Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#F9A826]" />
                  UAE Mobile Number *
                </label>
                <input
                  type="text"
                  placeholder="+971 50 000 0000"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-2xl text-xs sm:text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-xl"
                />
              </div>

              {/* 3. ID Number (UAE Residence Visa / Emirates ID) */}
              <div>
                <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5 flex items-center justify-between flex-wrap gap-1">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#F9A826]" />
                    Emirates ID / UAE Residence Visa Number *
                  </span>
                  <span className="text-[10px] text-amber-300 font-semibold">GDRFA Verified</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="784-1994-821034-1"
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value);
                      setVerificationDone(false);
                    }}
                    className="flex-1 min-w-0 px-4 py-3 bg-white/10 border border-white/25 rounded-2xl text-xs sm:text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-xl"
                  />
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying || !idNumber.trim()}
                    className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-4 py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg border border-white/30 disabled:opacity-50 transition-all active:scale-95 shrink-0 cursor-pointer w-full sm:w-auto"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 stroke-[2.5]" />
                        <span>Check Visa Status</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 4. Verified Government Status Output Box */}
              {verificationDone && (
                <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-3">
                  {apiMessage && (
                    <div className="bg-emerald-950/60 border border-emerald-400/40 p-2.5 rounded-xl text-xs text-emerald-200 font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{apiMessage}</span>
                    </div>
                  )}

                  {identityData && (
                    <>
                      {identityData.isExpired ? (
                        /* EXPIRED VISA WARNING CARD */
                        <div className="bg-rose-950/80 border-2 border-rose-500/80 p-4 rounded-2xl backdrop-blur-2xl text-rose-100 space-y-2 shadow-xl">
                          <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
                            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                            <span>UAE Residence Visa Expired - Access Denied</span>
                          </div>
                          <p className="text-xs text-rose-200/90 leading-relaxed font-medium">
                            The provided UAE ID / Residence Visa expired on <strong>{identityData.visaExpiryDate}</strong>. Members with expired residence visas cannot join or manage room expenses until visa renewal is verified via ICP / GDRFA portal.
                          </p>
                          <div className="pt-1 flex items-center justify-between text-[11px] font-bold border-t border-rose-800/60 text-rose-300">
                            <span>Holder ID: {identityData.idNumber}</span>
                            <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                              STATUS: EXPIRED
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* ACTIVE VISA SMART IDENTITY PROFILE CARD */
                        <div className="bg-emerald-950/90 border-2 border-emerald-400/60 p-4 sm:p-5 rounded-2xl backdrop-blur-2xl text-white space-y-3 shadow-2xl relative overflow-hidden">
                          <div className="absolute top-2 right-2 text-amber-400/10 pointer-events-none">
                            <BadgeCheck className="w-24 h-24" />
                          </div>

                          <div className="flex items-center justify-between border-b border-white/20 pb-2">
                            <div className="flex items-center gap-2">
                              <BadgeCheck className="w-5 h-5 text-[#F9A826]" />
                              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                                UAE Smart Residence Identity (Verified)
                              </span>
                            </div>
                            <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                              <CheckCircle2 className="w-3 h-3" />
                              ACTIVE & VALID
                            </span>
                          </div>

                          {/* Identity Grid Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-2.5 bg-white/10 p-2.5 rounded-xl border border-white/15">
                              <User className="w-4 h-4 text-[#F9A826] shrink-0" />
                              <div>
                                <div className="text-[10px] text-emerald-200 uppercase font-semibold">Verified ID / Holder</div>
                                <div className="font-extrabold text-sm text-white">{identityData.fullName}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 bg-white/10 p-2.5 rounded-xl border border-white/15">
                              <Briefcase className="w-4 h-4 text-[#F9A826] shrink-0" />
                              <div>
                                <div className="text-[10px] text-emerald-200 uppercase font-semibold">Occupation</div>
                                <div className="font-bold text-white">{identityData.occupation}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 bg-white/10 p-2.5 rounded-xl border border-white/15">
                              <Globe className="w-4 h-4 text-[#F9A826] shrink-0" />
                              <div>
                                <div className="text-[10px] text-emerald-200 uppercase font-semibold">Nationality</div>
                                <div className="font-bold text-white">{identityData.nationality}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 bg-white/10 p-2.5 rounded-xl border border-white/15">
                              <Calendar className="w-4 h-4 text-[#F9A826] shrink-0" />
                              <div>
                                <div className="text-[10px] text-emerald-200 uppercase font-semibold">Visa Validity</div>
                                <div className="font-bold text-emerald-300">
                                  {identityData.visaIssueDate} → {identityData.visaExpiryDate}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 bg-white/10 p-2.5 rounded-xl border border-white/15 sm:col-span-2">
                              <Building2 className="w-4 h-4 text-[#F9A826] shrink-0" />
                              <div>
                                <div className="text-[10px] text-emerald-200 uppercase font-semibold">Sponsor / Authority</div>
                                <div className="font-bold text-white">{identityData.sponsorName}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            /* APP ADMIN LOGIN FORM WITH REQUIRED PASSWORD UAE@@2024 */
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="bg-amber-400/10 border border-amber-400/30 p-4 rounded-2xl text-amber-200 text-xs leading-relaxed flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 font-extrabold block text-sm">App Administrator Privileges</strong>
                  Admins have full authority to create new groups, pause/hold existing groups, delete groups, and change primary room currency.
                </div>
              </div>

              {/* Admin Password Option */}
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#F9A826]" />
                    Admin Password *
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-bold">Required to access Admin Panel</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={adminPassword}
                    autoComplete="new-password"
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminError(null);
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-2xl text-xs sm:text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-xl pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-300/80 hover:text-amber-300"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Password Error Message */}
              {adminError && (
                <div className="bg-rose-950/90 border border-rose-500 p-3 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Login Button */}
        <div className="p-4 sm:p-5 bg-emerald-950/80 border-t border-white/20 backdrop-blur-2xl shrink-0">
          {activeTab === 'user' ? (
            <button
              type="button"
              onClick={handleUserLogin}
              disabled={!verificationDone || !identityData || identityData.isExpired}
              className="w-full bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black py-4 rounded-2xl shadow-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border border-white/30 active:scale-98 cursor-pointer"
            >
              <User className="w-5 h-5 stroke-[2.5]" />
              <span>General Member Login</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAdminLogin}
              className="w-full bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black py-4 rounded-2xl shadow-xl transition-all text-sm flex items-center justify-center gap-2 border border-white/40 active:scale-98 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              <span>Login as App Administrator</span>
            </button>
          )}
        </div>
      </GlassContainer>
    </div>
  );
};
