'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Settings } from 'lucide-react';

const navLinks = [
  {
    href: '/',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/history',
    label: 'History',
    icon: History,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 bg-[#1C1917] border-b border-gray-800"
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 text-white font-semibold transition-opacity duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917] rounded-md cursor-pointer"
              aria-label="Daily Digest - Home"
            >
              <svg
                className="w-7 h-7 text-[#DC2626]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span
                className="text-lg font-semibold tracking-tight"
                style={{ fontFamily: 'Newsreader, serif' }}
              >
                Daily Digest
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg
                    text-sm font-medium
                    transition-all duration-200
                    cursor-pointer
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]
                    ${isActive
                      ? 'bg-[#DC2626] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={link.label}
                >
                  <Icon className="w-5 h-5" size={20} />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
