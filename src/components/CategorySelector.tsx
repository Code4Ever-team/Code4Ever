import React, { useState, useEffect, useRef } from 'react';
import { Tag, Search, Plus, Check, ChevronDown, X } from 'lucide-react';
import {
  DynamicCategory,
  getStoredCategories,
  addCustomCategory
} from '../utils/categoryHelper';

interface CategorySelectorProps {
  selectedCategoryId: string | null;
  selectedCategoryName?: string;
  onSelectCategory: (categoryId: string, categoryName: string) => void;
  username?: string;
  language: 'tr' | 'en';
  className?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  selectedCategoryName,
  onSelectCategory,
  username,
  language,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<DynamicCategory[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategories(getStoredCategories());
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const exactMatch = categories.find(
    (c) => c.name.toLowerCase() === searchQuery.toLowerCase().trim()
  );

  const handleCreateNew = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const newCat = addCustomCategory(trimmed, '🏷️', username);
    setCategories(getStoredCategories());
    onSelectCategory(newCat.id, newCat.name);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleSelect = (cat: DynamicCategory) => {
    onSelectCategory(cat.id, cat.name);
    setSearchQuery('');
    setIsOpen(false);
  };

  const currentCategory =
    categories.find((c) => c.id === selectedCategoryId) ||
    (selectedCategoryId
      ? {
          id: selectedCategoryId,
          name: selectedCategoryName || selectedCategoryId,
          icon: '🏷️'
        }
      : null);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-xs cursor-pointer transition-all min-h-[38px]"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Tag className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          {currentCategory ? (
            <div className="flex items-center gap-1.5 truncate">
              <span>{currentCategory.icon || '🏷️'}</span>
              <span className="font-semibold text-white truncate">{currentCategory.name}</span>
            </div>
          ) : (
            <span className="text-zinc-500 font-mono text-[11px]">
              {language === 'tr' ? 'Kategori Seç / Oluştur...' : 'Select / Create Category...'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {currentCategory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCategory('genel', 'Genel & Sohbet');
              }}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              title={language === 'tr' ? 'Varsayılana sıfırla' : 'Reset to default'}
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${
              isOpen ? 'rotate-180 text-blue-400' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 p-2 bg-[#121215] border border-zinc-700/80 rounded-2xl shadow-2xl space-y-2 animate-in fade-in zoom-in-95 min-w-[240px]">
          {/* Search / Create Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (exactMatch) {
                    handleSelect(exactMatch);
                  } else if (searchQuery.trim()) {
                    handleCreateNew();
                  } else if (filtered.length > 0) {
                    handleSelect(filtered[0]);
                  }
                }
              }}
              placeholder={
                language === 'tr'
                  ? 'Kategori ara veya yaz...'
                  : 'Search or type category...'
              }
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Quick Create Button if typed query has no exact match */}
          {searchQuery.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate">
                {language === 'tr' ? `"${searchQuery.trim()}" oluştur` : `Create "${searchQuery.trim()}"`}
              </span>
            </button>
          )}

          {/* Category List */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 && !searchQuery.trim() ? (
              <div className="p-3 text-center text-xs text-zinc-500">
                {language === 'tr' ? 'Kategori bulunamadı' : 'No categories found'}
              </div>
            ) : (
              filtered.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{cat.icon || '🏷️'}</span>
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
