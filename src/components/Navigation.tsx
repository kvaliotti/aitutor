'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface NavigationProps {
  user?: User;
  variant?: 'full' | 'minimal';
}

export function Navigation({ user, variant = 'full' }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/login');
    }
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: '🏠',
      description: 'Overview and quick access'
    },
    {
      name: 'AI Tutor',
      href: '/tutor',
      icon: '🤖',
      description: 'Learn with AI assistance'
    },
    {
      name: 'CBT Therapy',
      href: '/therapy',
      icon: '🧠',
      description: 'CBT psychotherapist support'
    },
    {
      name: 'Library',
      href: '/library',
      icon: '📚',
      description: 'Personal concept library'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const getCurrentPageInfo = () => {
    if (pathname.startsWith('/library')) {
      if (pathname === '/library') return { title: 'Personal Library', subtitle: 'Your learning progress' };
      if (pathname.includes('/category/')) return { title: 'Category', subtitle: 'Browse subjects' };
      if (pathname.includes('/subject/')) return { title: 'Subject', subtitle: 'Concept details' };
      if (pathname.includes('/achievements')) return { title: 'Achievements', subtitle: 'Your badges' };
      return { title: 'Library', subtitle: 'Personal concept library' };
    }
    if (pathname.startsWith('/tutor')) return { title: 'AI Tutor', subtitle: 'Learning session' };
    if (pathname.startsWith('/therapy')) return { title: 'CBT Therapy', subtitle: 'Therapeutic support session' };
    if (pathname === '/dashboard') return { title: 'Dashboard', subtitle: 'Welcome back' };
    return { title: 'Learning Platform', subtitle: 'AI-powered education' };
  };

  const currentPage = getCurrentPageInfo();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="text-2xl">🎓</div>
                <div className="font-semibold text-gray-900">
                  {variant === 'minimal' ? 'AI Tutor' : 'Learning Platform'}
                </div>
              </Link>
            </div>

            {/* Navigation Items */}
            {variant === 'full' && (
              <div className="hidden md:flex items-center space-x-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Current Page Info for minimal variant */}
            {variant === 'minimal' && (
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">{currentPage.title}</h1>
                <p className="text-xs text-gray-600">{currentPage.subtitle}</p>
              </div>
            )}
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center">
            {/* Quick Actions */}
            {variant === 'full' && (
              <div className="hidden lg:flex items-center space-x-2 mr-4">
                <Link
                  href="/tutor"
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Start Learning
                </Link>
                <Link
                  href="/therapy"
                  className="bg-cyan-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-cyan-700 transition-colors"
                >
                  CBT Therapy
                </Link>
                <Link
                  href="/library"
                  className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  View Library
                </Link>
              </div>
            )}

            {/* User Profile Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-2"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-xs text-gray-600">
                      {variant === 'full' ? 'Learner' : 'Account'}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-600">
                          Member since {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Navigation Links (for mobile) */}
                      <div className="md:hidden">
                        {navigationItems.map((item) => (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsProfileOpen(false)}
                            className={`flex items-center px-4 py-2 text-sm ${
                              isActive(item.href)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="mr-3">{item.icon}</span>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.description}</div>
                            </div>
                          </Link>
                        ))}
                        <div className="border-t border-gray-100 my-1"></div>
                      </div>

                      {/* Quick Actions */}
                      <div className="px-4 py-2">
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                          Quick Actions
                        </div>
                        <div className="space-y-1">
                          <Link
                            href="/library/achievements"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center text-sm text-gray-700 hover:text-blue-600"
                          >
                            <span className="mr-2">🏆</span>
                            View Achievements
                          </Link>
                          <Link
                            href="/tutor"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center text-sm text-gray-700 hover:text-blue-600"
                          >
                            <span className="mr-2">🎯</span>
                            Start New Session
                          </Link>
                        </div>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          <span className="mr-3">🚪</span>
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {variant === 'full' && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div>{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
} 