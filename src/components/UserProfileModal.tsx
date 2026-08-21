import React, { useState, useRef } from 'react';
import { Group, UserAuthProfile, Member } from '../types';
import { GlassContainer } from './GlassContainer';
import { MemberAvatar } from './MemberAvatar';
import { compressProfileImage } from '../utils/imageCompressor';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { isProfileImageSet } from '../utils/permissionUtils';
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
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAuthProfile | null;
  group: Group;
  loggedInMember?: Member | null;
  onSaveProfile: (data: { name: string; avatar: string }) => Promise<void> | void;
  isMandatory?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  group,
  loggedInMember,
  onSaveProfile,
  isMandatory = false,
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
    (isProfileImageSet(currentUser?.avatar) ? currentUser?.avatar : '') ||
    (isProfileImageSet(loggedInMember?.avatar) ? loggedInMember?.avatar : '') ||
    '';

  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState<string>(initialAvatar);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';

  const handleImageFile = async (file: File) => {
    try {
      setIsProcessingImage(true);
      setPhotoError(null);
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

    if (isMandatory && !isProfileImageSet(avatar)) {
      setPhotoError('Profile photo is mandatory. Please take a selfie or upload a photo from gallery.');
      triggerHaptic(hapticPatterns.error);
      return;
    }

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
      onClick={isMandatory ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 cursor-default"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl neu-upper border-none shadow-2xl overflow-hidden cursor-default text-slate-900 animate-in zoom-in-95 duration-200"
      >
        {/* Header - Navy Theme */}
        <div className="p-5 bg-gradient-to-r from-[#07193F] to-[#041029] text-white flex items-center justify-between border-b border-blue-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0052FF] text-white flex items-center justify-center font-black shadow-md border border-blue-400/30">
              {isMandatory ? <Camera className="w-5 h-5 stroke-[2.5]" /> : <User className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white leading-tight">
                  {isMandatory ? 'Set Profile Picture' : 'My Profile Details'}
                </h2>
                {isMandatory && (
                  <span className="bg-amber-400 text-amber-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Required
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-200 font-medium">
                {isMandatory
                  ? 'Please set your profile photo to enter the app'
                  : 'View & update your profile picture'}
              </p>
            </div>
          </div>

          {!isMandatory && (
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
          )}
        </div>

        {/* Mandatory Requirement Warning Alert */}
        {isMandatory && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 font-bold leading-relaxed">
              Welcome! To ensure transparent group accounting and chat recognition, please upload your profile picture to unlock the application.
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center space-y-3 pb-2">
            <div className="relative group">
              <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full neu-upper shadow-xl overflow-hidden flex items-center justify-center ring-4 ${isProfileImageSet(avatar) ? 'ring-emerald-400/80' : 'ring-amber-400/80 ring-offset-2'}`}>
                {isProcessingImage ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                    <span className="text-[10px] font-bold">Optimizing...</span>
                  </div>
                ) : (
                  <MemberAvatar
                    name={name}
                    avatar={avatar}
                    size="custom"
                    className="w-full h-full text-3xl font-black"
                  />
                )}
              </div>
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
                className="px-3.5 py-2 neu-upper-btn text-[#071E55] font-black text-xs rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm hover:text-blue-700"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(hapticPatterns.click);
                  galleryInputRef.current?.click();
                }}
                className="px-3.5 py-2 neu-upper-btn text-[#071E55] font-black text-xs rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm hover:text-blue-700"
              >
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Gallery</span>
              </button>

              {!isMandatory && avatar && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-2.5 py-2 neu-upper-btn text-rose-600 font-bold text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  title="Remove profile image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {photoError && (
              <div className="text-center px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold animate-in fade-in">
                {photoError}
              </div>
            )}

            <p className="text-[11px] text-slate-500 text-center font-medium max-w-xs">
              {isMandatory
                ? 'Your photo helps all roommates identify who paid which expense and who sent messages.'
                : 'Your photo will be displayed to all group members across all expenses and messages.'}
            </p>
          </div>

          {/* Details Fields */}
          <div className="space-y-3.5 neu-lower-sm p-4 rounded-2xl">
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
                className="w-full px-3.5 py-2.5 neu-lower rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>

            {/* 2. Group Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Group Name</span>
              </label>
              <div className="w-full px-3.5 py-2.5 neu-lower-sm rounded-xl text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>{group.name}</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full neu-upper-sm text-blue-900">
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
              <div className="w-full px-3.5 py-2.5 neu-lower-sm rounded-xl text-xs font-mono font-bold text-slate-900 flex items-center justify-between">
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
                <span className="text-xs font-bold px-3 py-1 rounded-xl neu-upper-sm text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  {isAdmin ? 'Master App Administrator' : 'Active Room Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {!isMandatory && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(hapticPatterns.click);
                  onClose();
                }}
                className="w-1/3 py-3 rounded-2xl neu-upper-btn text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving || isProcessingImage}
              className={`${isMandatory ? 'w-full' : 'w-2/3'} py-3.5 rounded-2xl bg-gradient-to-r from-[#07193F] to-[#0A255C] hover:from-[#0a2356] hover:to-[#0f347e] text-white text-xs font-black neu-upper-sm active:scale-95 transition-all cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Profile Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isMandatory ? 'Save Photo & Continue to App' : 'Save Profile'}</span>
                  {isMandatory && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
