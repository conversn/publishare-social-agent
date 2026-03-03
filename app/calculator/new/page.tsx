'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/app/providers'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCalculatorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    quiz_type: '',
    description: '',
    questions: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    try {
      // Create a test quiz session to simulate calculator creation
      const { data, error } = await supabase
        .from('quiz_sessions')
        .insert({
          quiz_type: formData.quiz_type,
          user_id: user.id,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error('Error creating calculator:', error)
        alert('Failed to create calculator. Please try again.')
      } else {
        console.log('Calculator created successfully:', data)
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error creating calculator:', error)
      alert('Failed to create calculator. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to create calculators</h1>
          <Button asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Calculator</CardTitle>
            <CardDescription>
              Build interactive calculators to engage your audience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="quiz_type">Calculator Type</Label>
                <Select
                  value={formData.quiz_type}
                  onValueChange={(value) => setFormData({ ...formData, quiz_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select calculator type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mortgage-calculator">Mortgage Calculator</SelectItem>
                    <SelectItem value="life-insurance-calculator">Life Insurance Calculator</SelectItem>
                    <SelectItem value="retirement-calculator">Retirement Calculator</SelectItem>
                    <SelectItem value="investment-calculator">Investment Calculator</SelectItem>
                    <SelectItem value="loan-calculator">Loan Calculator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this calculator does..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="questions">Questions/Fields</Label>
                <Textarea
                  id="questions"
                  value={formData.questions}
                  onChange={(e) => setFormData({ ...formData, questions: e.target.value })}
                  placeholder="List the questions or input fields for your calculator..."
                  rows={6}
                  required
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Calculator'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
