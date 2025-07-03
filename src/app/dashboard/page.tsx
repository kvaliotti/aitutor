'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'

interface User {
  id: string
  email: string
  createdAt: string
}

interface LearningProgress {
  totalConcepts: number
  completedConcepts: number
  currentStreak: number
  learningLevel: number
  completionRate: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [progress, setProgress] = useState<LearningProgress | null>(null)
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

    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/library/overview')
        if (response.ok) {
          const data = await response.json()
          setProgress({
            totalConcepts: data.stats?.totalConcepts || 0,
            completedConcepts: data.stats?.completedConcepts || 0,
            currentStreak: data.stats?.currentStreak || 0,
            learningLevel: data.stats?.learningLevel || 1,
            completionRate: data.stats?.completionRate || 0
          })
        }
      } catch (error) {
        console.error('Error fetching progress:', error)
        // Set default values
        setProgress({
          totalConcepts: 0,
          completedConcepts: 0,
          currentStreak: 0,
          learningLevel: 1,
          completionRate: 0
        })
      }
    }

    fetchUser()
    fetchProgress()
  }, [router])

  const getLevelName = (level: number) => {
    const levels = ['Beginner', 'Explorer', 'Learner', 'Scholar', 'Expert', 'Master']
    return levels[Math.min(level - 1, levels.length - 1)] || 'Beginner'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading your learning platform...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} variant="full" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Education Platform
            </h1>
            <p className="text-gray-600">
              Welcome back, <span className="font-semibold text-blue-600">{user.email.split('@')[0]}</span>! 
              Choose your learning agent to continue your journey.
            </p>
          </div>

          {/* Learning Progress Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Your Learning Progress</h2>
              <p className="text-blue-50">Track your achievements across all learning agents</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">{progress?.completedConcepts || 0}</div>
                <div className="text-sm text-blue-50">Concepts Mastered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">{progress?.currentStreak || 0} 🔥</div>
                <div className="text-sm text-blue-50">Learning Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {getLevelName(progress?.learningLevel || 1)}
                </div>
                <div className="text-sm text-blue-50">Learning Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">{Math.round(progress?.completionRate || 0)}%</div>
                <div className="text-sm text-blue-50">Overall Progress</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2 text-white">
                <span>Progress to next level</span>
                <span>{Math.round(progress?.completionRate || 0)}%</span>
              </div>
              <div className="w-full bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${Math.min(progress?.completionRate || 0, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* AI Agents Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Choose Your Learning Agent</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Concept Learning Agents Crew - Active */}
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-green-200">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">🤖</div>
                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                      ACTIVE
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Concept Learning Crew</h3>
                  <p className="text-green-50 text-sm">
                    AI-powered tutoring with personalized learning plans and concept mapping
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-green-600 mr-2">✓</span>
                      Personalized learning plans
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-green-600 mr-2">✓</span>
                      Interactive concept mapping
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-green-600 mr-2">✓</span>
                      Progress tracking & achievements
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push('/tutor')}
                      className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Start Learning Session
                    </button>
                    <button
                      onClick={() => router.push('/library')}
                      className="w-full bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      View Concept Library
                    </button>
                  </div>
                </div>
              </div>

              {/* CBT Psychotherapist - Active */}
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-blue-200">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">🧠</div>
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                      ACTIVE
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">CBT Psychotherapist</h3>
                  <p className="text-blue-50 text-sm">
                    AI-powered CBT guidance for personal growth and emotional well-being
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-blue-600 mr-2">✓</span>
                      CBT techniques & strategies
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-blue-600 mr-2">✓</span>
                      Therapeutic goal setting
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-blue-600 mr-2">✓</span>
                      Progress tracking & exercises
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push('/therapy')}
                      className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Therapy Session
                    </button>
                    <div className="text-xs text-gray-500 text-center">
                      Educational support tool
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiz Agent - Coming Soon */}
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-orange-200">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">🧠</div>
                    <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold">
                      COMING SOON
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Quiz Agent</h3>
                  <p className="text-orange-50 text-sm">
                    Adaptive quizzes and assessments to test your knowledge and reinforce learning
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-orange-600 mr-2">⏳</span>
                      Adaptive quiz generation
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-orange-600 mr-2">⏳</span>
                      Spaced repetition system
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-orange-600 mr-2">⏳</span>
                      Performance analytics
                    </div>
                  </div>
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-600 font-semibold py-3 px-4 rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Join the waitlist for early access
                  </p>
                </div>
              </div>

              {/* KeepUp Agent - Coming Soon */}
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-purple-200">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">📈</div>
                    <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                      COMING SOON
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">KeepUp Agent</h3>
                  <p className="text-purple-50 text-sm">
                    Stay current with industry trends and continuously update your knowledge
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-purple-600 mr-2">⏳</span>
                      Industry trend monitoring
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-purple-600 mr-2">⏳</span>
                      Personalized updates
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-purple-600 mr-2">⏳</span>
                      Skill gap analysis
                    </div>
                  </div>
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-600 font-semibold py-3 px-4 rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Be notified when available
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Platform Capabilities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">50+</div>
                <div className="text-sm text-gray-700">Subject Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">4</div>
                <div className="text-sm text-gray-700">AI Learning Agents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-1">∞</div>
                <div className="text-sm text-gray-700">Learning Paths</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600 mb-1">24/7</div>
                <div className="text-sm text-gray-700">AI Availability</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 