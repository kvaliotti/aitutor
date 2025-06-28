import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/logout - Clear the authentication cookie
export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    // Clear the authentication cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0) // Set to past date to delete cookie
    });

    return response;
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
} 