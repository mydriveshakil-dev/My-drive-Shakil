import React, { useState, useRef } from 'react';
import { Group, UserAuthProfile, Member } from '../types';
import { GlassContainer } from './GlassContainer';
import { MemberAvatar } from './MemberAvatar';
import { compressProfileImage } from '../utils/imageCompressor';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import {
  X,
  User,
  Camera,
  ImageIcon,
  Trash2,
  Check,
  Smartphone,
  Users,
  ShieldCheck,
  Building2,
  Save,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAuthProfile | null;
  group: Group;
  loggedInMember?: Member | null;
  onSaveProfile: (data: { name: string; avatar: string }) => Promise<void> | void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  group,
  loggedInMember,
  onSaveProfile,
}) => {
  const currentName =
    currentUser?.name ||
    currentUser?.identity?.fullName ||
    loggedInMember?.name ||
    'Room Member';

  const currentMobile =
    currentUser?.mobileNumber ||
    loggedInMember?.mobileNumber ||
    loggedInMember?.phone ||
    loggedInMember?.email ||
    currentUser?.email ||
    'Not Available';

  const initialAvatar =
    currentUser?.avatar ||
    loggedInMember?.avatar ||
    '';

  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState<string>(initialAvatar);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';

  const handleImageFile = async (file: File) => {
    try {
      setIsProcessingImage(true);
      const compressedDataUrl = await compressProfileImage(file, 360, 360, 0.85);
      setAvatar(compressedDataUrl);
      triggerHaptic(hapticPatterns.success);
    } catch (err) {
      console.error('Failed to compress image:', err);
      // Fallback to raw FileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    triggerHaptic(hapticPatterns.click);
    setAvatar('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSaveProfile({
        name: name.trim(),
        avatar: avatar.trim(),
      });
      triggerHaptic(hapticPatterns.success);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (error) {
      console.error('Error saving profile:', error);
      triggerHaptic(hapticPatterns.error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden cursor-default text-slate-900 animate-in zoom-in-95 duration-200"
      >
        {/* Header - Navy Theme */}
        <div className="p-5 bg-gradient-to-r from-[#07193F] to-[#041029] text-white flex items-center justify-between border-b border-blue-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0052FF] text-white flex items-center justify-center font-black shadow-md border border-blue-400/30">
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">My Profile Details</h2>
              <p className="text-[11px] text-blue-200 font-medium">View & update your profile picture</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(hapticPatterns.click);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center space-y-3 pb-2">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-blue-500/20 shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                {isProcessingImage ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-[10px] font-bold">Optimizing...</span>
                  </div>
                ) : (
                  <MemberAvatar
                    name={name}
                    avatar={avatar}
                    size="custom"
                    className="w-full h-full text-2xl font-black"
                  />
                )}
              </div>

              {/* Status Indicator */}
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs flex items-center justify-center" title="Active">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </span>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(hapticPatterns.click);
                  cameraInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0052FF] font-bold text-xs rounded-xl border border-blue-200/80 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(hapticPatterns.click);
                  galleryInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0052FF] font-bold text-xs rounded-xl border border-blue-200/80 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Gallery</span>
              </button>

              {avatar && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title="Remove profile image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 text-center font-medium">
              Your photo will be displayed to all group members across all expenses and messages.
            </p>
          </div>

          {/* Details Fields */}
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* 1. Name Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>User Name</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#07193F]/20 focus:border-[#07193F] transition-all"
              />
            </div>

            {/* 2. Group Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Group Name</span>
              </label>
              <div className="w-full px-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>{group.name}</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                  {group.currency}
                </span>
              </div>
            </div>

            {/* 3. Login Mobile Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>Login Mobile Number</span>
              </label>
              <div className="w-full px-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 flex items-center justify-between">
                <span>{currentMobile}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Verified
                </span>
              </div>
            </div>

            {/* 4. Role Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Role & Permissions</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  {isAdmin ? 'Master App Administrator' : 'Active Room Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onClose();
              }}
              className="w-1/3 py-3 rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || isProcessingImage}
              className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-[#07193F] to-[#0A255C] hover:from-[#0a2356] hover:to-[#0f347e] text-white text-xs font-black shadow-lg shadow-blue-950/20 active:scale-95 transition-all cursor-pointer border border-blue-400/30 uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
