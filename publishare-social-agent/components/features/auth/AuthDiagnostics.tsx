'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface DiagnosticResult {
  name: string
  status: 'success' | 'error' | 'warning' | 'loading'
  message: string
  details?: string
}

export function AuthDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async (): Promise<void> => {
    setIsRunning(true)
    const results: DiagnosticResult[] = []

    // Check network connectivity
    results.push({
      name: 'Network Connectivity',
      status: navigator.onLine ? 'success' : 'error',
      message: navigator.onLine ? 'Internet connection available' : 'No internet connection',
      details: navigator.onLine ? 'Network appears to be working' : 'Please check your internet connection'
    })

    // Check Supabase URL configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    results.push({
      name: 'Supabase URL',
      status: supabaseUrl && supabaseUrl !== 'your_supabase_url_here' ? 'success' : 'error',
      message: supabaseUrl ? 'Supabase URL configured' : 'Supabase URL not configured',
      details: supabaseUrl || 'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
    })

    // Check Supabase Key configuration
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    results.push({
      name: 'Supabase Key',
      status: supabaseKey && supabaseKey !== 'your_anon_key_here' ? 'success' : 'error',
      message: supabaseKey ? 'Supabase key configured' : 'Supabase key not configured',
      details: supabaseKey ? 'Key is present' : 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable'
    })

    // Test Supabase connection
    try {
      const startTime = Date.now()
      const { data, error } = await supabase.auth.getSession()
      const responseTime = Date.now() - startTime

      if (error) {
        results.push({
          name: 'Supabase Connection',
          status: 'error',
          message: 'Failed to connect to Supabase',
          details: `Error: ${error.message} (${responseTime}ms)`
        })
      } else {
        results.push({
          name: 'Supabase Connection',
          status: 'success',
          message: 'Successfully connected to Supabase',
          details: `Response time: ${responseTime}ms${data.session ? ' - Session available' : ' - No active session'}`
        })
      }
    } catch (error) {
      results.push({
        name: 'Supabase Connection',
        status: 'error',
        message: 'Connection test failed',
        details: `Exception: ${error instanceof Error ? error.message : String(error)}`
      })
    }

    // Check browser storage
    try {
      const testKey = 'auth_diagnostic_test'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      results.push({
        name: 'Browser Storage',
        status: 'success',
        message: 'Local storage is working',
        details: 'Authentication session can be stored'
      })
    } catch (error) {
      results.push({
        name: 'Browser Storage',
        status: 'error',
        message: 'Local storage is not available',
        details: `Storage error: ${error instanceof Error ? error.message : String(error)}`
      })
    }

    setDiagnostics(results)
    setIsRunning(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'loading':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return null
    }
  }

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'loading':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Authentication Diagnostics</CardTitle>
            <CardDescription>
              Check the status of your authentication setup
            </CardDescription>
          </div>
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {diagnostics.map((diagnostic, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-3 border rounded-lg ${getStatusColor(diagnostic.status)}`}
          >
            {getStatusIcon(diagnostic.status)}
            <div className="flex-1">
              <div className="font-medium text-sm">{diagnostic.name}</div>
              <div className="text-sm text-gray-600">{diagnostic.message}</div>
              {diagnostic.details && (
                <div className="text-xs text-gray-500 mt-1">{diagnostic.details}</div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
