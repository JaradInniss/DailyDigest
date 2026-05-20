'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { toggleCategory } from '@/app/settings/actions';
import { useToast } from '@/hooks/useToast';
import {
  Brain,
  Laptop,
  FlaskConical,
  Orbit,
  ShieldCheck,
  Building2,
  Landmark,
  Vote,
  Leaf,
  HeartPulse,
  Trophy,
  Gamepad2,
  Tv,
  Music,
  Utensils,
  Plane,
  Car,
  Shirt,
  MessageCircle,
  Rocket,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

interface CategoryCardProps {
  id: string;
  slug: string;
  label: string;
  isSelected: boolean;
  todayReportId: string | null;
}

const categoryIcons: Record<string, React.ElementType> = {
  'ai-ml': Brain,
  'tech': Laptop,
  'science': FlaskConical,
  'space': Orbit,
  'cybersecurity': ShieldCheck,
  'business': Building2,
  'finance': Landmark,
  'politics': Vote,
  'environment': Leaf,
  'health': HeartPulse,
  'sports': Trophy,
  'gaming': Gamepad2,
  'entertainment': Tv,
  'music': Music,
  'food': Utensils,
  'travel': Plane,
  'automotive': Car,
  'fashion': Shirt,
  'social-media': MessageCircle,
  'startups': Rocket,
};

type PopoverState = 'hidden' | 'add-to-report' | 'no-report' | 'loading' | 'success' | 'error';

export default function CategoryCard({ id, slug, label, isSelected, todayReportId }: CategoryCardProps) {
  const [isPending, startTransition] = useTransition();
  const [popoverState, setPopoverState] = useState<PopoverState>('hidden');
  const [hasError, setHasError] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const Icon = categoryIcons[slug] || Laptop;
  const { showToast } = useToast();

  // Close popover on click outside
  useEffect(() => {
    if (popoverState === 'hidden') return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // If we were trying to enable, revert the toggle
        if (popoverState === 'add-to-report' || popoverState === 'no-report') {
          // Revert to previous state (toggle back off)
          startTransition(() => {
            toggleCategory(id, false);
          });
        }
        setPopoverState('hidden');
        setHasError(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (popoverState === 'add-to-report' || popoverState === 'no-report') {
          startTransition(() => {
            toggleCategory(id, false);
          });
        }
        setPopoverState('hidden');
        setHasError(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [popoverState, id]);

  const handleToggle = () => {
    if (isPending) return;

    if (!isSelected) {
      startTransition(async () => {
        const result = await toggleCategory(id, true);
        if (result?.error === 'limit_reached') {
          showToast('Category limit reached (8 max). Deselect one to enable another.', 'error');
          await toggleCategory(id, false);
        } else {
          setPopoverState(todayReportId ? 'add-to-report' : 'no-report');
        }
      });
    } else {
      setPopoverState('hidden');
      setHasError(false);
      startTransition(() => {
        toggleCategory(id, false);
      });
    }
  };

  const handleAddToReport = async () => {
    if (!todayReportId) return;

    setPopoverState('loading');

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/reports/${today}/add-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: id }),
      });

      if (!res.ok) {
        throw new Error('API call failed');
      }

      // Mark category as selected in database
      startTransition(() => {
        toggleCategory(id, true);
      });

      setPopoverState('success');
      setTimeout(() => {
        setPopoverState('hidden');
      }, 1500);
    } catch {
      setHasError(true);
      setPopoverState('error');
      // Keep the toggle ON but show error state
      setTimeout(() => {
        setPopoverState('hidden');
        setHasError(false);
      }, 2000);
    }
  };

  const handleNoReportClose = () => {
    // User acknowledges - mark category as selected and close
    startTransition(() => {
      toggleCategory(id, true);
    });
    setPopoverState('hidden');
  };

  const handleCancel = () => {
    // Revert toggle to OFF and close
    startTransition(() => {
      toggleCategory(id, false);
    });
    setPopoverState('hidden');
  };

  const showPopover = popoverState !== 'hidden';
  const showErrorBorder = hasError;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending || popoverState === 'loading'}
        className={`
          relative w-full min-h-[120px] flex flex-col items-center justify-center gap-3 p-6 rounded-xl
          border-2 transition-all duration-200 cursor-pointer
          disabled:opacity-70 disabled:cursor-wait
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#DC2626]
          ${showErrorBorder
            ? 'border-red-500 bg-red-50'
            : isSelected
              ? 'border-[#DC2626] bg-white shadow-md hover:shadow-lg'
              : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
          }
        `}
        aria-pressed={isSelected}
        aria-label={`${label} category${isSelected ? ', selected' : ', not selected'}`}
      >
        {/* Error indicator */}
        {hasError && (
          <div className="absolute top-3 left-3 text-red-500">
            <AlertCircle className="w-4 h-4" size={16} />
          </div>
        )}

        {/* Icon */}
        <div className={`transition-colors duration-200 ${isSelected ? 'text-[#DC2626]' : 'text-gray-400'}`}>
          <Icon className="w-6 h-6" size={24} />
        </div>

        {/* Label */}
        <span className={`text-sm font-medium text-center leading-tight ${isSelected ? 'text-[#450A0A]' : 'text-gray-600'}`}>
          {label}
        </span>

        {/* Selected indicator */}
        <div className={`
          absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center
          transition-all duration-200
          ${isSelected ? 'bg-[#DC2626] text-white' : 'bg-gray-200 text-transparent'}
        `}>
          <Check className="w-3 h-3" size={12} />
        </div>
      </button>

      {/* Inline Confirmation Popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4"
          role="dialog"
          aria-modal="true"
        >
          {popoverState === 'add-to-report' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[#450A0A]">Add to today&apos;s report?</span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleAddToReport}
                  className="w-full px-3 py-2 text-sm font-semibold text-white bg-[#1E40AF] rounded-lg
                             hover:opacity-90 transition-opacity cursor-pointer
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E40AF]"
                >
                  Yes, add it now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    startTransition(() => {
                      toggleCategory(id, true);
                    });
                    setPopoverState('hidden');
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg
                             hover:bg-gray-50 transition-colors cursor-pointer
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
                >
                  No, start from tomorrow
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full px-3 py-2 text-sm font-medium text-[#DC2626] rounded-lg
                             hover:bg-red-50 transition-colors cursor-pointer
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#DC2626]"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {popoverState === 'no-report' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#450A0A]">No report generated yet today.</span>
                <button
                  type="button"
                  onClick={handleNoReportClose}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                The next daily report will include this category.
              </p>
              <button
                type="button"
                onClick={handleNoReportClose}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-[#1E40AF] rounded-lg
                           hover:opacity-90 transition-opacity cursor-pointer
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E40AF]"
              >
                Got it
              </button>
            </>
          )}

          {popoverState === 'loading' && (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {popoverState === 'success' && (
            <div className="flex items-center justify-center py-4 gap-2 text-green-600">
              <Check className="w-4 h-4" size={16} />
              <span className="text-sm font-medium">Added!</span>
            </div>
          )}

          {popoverState === 'error' && (
            <div className="flex items-center justify-center py-4 gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" size={16} />
              <span className="text-sm font-medium">Failed to add</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}