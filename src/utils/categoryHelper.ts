export interface DynamicCategory {
  id: string;
  name: string;
  icon?: string;
  created_by?: string;
  post_count?: number;
}

const STORAGE_KEY = 'code4ever_dynamic_categories';

export const DEFAULT_DYNAMIC_CATEGORIES: DynamicCategory[] = [
  { id: 'genel', name: 'Genel & Sohbet', icon: '💬' },
  { id: 'yazilim', name: 'Yazılım & Kodlama', icon: '💻' },
  { id: 'tasarim', name: 'Tasarım & UI', icon: '🎨' },
  { id: 'soru_cevap', name: 'Soru & Cevap', icon: '❓' },
  { id: 'yapay_zeka', name: 'Yapay Zeka', icon: '🤖' },
  { id: 'proje_vitrini', name: 'Proje Vitrini', icon: '🚀' }
];

export function getStoredCategories(): DynamicCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DYNAMIC_CATEGORIES));
      return DEFAULT_DYNAMIC_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_DYNAMIC_CATEGORIES;
  } catch {
    return DEFAULT_DYNAMIC_CATEGORIES;
  }
}

export function saveStoredCategories(categories: DynamicCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (err) {
    console.error('Failed to save categories to localStorage:', err);
  }
}

export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || `cat_${Date.now()}`;
}

export function addCustomCategory(name: string, icon = '🏷️', username?: string): DynamicCategory {
  const trimmed = name.trim();
  if (!trimmed) {
    return { id: 'genel', name: 'Genel & Sohbet', icon: '💬' };
  }

  const existingList = getStoredCategories();
  const slug = createSlug(trimmed);

  // Check if exists
  const existing = existingList.find(
    (c) => c.id === slug || c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    return existing;
  }

  const newCat: DynamicCategory = {
    id: slug,
    name: trimmed,
    icon: icon || '🏷️',
    created_by: username
  };

  const updatedList = [newCat, ...existingList];
  saveStoredCategories(updatedList);
  return newCat;
}
