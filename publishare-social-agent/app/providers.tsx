'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { ToastContainer } from '@/components/ui/toast'

// Create auth context
const AuthContext = createContext<{
  user: any
  loading: boolean
  error: string | null
}>({
  user: null,
  loading: true,
  error: null,
})

// Create toast context
const ToastContext = createContext<{
  toast: (params: { title?: string; description?: string; variant?: 'default' | 'destructive' | 'success' }) => void
  dismiss: (toastId?: string) => void
}>({
  toast: () => {},
  dismiss: () => {},
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toasts, dismiss, toast } = useToast()

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getSession = async () => {
      try {
        setError(null)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
        } else if (mounted) {
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Error getting session:', error)
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to get session')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          try {
            setError(null)
            setUser(session?.user ?? null)
          } catch (error) {
            console.error('Auth state change error:', error)
            setError(error instanceof Error ? error.message : 'Auth state change failed')
          } finally {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      <ToastContext.Provider value={{ toast, dismiss }}>
        {children}
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </ToastContext.Provider>
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook to use toast context
export const useAppToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useAppToast must be used within a ToastProvider')
  }
  return context
}

