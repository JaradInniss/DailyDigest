'use client';

import { useFormStatus } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import { setUserTimezoneAction } from '@/app/settings/actions';

const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKST)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PST/PDT)' },
  { value: 'America/Denver', label: 'Mountain (MST/MDT)' },
  { value: 'America/Chicago', label: 'Central (CST/CDT)' },
  { value: 'America/New_York', label: 'Eastern (EST/EDT)' },
  { value: 'America/Halifax', label: 'Atlantic (AST)' },
  { value: 'America/St_Johns', label: 'Newfoundland (NST)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia (BRT)' },
  { value: 'Atlantic/Reykjavik', label: 'Iceland (GMT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { value: 'Europe/Helsinki', label: 'Eastern Europe (EET/EEST)' },
  { value: 'Africa/Nairobi', label: 'East Africa (EAT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Bangkok', label: 'Thailand (ICT)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
];

interface TimezoneSelectorProps {
  currentTimezone: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 text-sm font-semibold text-white bg-[#1E40AF] rounded-lg
                 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E40AF]"
    >
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

export default function TimezoneSelector({ currentTimezone }: TimezoneSelectorProps) {
  const [selectedValue, setSelectedValue] = useState(currentTimezone);
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // When the prop changes (e.g., after server action revalidates), update local state
  useEffect(() => {
    setSelectedValue(currentTimezone);
  }, [currentTimezone]);

  // Show loading until hydrated to avoid SSR/client mismatch
  if (!isHydrated) {
    return (
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Your timezone:</label>
        <select disabled className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg bg-gray-100">
          <option>Loading...</option>
        </select>
        <div className="px-4 py-2 text-sm font-semibold text-white bg-[#1E40AF] rounded-lg opacity-50">Save</div>
      </div>
    );
  }

  return (
    <form action={setUserTimezoneAction} className="flex items-center gap-4">
      <label htmlFor="timezone-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Your timezone:
      </label>
      <select
        id="timezone-select"
        name="timezone"
        value={selectedValue}
        onChange={(e) => setSelectedValue(e.target.value)}
        className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white
                   focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC262620]
                   cursor-pointer transition-colors duration-200"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
      <SubmitButton />
    </form>
  );
}