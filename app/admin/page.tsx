'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/integrations/supabase/client'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  is_active: boolean
  article_count: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [systemStats, setSystemStats] = useState<any>(null)
  const [viewingAsUser, setViewingAsUser] = useState<User | null>(null)
  const [switchingUser, setSwitchingUser] = useState<string | null>(null)

  useEffect(() => {
    loadAdminData()
  }, [])

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredUsers(filtered)
  }, [users, searchTerm])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First, check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (roleError || roleData?.role !== 'admin') {
        setError('Admin access required')
        return
      }

      setDebugInfo({
        user_id: session.user.id,
        user_email: session.user.email,
        admin_role: roleData?.role
      })

      // Load system stats
      await loadSystemStats()

      // Load users
      await loadUsers()

    } catch (error) {
      console.error('Error loading admin data:', error)
      setError(`General error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const loadSystemStats = async () => {
    try {
      // Get total articles
      const { count: totalArticles } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })

      // Get total calculators
      const { count: totalCalculators } = await supabase
        .from('quiz_sessions')
        .select('*', { count: 'exact', head: true })

      setSystemStats({
        total_articles: totalArticles || 0,
        total_calculators: totalCalculators || 0
      })

    } catch (error) {
      console.error('Error loading system stats:', error)
    }
  }

  const loadUsers = async () => {
    try {
      // Load profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at
        `)

      if (profilesError) {
        console.error('Profiles error:', profilesError)
        setError(`Profiles error: ${profilesError.message}`)
        return
      }

      // Load user roles separately
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role
        `)

      if (rolesError) {
        console.error('Roles error:', rolesError)
        setError(`Roles error: ${rolesError.message}`)
        return
      }

      // Create a map of user roles
      const rolesMap = new Map()
      rolesData?.forEach(role => {
        rolesMap.set(role.user_id, role.role)
      })

      // Transform the data
      const transformedUsers: User[] = (profilesData || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name,
        role: rolesMap.get(profile.id) || 'user',
        created_at: profile.created_at,
        is_active: true, // Assume active if they have a profile
        article_count: 0 // We'll load this separately
      }))

      // Load article counts for each user
      for (const user of transformedUsers) {
        const { count: articleCount } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        
        user.article_count = articleCount || 0
      }

      console.log('Users loaded:', transformedUsers)
      setUsers(transformedUsers)
      setFilteredUsers(transformedUsers)

    } catch (error) {
      console.error('Error loading users:', error)
      setError(`Users error: ${error}`)
    }
  }

  const switchToUserContext = async (user: User) => {
    try {
      setSwitchingUser(user.id)
      
      // Store the target user info in localStorage for the dashboard to use
      localStorage.setItem('adminViewingAs', JSON.stringify({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        switched_at: new Date().toISOString()
      }))

      // Navigate to dashboard with user context
      router.push('/dashboard?admin_view=true')
      
    } catch (error) {
      console.error('Error switching user context:', error)
      alert('Error switching user context')
    } finally {
      setSwitchingUser(null)
    }
  }

  const removeUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove user ${userEmail}? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete user's data in order
      await supabase.from('articles').delete().eq('user_id', userId)
      await supabase.from('quiz_sessions').delete().eq('user_id', userId)
      await supabase.from('user_roles').delete().eq('user_id', userId)
      await supabase.from('profiles').delete().eq('id', userId)
      
      // Remove user from local state
      setUsers(users.filter(user => user.id !== userId))
      setFilteredUsers(filteredUsers.filter(user => user.id !== userId))
      
      alert(`Successfully removed user ${userEmail}`)
    } catch (error) {
      console.error('Error removing user:', error)
      alert('Error removing user')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Debug Information */}
      {debugInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <Button onClick={loadAdminData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* System Overview */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered users
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.total_articles}</div>
              <p className="text-xs text-muted-foreground">
                Published content
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calculators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.total_calculators}</div>
              <p className="text-xs text-muted-foreground">
                Interactive content
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <p className="text-xs text-muted-foreground">
                With admin access
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage users and their access. Click "View" to see the dashboard as that user.
          </CardDescription>
          <div className="flex gap-4">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={loadAdminData} variant="outline">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-medium">{user.email}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.full_name || 'No name provided'}
                        </p>
                      </div>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Joined: {new Date(user.created_at).toLocaleDateString()} • 
                      Articles: {user.article_count} • 
                      Status: {user.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* User Actions */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => switchToUserContext(user)}
                      disabled={switchingUser === user.id}
                    >
                      {switchingUser === user.id ? 'Switching...' : 'View as User'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeUser(user.id, user.email)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {error ? 'Error loading users. Check the error message above.' : 
                 searchTerm ? 'No users found matching your search.' : 'No users found.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
