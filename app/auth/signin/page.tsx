'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { AuthDiagnostics } from '@/components/features/auth/AuthDiagnostics'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const router = useRouter()

  // Debug: Check current session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setDebug(`Current session: ${session ? 'Active' : 'None'} - User: ${session?.user?.email || 'None'}`)
      } catch (err) {
        setDebug(`Session check error: ${err}`)
      }
    }
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setDebug('Starting sign-in process...')

    // Add a progress indicator
    const progressInterval = setInterval(() => {
      setDebug(prev => {
        if (prev.includes('Starting sign-in process...')) return 'Connecting to authentication service...'
        if (prev.includes('Connecting to authentication service...')) return 'Verifying credentials...'
        if (prev.includes('Verifying credentials...')) return 'Setting up your session...'
        return prev
      })
    }, 3000)

    try {
      console.log('🔍 Attempting sign-in with:', { email })
      
      // Log network status for debugging
      if (navigator.onLine) {
        console.log('🌐 Network: Online')
      } else {
        console.warn('⚠️ Network: Offline - this may cause sign-in issues')
        setDebug('Network appears to be offline. Please check your internet connection.')
      }
      
      // Add timeout to prevent hanging (increased to 30 seconds for better reliability)
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign-in timeout after 30 seconds. Please check your internet connection and try again.')), 30000)
      })

      const result = await Promise.race([signInPromise, timeoutPromise]) as any
      const { data, error } = result

      console.log('🔍 Sign-in result:', { data, error })

      if (error) {
        console.error('❌ Sign-in error:', error)
        setError(error.message)
        setDebug(`Error: ${error.message}`)
      } else if (data.user) {
        console.log('✅ Sign-in successful:', data.user.email)
        setDebug(`Sign-in successful! User: ${data.user.email}`)
        
        // Wait a moment for session to be set
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if user needs onboarding
        console.log('🔄 Checking onboarding status...')
        setDebug('Checking onboarding status...')
        
        try {
          const { getRedirectPath } = await import('@/utils/onboardingUtils')
          const redirectPath = await getRedirectPath(data.user.id)
          
          console.log('🔄 Redirecting to:', redirectPath)
          setDebug(`Redirecting to ${redirectPath}...`)
          
          router.push(redirectPath)
          console.log('✅ router.push() called')
        } catch (redirectError) {
          console.error('❌ Redirect failed:', redirectError)
          setDebug('Redirect failed, trying dashboard...')
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      
      // Handle timeout errors specifically
      if (error.message && error.message.includes('timeout')) {
        setError('Sign-in is taking longer than expected. This might be due to a slow internet connection or temporary service issues. Please try again.')
        setDebug(`Timeout error: ${error.message}`)
      } else {
        setError(error.message || 'An unexpected error occurred during sign-in. Please try again.')
        setDebug(`Unexpected error: ${error.message || error}`)
      }
    } finally {
      clearInterval(progressInterval)
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        setError(error.message)
      }
    } catch (error) {
      setError('Failed to sign in with Google')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome back to Publishare
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {debug && (
                <div className="flex items-center gap-2 p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  {debug}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="/auth/signup" className="font-medium text-green-600 hover:text-green-500">
                  Sign up
                </a>
              </p>
            </div>

            {/* Show diagnostics if there are errors */}
            {error && (
              <div className="mt-6">
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                    Having trouble? Click to run diagnostics
                  </summary>
                  <div className="mt-3">
                    <AuthDiagnostics />
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
