import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus,
  Calculator,
  BarChart3,
  Settings,
  Copy,
  Eye,
  TrendingUp
} from 'lucide-react'

export default function CalculatorPage() {
  const calculators = [
    {
      id: 1,
      title: "Mortgage Payment Calculator",
      description: "Calculate monthly mortgage payments with taxes and insurance",
      uses: 2341,
      conversion: 8.4,
      status: "Active",
      category: "Real Estate"
    },
    {
      id: 2,
      title: "Life Insurance Needs Calculator",
      description: "Determine the right amount of life insurance coverage",
      uses: 1876,
      conversion: 12.1,
      status: "Active",
      category: "Insurance"
    },
    {
      id: 3,
      title: "Retirement Savings Calculator",
      description: "Plan for retirement with compound interest calculations",
      uses: 1543,
      conversion: 6.7,
      status: "Draft",
      category: "Retirement"
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Publishare Calculator Management</h1>
          <p className="text-muted-foreground">
            Build, manage, and analyze your interactive calculators.
          </p>
        </div>
        <Button asChild>
          <Link href="/calculator/new">
            <Plus className="h-4 w-4 mr-2" />
            New Calculator
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calculators</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +1 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5,760</div>
            <p className="text-xs text-muted-foreground">
              +15.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9.1%</div>
            <p className="text-xs text-muted-foreground">
              +2.3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calculators Grid */}
      <div className="grid gap-6">
        {calculators.map((calculator) => (
          <Card key={calculator.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-xl">{calculator.title}</CardTitle>
                  </div>
                  <CardDescription>{calculator.description}</CardDescription>
                  <div className="flex items-center gap-4">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {calculator.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      calculator.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {calculator.status}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Uses</div>
                    <div className="font-medium">{calculator.uses.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Conversion Rate</div>
                    <div className="font-medium">{calculator.conversion}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Analytics
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-1" />
                    Embed
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {calculators.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Calculator className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No calculators yet</h3>
                <p className="text-muted-foreground">Get started by creating your first calculator.</p>
              </div>
              <Button asChild>
                <Link href="/calculator/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Calculator
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

