import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyTokenString = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

// Updated verifyToken function that works with NextRequest and returns user data
export const verifyToken = async (request: NextRequest): Promise<{ id: string, email: string } | null> => {
  try {
    const token = request.cookies.get('token')?.value

    if (!token) {
      return null
    }

    const decoded = verifyTokenString(token)

    if (!decoded) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true }
    })

    return user
  } catch {
    return null
  }
} 