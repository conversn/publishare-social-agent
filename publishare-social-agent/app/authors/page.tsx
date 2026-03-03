'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Mail, 
  User, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

interface Author {
  id: string
  name: string
  email: string
  bio?: string | null
  avatar_url?: string | null
  role: string
  is_active: boolean
  permissions?: any
  article_count: number
  created_at?: string
}

interface AuthorInvitation {
  id: string
  invited_email: string
  invited_name: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

export default function AuthorsPage() {
  const { user } = useAuth()
  const [authors, setAuthors] = useState<Author[]>([])
  const [invitations, setInvitations] = useState<AuthorInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'author'
  })
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    if (user) {
      loadAuthors()
      loadInvitations()
    }
  }, [user])

  const loadAuthors = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .rpc('get_user_authors', { user_uuid: user.id })

      if (error) {
        console.error('Error loading authors:', error)
      } else {
        setAuthors(data || [])
      }
    } catch (error) {
      console.error('Error loading authors:', error)
    }
  }

  const loadInvitations = async () => {
    if (!user) return

    try {
      // Temporarily disabled - author_invitations table not in current schema
      // const { data, error } = await supabase
      //   .from('author_invitations')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false })

      // if (error) {
      //   console.error('Error loading invitations:', error)
      // } else {
      //   setInvitations(data || [])
      // }
      setInvitations([])
    } catch (error) {
      console.error('Error loading invitations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteAuthor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsInviting(true)

    try {
      // Temporarily disabled - invite_author RPC not in current schema
      // const { data, error } = await supabase
      //   .rpc('invite_author', {
      //     user_uuid: user.id,
      //     invited_email: inviteForm.email,
      //     invited_name: inviteForm.name,
      //     author_role: inviteForm.role
      //   })

      // if (error) {
      //   console.error('Error inviting author:', error)
      //   alert('Failed to invite author. Please try again.')
      // } else {
      //   console.log('Author invited successfully:', data)
      //   setInviteForm({ email: '', name: '', role: 'author' })
      //   setShowInviteForm(false)
      //   loadInvitations()
      //   alert('Invitation sent successfully!')
      // }
      alert('Author invitations temporarily disabled')
    } catch (error) {
      console.error('Error inviting author:', error)
      alert('Failed to invite author. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'editor': return 'bg-blue-100 text-blue-800'
      case 'contributor': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'declined': return <XCircle className="h-4 w-4 text-red-500" />
      case 'expired': return <XCircle className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading authors...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Authors Management</h1>
          <p className="text-muted-foreground">
            Manage your team of authors and contributors
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard">
              Back to Dashboard
            </Link>
          </Button>
          <Button onClick={() => setShowInviteForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Author
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Authors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{authors.length}</div>
            <p className="text-xs text-muted-foreground">
              {authors.filter(a => a.is_active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations.filter(i => i.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authors.reduce((sum, author) => sum + author.article_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all authors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Invite New Author</h2>
            <form onSubmit={handleInviteAuthor} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="Author's full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="author@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="contributor">Contributor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isInviting} className="flex-1">
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowInviteForm(false)}
                  disabled={isInviting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authors List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Authors</CardTitle>
          <CardDescription>
            Manage your team of content creators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No authors yet</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowInviteForm(true)}>
                Invite your first author
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {authors.map((author) => (
                <div key={author.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{author.name}</h3>
                        <Badge className={getRoleBadgeColor(author.role)}>
                          {author.role}
                        </Badge>
                        {!author.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{author.email}</p>
                                              <p className="text-xs text-muted-foreground">
                          {author.article_count} articles • Joined {author.created_at ? new Date(author.created_at).toLocaleDateString() : 'Unknown'}
                        </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations awaiting response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{invitation.invited_name}</h3>
                        <Badge className={getRoleBadgeColor(invitation.role)}>
                          {invitation.role}
                        </Badge>
                        {getStatusIcon(invitation.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{invitation.invited_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
