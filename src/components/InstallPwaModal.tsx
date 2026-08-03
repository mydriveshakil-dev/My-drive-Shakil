import React, { useState, useEffect } from 'react';
import { Smartphone, Share, PlusSquare, MoreVertical, CheckCircle2, X, Download, ShieldCheck, ArrowRight } from 'lucide-react';
import { GlassContainer } from './GlassContainer';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandaloneMode);

    // Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    const androidDevice = /android/.test(userAgent);
    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border-2 border-black shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b-2 border-black bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl border border-black shadow-sm">
              <Smartphone className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                Mobile App Setup (হোম স্ক্রিন অ্যাপ)
              </h2>
              <p className="text-xs text-emerald-200 font-medium mt-0.5">
                Run without browser tabs like a native app
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-2xl border border-emerald-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Status Alert */}
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-600 rounded-2xl flex items-center gap-3 text-emerald-950">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-extrabold text-sm">অ্যাপটি ইতিমধ্যে মোবাইল অ্যাপ হিসেবে সফলভাবে রান করছে!</p>
                <p className="text-xs text-emerald-800 font-medium">
                  You are currently using the app in full-screen PWA mode without browser tabs.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border-2 border-amber-500 rounded-2xl text-amber-950 space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="font-black text-sm">ফুল-স্ক্রিন মোবাইল অ্যাপ হিসেবে রান করার নিয়ম:</p>
              </div>
              <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                ব্রাউজার ট্যাব ও এড্রেস বার ছাড়া সাধারণ মোবাইল অ্যাপের মতো ব্যবহার করতে অ্যাপটি আপনার ফোনের **Home Screen** (হোম স্ক্রিন)-এ অ্যাড করুন।
              </p>
            </div>
          )}

          {/* Direct Install Button (Android / Desktop Chrome) */}
          {deferredPrompt && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl border-2 border-black flex flex-col gap-3">
              <p className="text-xs font-bold text-amber-300">
                এক ক্লিকে আপনার ফোনে সরাসরি অ্যাপ ইনস্টল করতে নিচে চাপুন:
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl border border-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>Install Mobile App Now (এখনই ইনস্টল করুন)</span>
              </button>
            </div>
          )}

          {/* iPhone / iOS Instructions */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-black/20 space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="p-1.5 bg-black text-white text-xs font-black rounded-lg">iOS</span>
              <h3 className="font-black text-sm">iPhone / iPad (Safari Browser) নির্দেশিকা:</h3>
            </div>
            <ol className="space-y-2 text-xs text-slate-800 font-medium">
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 bg-emerald-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <div>
                  সাফারি (Safari) ব্রাউজারের নিচে থাকা <strong className="text-slate-900 font-bold inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300"><Share className="w-3.5 h-3.5" /> Share</strong> বাটনে ক্লিক করুন।
                </div>
              </li>
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 bg-emerald-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <div>
                  মেনু স্ক্রোল করে <strong className="text-slate-900 font-bold inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300"><PlusSquare className="w-3.5 h-3.5" /> Add to Home Screen</strong> সিলেক্ট করুন।
                </div>
              </li>
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 bg-emerald-800 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <div>
                  উপরে ডান কোণায় <strong className="text-slate-900 font-bold">Add</strong> চাপুন।
                </div>
              </li>
              <li className="flex items-start gap-2 bg-emerald-100 p-2.5 rounded-xl border border-emerald-300 text-emerald-950 font-bold">
                <ArrowRight className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  এবার ফোনের Home Screen থেকে **UAE MESS** আইকন চেপে অ্যাপটি চালু করুন। এটি আর ব্রাউজার ট্যাবে না খুলে সম্পূর্ণ মোবাইল অ্যাপের মতো চালু হবে!
                </div>
              </li>
            </ol>
          </div>

          {/* Android Instructions */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-black/20 space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="p-1.5 bg-black text-white text-xs font-black rounded-lg">Android</span>
              <h3 className="font-black text-sm">Android (Chrome Browser) নির্দেশিকা:</h3>
            </div>
            <ol className="space-y-2 text-xs text-slate-800 font-medium">
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <div>
                  Chrome ব্রাউজারের উপরে ডানে থাকা <strong className="text-slate-900 font-bold inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300"><MoreVertical className="w-3.5 h-3.5" /> 3 Dots</strong> অপশনে ক্লিক করুন।
                </div>
              </li>
              <li className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="text-slate-900 font-bold">"Install app"</strong> অথবা <strong className="text-slate-900 font-bold">"Add to Home screen"</strong> নির্বাচন করুন।
                </div>
              </li>
              <li className="flex items-start gap-2 bg-emerald-100 p-2.5 rounded-xl border border-emerald-300 text-emerald-950 font-bold">
                <ArrowRight className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  হোম স্ক্রিন থেকে চালু করলে অ্যাপটি স্বাভাভিক নেটিভ মোবাইল অ্যাপ হিসেবে চলবে।
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t-2 border-black flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-black text-white font-black text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer shadow-md"
          >
            বুঝেছি / Got It
          </button>
        </div>
      </div>
    </div>
  );
};
