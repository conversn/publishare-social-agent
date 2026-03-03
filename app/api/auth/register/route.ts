import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/integrations/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    try {
      // Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      })

      if (error) {
        console.error('Supabase auth error:', error)
        return NextResponse.json(
          { message: error.message || 'Failed to create user' },
          { status: 400 }
        )
      }

      if (!data.user) {
        return NextResponse.json(
          { message: 'Failed to create user' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { 
          message: 'User created successfully. Please check your email to confirm your account.',
          user: {
            id: data.user.id,
            email: data.user.email,
            name: name,
            created_at: data.user.created_at
          }
        },
        { status: 201 }
      )

    } catch (error) {
      console.error('Supabase client error:', error)
      return NextResponse.json(
        { message: 'Failed to connect to authentication service' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
