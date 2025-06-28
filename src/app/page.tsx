'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image";

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard')
        } else {
          // User is not authenticated, redirect to signup
          router.push('/signup')
        }
      } catch (error) {
        // Error checking auth, redirect to signup
        router.push('/signup')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Redirecting...</div>
    </div>
  )
}
