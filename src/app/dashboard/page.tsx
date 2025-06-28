'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  createdAt: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          // If not authenticated, redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookie server-side
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Also clear client-side cookie as backup
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if API fails, still clear cookie and redirect
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/login')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Welcome Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome back!
                </h2>
                <p className="text-lg text-gray-600 mb-2">
                  Hello, <span className="font-semibold text-indigo-600">{user.email}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Account created: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* AI Tutor Card */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow p-6 text-white">
              <div className="text-center">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-bold mb-2">AI Upskilling Tutor</h3>
                <p className="text-blue-100 mb-4">
                  Get personalized tutoring on any topic with our AI-powered learning assistant
                </p>
                <button
                  onClick={() => router.push('/tutor')}
                  className="bg-white text-blue-600 font-semibold py-2 px-6 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Start Learning
                </button>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-3xl mb-3">📚</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized Learning</h3>
                <p className="text-gray-600 text-sm">
                  AI adapts to your learning style and pace for optimal knowledge retention
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Practice-Focused</h3>
                <p className="text-gray-600 text-sm">
                  Hands-on tasks and exercises to solidify your understanding through doing
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                <div className="text-3xl mb-3">📈</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Progress</h3>
                <p className="text-gray-600 text-sm">
                  Visual concept maps and completion tracking to monitor your learning journey
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 