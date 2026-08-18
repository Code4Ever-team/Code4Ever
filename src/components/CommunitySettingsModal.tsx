import React, { useState, useRef } from 'react';
import {
  X,
  Settings,
  Image as ImageIcon,
  Trash2,
  UserCheck,
  ArrowRightLeft,
  AlertTriangle,
  Check,
  Upload,
  Crop,
  Shield,
  Users
} from 'lucide-react';
import { Community, UserProfile } from '../types';
import { ImageCropperModal } from './ImageCropperModal';
import { sanitizeText, sanitizeUrl, validateUsername } from '../utils/securityHelper';
import { validateFileSize, notifyFileSizeExceeded } from '../utils/fileUploadHelper';

interface CommunitySettingsModalProps {
  isOpen: boolean;
  community: Community | null;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  language: 'tr' | 'en';
  onClose: () => void;
  onUpdateCommunity: (communityId: string, updatedData: Partial<Community>) => void;
  onDeleteCommunity: (communityId: string) => void;
  onTransferOwnership: (communityId: string, newOwnerUsername: string, newOwnerId: string) => void;
}

export const CommunitySettingsModal: React.FC<CommunitySettingsModalProps> = ({
  isOpen,
  community,
  currentUser,
  allUsers,
  language,
  onClose,
  onUpdateCommunity,
  onDeleteCommunity,
  onTransferOwnership
}) => {
  if (!isOpen || !community) return null;

  const isOwner =
    community.created_by === currentUser.id ||
    community.creator_username?.toLowerCase() === currentUser.username.toLowerCase() ||
    currentUser.isAdmin === true ||
    currentUser.role === 'admin' ||
    currentUser.role === 'Founder';

  const [name, setName] = useState(community.name || '');
  const [handle, setHandle] = useState(community.handle?.replace(/^@/, '') || '');
  const [description, setDescription] = useState(community.description || '');
  const [avatarUrl, setAvatarUrl] = useState(community.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(community.banner_url || '');
  
  // Transfer ownership state
  const [transferTargetUsername, setTransferTargetUsername] = useState('');
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  
  // Delete community state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Image Cropper State
  const [cropImageRaw, setCropImageRaw] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperType, setCropperType] = useState<'avatar' | 'banner'>('avatar');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileSize(file, currentUser);
    if (!validation.isValid) {
      notifyFileSizeExceeded(validation);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setCropImageRaw(ev.target.result as string);
        setCropperType(type);
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    if (cropperType === 'avatar') {
      setAvatarUrl(croppedDataUrl);
    } else {
      setBannerUrl(croppedDataUrl);
    }
    setSuccessMessage(
      language === 'tr' ? 'Fotoğraf başarıyla kırpıldı ve yüklendi.' : 'Photo successfully cropped.'
    );
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage(language === 'tr' ? 'Topluluk adı boş olamaz!' : 'Community name cannot be empty!');
      return;
    }

    const cleanHandle = handle.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
    if (cleanHandle.length < 2) {
      setErrorMessage(language === 'tr' ? 'Topluluk kullanıcı adı en az 2 karakter olmalıdır.' : 'Handle must be at least 2 characters.');
      return;
    }

    const updatedData: Partial<Community> = {
      name: sanitizeText(name, 60),
      handle: `@${cleanHandle}`,
      description: description ? sanitizeText(description, 300) : '',
      avatar_url: sanitizeUrl(avatarUrl) || community.avatar_url,
      banner_url: bannerUrl ? sanitizeUrl(bannerUrl) : undefined,
      updated_at: new Date().toISOString()
    };

    onUpdateCommunity(community.id, updatedData);
    setSuccessMessage(language === 'tr' ? 'Topluluk bilgileri güncellendi!' : 'Community updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanTarget = transferTargetUsername.trim().toLowerCase().replace(/^@/, '');
    if (!cleanTarget) return;

    if (cleanTarget === currentUser.username.toLowerCase()) {
      setErrorMessage(language === 'tr' ? 'Sahipliği zaten kendinize devredemezsiniz.' : 'You are already the owner.');
      return;
    }

    const targetUser = allUsers.find(
      (u) => (u.username || '').toLowerCase().replace(/^@/, '') === cleanTarget
    );

    if (!targetUser) {
      setErrorMessage(
        language === 'tr'
          ? `"${transferTargetUsername}" kullanıcı adında bir hesap bulunamadı!`
          : `User "${transferTargetUsername}" not found!`
      );
      return;
    }

    onTransferOwnership(community.id, targetUser.username, targetUser.id);
    setShowTransferConfirm(false);
    onClose();
  };

  const handleDeleteSubmit = () => {
    if (deleteConfirmationText.trim().toLowerCase() !== community.name.toLowerCase()) {
      setErrorMessage(
        language === 'tr'
          ? `Lütfen silme işlemini onaylamak için tam olarak "${community.name}" yazın.`
          : `Please type "${community.name}" to confirm deletion.`
      );
      return;
    }

    onDeleteCommunity(community.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <div className="bg-[#121215] border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative text-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{language === 'tr' ? 'Topluluk Ayarları' : 'Community Settings'}</span>
                  {isOwner && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                      {language === 'tr' ? 'Kurucu / Sahip' : 'Owner'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">{community.name} ({community.handle})</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {!isOwner && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                <span>{language === 'tr' ? 'Salt Okunur Mod' : 'Read-Only Mode'}</span>
              </div>
              <p className="text-zinc-400">
                {language === 'tr'
                  ? 'Yalnızca topluluğun kurucusu veya platform yöneticileri bu ayarları değiştirebilir.'
                  : 'Only the community owner or platform admins can modify these settings.'}
              </p>
            </div>
          )}

          {/* Main Edit Form */}
          <form onSubmit={handleSaveGeneral} className="space-y-5">
            {/* Avatar & Photo Management */}
            <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-4">
              <label className="text-xs font-bold text-zinc-300 font-mono block">
                {language === 'tr' ? 'Topluluk Logosu / Fotoğrafı:' : 'Community Avatar / Photo:'}
              </label>

              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl || community.avatar_url}
                  alt="Community Logo"
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-zinc-700 bg-zinc-900 shadow-md"
                />

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileSelect(e, 'avatar')}
                      disabled={!isOwner}
                    />
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{language === 'tr' ? 'Bilgisayardan Fotoğraf Yükle' : 'Upload from PC'}</span>
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        disabled={!isOwner}
                        onClick={() => {
                          setCropImageRaw(avatarUrl);
                          setCropperType('avatar');
                          setIsCropperOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition-colors disabled:opacity-40"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>{language === 'tr' ? 'Kırp / Yeniden Düzenle' : 'Crop / Edit'}</span>
                      </button>
                    )}

                    {avatarUrl && (
                      <button
                        type="button"
                        disabled={!isOwner}
                        onClick={() => {
                          setAvatarUrl('');
                          setSuccessMessage(language === 'tr' ? 'Fotoğraf sıfırlandı.' : 'Photo reset.');
                        }}
                        className="p-1.5 rounded-xl bg-zinc-900 text-red-400 hover:bg-red-500/10 border border-zinc-800 text-xs transition-colors disabled:opacity-40"
                        title={language === 'tr' ? 'Fotoğrafı Sil' : 'Remove Photo'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    {language === 'tr' ? 'Maks 15MB (JPEG, PNG, WebP). Dahili editör ile kırpılabilir.' : 'Max 15MB. Can be cropped with in-site editor.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Name & Handle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 font-mono">
                    {language === 'tr' ? 'Topluluk Adı:' : 'Community Name:'}
                  </label>
                  {name && isOwner && (
                    <button
                      type="button"
                      onClick={() => setName('')}
                      className="text-[10px] text-zinc-500 hover:text-red-400 font-mono"
                    >
                      {language === 'tr' ? 'Temizle' : 'Clear'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOwner}
                  placeholder="ör: React Türkiye"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 font-mono">
                  {language === 'tr' ? 'Kullanıcı Adı / Handle:' : 'Handle:'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-xs">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    disabled={!isOwner}
                    placeholder="react_tr"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-500 disabled:opacity-50"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description / Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 font-mono">
                  {language === 'tr' ? 'Topluluk Açıklaması / Bio:' : 'Description / Bio:'}
                </label>
                {description && isOwner && (
                  <button
                    type="button"
                    onClick={() => setDescription('')}
                    className="text-[10px] text-zinc-500 hover:text-red-400 font-mono"
                  >
                    {language === 'tr' ? 'Açıklamayı Sil' : 'Clear Bio'}
                  </button>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isOwner}
                rows={3}
                placeholder={
                  language === 'tr'
                    ? 'Topluluk hakkında kısa bilgi...'
                    : 'A short description about this community...'
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500 disabled:opacity-50"
              />
            </div>

            {/* Save Button */}
            {isOwner && (
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-zinc-950" />
                  <span>{language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </form>

          {/* Owner Actions: Ownership Transfer & Deletion */}
          {isOwner && (
            <div className="border-t border-zinc-800/80 pt-5 space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">
                {language === 'tr' ? 'Gelişmiş Yönetim & Sahiplik' : 'Advanced Management'}
              </h4>

              {/* Ownership Transfer */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-200 text-xs font-bold">
                    <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
                    <span>{language === 'tr' ? 'Topluluk Sahipliğini Aktar' : 'Transfer Ownership'}</span>
                  </div>
                </div>

                {!showTransferConfirm ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={transferTargetUsername}
                      onChange={(e) => setTransferTargetUsername(e.target.value)}
                      placeholder={language === 'tr' ? 'Devredilecek @kullanıcı_adı' : 'New owner @username'}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (transferTargetUsername.trim()) setShowTransferConfirm(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                    >
                      {language === 'tr' ? 'Aktar...' : 'Transfer...'}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                    <p className="text-xs text-amber-300 font-medium">
                      {language === 'tr'
                        ? `Bu topluluğun tüm yetkilerini ve sahipliğini "@${transferTargetUsername}" hesabına aktarmak istediğinize emin misiniz?`
                        : `Are you sure you want to transfer ownership to "@${transferTargetUsername}"?`}
                    </p>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowTransferConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs hover:bg-zinc-800"
                      >
                        {language === 'tr' ? 'Vazgeç' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleTransferSubmit}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
                      >
                        {language === 'tr' ? 'Evet, Sahipliği Aktar' : 'Confirm Transfer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Danger Zone: Delete Community */}
              <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <Trash2 className="w-4 h-4" />
                    <span>{language === 'tr' ? 'Topluluğu Tamamen Sil' : 'Delete Community'}</span>
                  </div>
                  {!showDeleteConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-semibold transition-all cursor-pointer"
                    >
                      {language === 'tr' ? 'Topluluğu Sil...' : 'Delete...'}
                    </button>
                  )}
                </div>

                {showDeleteConfirm && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-red-300 font-mono">
                      {language === 'tr'
                        ? `Bu işlem geri alınamaz. Onaylamak için lütfen topluluk adı olan "${community.name}" yazın:`
                        : `This cannot be undone. Type "${community.name}" to confirm:`}
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      placeholder={community.name}
                      className="w-full bg-black/60 border border-red-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-red-500"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmationText('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs hover:bg-zinc-800"
                      >
                        {language === 'tr' ? 'Vazgeç' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSubmit}
                        disabled={deleteConfirmationText.trim().toLowerCase() !== community.name.toLowerCase()}
                        className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-40"
                      >
                        {language === 'tr' ? 'Topluluğu Kalıcı Olarak Sil' : 'Permanently Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropImageRaw}
        aspectRatio={cropperType === 'avatar' ? 'square' : 'banner'}
        language={language}
        onClose={() => {
          setIsCropperOpen(false);
          setCropImageRaw(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};
