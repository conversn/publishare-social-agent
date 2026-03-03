'use client'

import { useState, useEffect } from 'react'
import { useAuth, useAppToast } from '@/app/providers'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Shield, 
  Users, 
  Settings, 
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserPlus,
  Key,
  Globe,
  Server
} from 'lucide-react'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalArticles: number
  totalQuizzes: number
  totalCalculators: number
  systemUptime: string
  lastBackup: string
  storageUsed: string
  storageLimit: string
}

interface SystemAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: string
  resolved: boolean
}

export default function AdminPage() {
  const { user } = useAuth()
  const { toast } = useAppToast()
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual admin API calls
      const mockStats: SystemStats = {
        totalUsers: 1247,
        activeUsers: 892,
        totalArticles: 156,
        totalQuizzes: 23,
        totalCalculators: 18,
        systemUptime: '99.9%',
        lastBackup: '2024-12-15T02:00:00Z',
        storageUsed: '2.4 GB',
        storageLimit: '10 GB'
      }

      const mockAlerts: SystemAlert[] = [
        {
          id: '1',
          type: 'success',
          title: 'System Backup Completed',
          message: 'Daily backup completed successfully at 2:00 AM',
          timestamp: '2024-12-15T02:05:00Z',
          resolved: true
        },
        {
          id: '2',
          type: 'info',
          title: 'New User Registration',
          message: '5 new users registered in the last 24 hours',
          timestamp: '2024-12-15T10:30:00Z',
          resolved: false
        },
        {
          id: '3',
          type: 'warning',
          title: 'Storage Usage Alert',
          message: 'Storage usage is at 24% of capacity',
          timestamp: '2024-12-15T08:15:00Z',
          resolved: false
        }
      ]

      setSystemStats(mockStats)
      setAlerts(mockAlerts)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to load admin data: ${error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'info':
        return <Activity className="w-4 h-4 text-blue-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ))
    toast({
      title: 'Alert Resolved',
      description: 'System alert has been marked as resolved',
      variant: 'success'
    })
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                System administration and monitoring
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              System administration and monitoring
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Backup Now
            </Button>
            <Button variant="outline">
              <Activity className="w-4 h-4 mr-2" />
              System Logs
            </Button>
          </div>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats?.activeUsers} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{systemStats?.systemUptime}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.storageUsed}</div>
              <p className="text-xs text-muted-foreground">
                of {systemStats?.storageLimit} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">✓ Complete</div>
              <p className="text-xs text-muted-foreground">
                {systemStats?.lastBackup ? formatDate(systemStats.lastBackup) : 'Unknown'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Content Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Articles</span>
                  <Badge variant="secondary">{systemStats?.totalArticles}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Quizzes</span>
                  <Badge variant="secondary">{systemStats?.totalQuizzes}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Calculators</span>
                  <Badge variant="secondary">{systemStats?.totalCalculators}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(alert.timestamp)}</p>
                    </div>
                    {!alert.resolved && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleResolveAlert(alert.id)}
                        className="text-xs"
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Key className="w-4 h-4 mr-2" />
                  Manage Permissions
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="w-4 h-4 mr-2" />
                  Site Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Database Tools
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Current system status and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">API Status</p>
                  <p className="text-xs text-gray-500">All systems operational</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-gray-500">Connected and healthy</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Storage</p>
                  <p className="text-xs text-gray-500">24% used</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Backup</p>
                  <p className="text-xs text-gray-500">Last backup: 2 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
              </div>
      </div>
    )
  }
