import { UserProfile } from '../types';

export const MAX_NORMAL_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_SPARK_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB

// Allowed Safe MIME types
export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

export interface FileSizeValidationResult {
  isValid: boolean;
  errorType?: 'exceeds_normal_15mb' | 'exceeds_spark_250mb' | 'unsupported_file_type';
  fileSizeMB: number;
  maxAllowedMB: number;
  isSpark: boolean;
  fileName: string;
  mimeType?: string;
}

/**
 * Checks if a user has the Spark supporter status / role / badge or admin perks.
 */
export function isUserSpark(user?: Partial<UserProfile> | null): boolean {
  if (!user) return false;
  const username = (user.username || '').toLowerCase().trim().replace(/^@/, '');
  if (username === 'nylithra') return true; // Platform founder/admin has full limits

  const role = (user.role || '').toLowerCase();
  if (role.includes('spark') || role.includes('destek') || role === 'admin' || role === 'founder' || role.includes('yetkili')) {
    return true;
  }

  if (user.badges && Array.isArray(user.badges)) {
    const hasSparkBadge = user.badges.some((b) => {
      const id = (b.id || '').toLowerCase();
      const label = (b.label || '').toLowerCase();
      return id === 'spark' || id === 'c4e_spark' || label.includes('spark') || label.includes('destek');
    });
    if (hasSparkBadge) return true;
  }

  if (user.subscription && user.subscription.isActive) {
    const planId = (user.subscription.planId || '').toLowerCase();
    const planName = (user.subscription.planName || '').toLowerCase();
    if (planId === 'spark' || planName.includes('spark') || planName.includes('destek')) {
      return true;
    }
  }

  return false;
}

/**
 * Validates a file against safe MIME types and user limits (15MB for normal, 250MB for Spark supporters).
 */
export function validateFileSize(file: File, user?: Partial<UserProfile> | null): FileSizeValidationResult {
  const isSparkUser = isUserSpark(user);
  const maxBytes = isSparkUser ? MAX_SPARK_FILE_SIZE_BYTES : MAX_NORMAL_FILE_SIZE_BYTES;
  const maxAllowedMB = isSparkUser ? 250 : 15;
  const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 10) / 10;
  const mime = file.type?.toLowerCase() || '';

  // Validate allowed file types
  const isAllowedImage = ALLOWED_IMAGE_TYPES.has(mime) || file.type.startsWith('image/');
  const isAllowedVideo = ALLOWED_VIDEO_TYPES.has(mime) || file.type.startsWith('video/');

  if (!isAllowedImage && !isAllowedVideo) {
    return {
      isValid: false,
      errorType: 'unsupported_file_type',
      fileSizeMB,
      maxAllowedMB,
      isSpark: isSparkUser,
      fileName: file.name,
      mimeType: mime
    };
  }

  // Enforce size limits
  if (file.size > maxBytes) {
    const errorType = isSparkUser ? 'exceeds_spark_250mb' : 'exceeds_normal_15mb';
    return {
      isValid: false,
      errorType,
      fileSizeMB,
      maxAllowedMB,
      isSpark: isSparkUser,
      fileName: file.name,
      mimeType: mime
    };
  }

  return {
    isValid: true,
    fileSizeMB,
    maxAllowedMB,
    isSpark: isSparkUser,
    fileName: file.name,
    mimeType: mime
  };
}

/**
 * Dispatches a global event for the animated top banner
 */
export function notifyFileSizeExceeded(result: FileSizeValidationResult): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('c4e:file_size_exceeded', {
        detail: result
      })
    );
  }
}
