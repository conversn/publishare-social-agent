import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight, Star, Shield, TrendingUp, Zap, Users, Award, Phone } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - CallReady Style */}
      <section className="relative bg-white">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Trust Badge - Performance Based */}
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-8">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-green-700 text-sm font-medium">Performance-based pricing</span>
            </div>
            
            {/* Main Headline - Direct Value Prop */}
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              AI-Powered Content
              <span className="block text-green-600">that converts</span>
            </h1>
            
            {/* Value Proposition - Performance Focused */}
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Performance-based content creation for registered investment advisors, insurance producers, and wealth management firms. 
              <span className="font-semibold text-gray-900">Pay only for measurable outcomes.</span>
            </p>
            
            {/* Social Proof - Results Focused */}
            <div className="flex items-center justify-center gap-8 mb-10 text-gray-500">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm">300% avg. conversion lift</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-sm">2,000+ active users</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="text-sm">SEC compliant</span>
              </div>
            </div>
            
            {/* Primary CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button className="bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8 py-4 rounded-lg font-semibold transition-all">
                Book Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <p className="text-gray-500 text-sm">
              No setup fees • 14-day free trial • Cancel anytime • Enterprise security
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof Section - CallReady Style */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Trusted by leading financial firms
            </h2>
            <div className="flex items-center justify-center gap-8 opacity-60">
              <div className="text-gray-600 font-semibold">Morgan Stanley</div>
              <div className="text-gray-600 font-semibold">Goldman Sachs</div>
              <div className="text-gray-600 font-semibold">Fidelity</div>
              <div className="text-gray-600 font-semibold">Vanguard</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Performance Focused */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Performance-driven content platform
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Every feature designed to drive measurable business outcomes
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-8 rounded-lg bg-gray-50 border border-gray-200">
              <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Interactive Calculators</h3>
              <p className="text-gray-600 mb-6">
                Build ROI calculators and pricing tools that capture qualified leads
              </p>
              <div className="text-sm text-green-600 font-medium">→ 3x more conversions</div>
            </div>
            
            {/* Feature 2 */}
            <div className="text-center p-8 rounded-lg bg-gray-50 border border-gray-200">
              <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Performance Analytics</h3>
              <p className="text-gray-600 mb-6">
                Track engagement, conversions, and ROI with enterprise-grade analytics
              </p>
              <div className="text-sm text-green-600 font-medium">→ Prove content ROI</div>
            </div>
            
            {/* Feature 3 */}
            <div className="text-center p-8 rounded-lg bg-gray-50 border border-gray-200">
              <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">SEC Compliance</h3>
              <p className="text-gray-600 mb-6">
                SOC 2 compliant with enterprise-grade security and data protection
              </p>
              <div className="text-sm text-green-600 font-medium">→ Enterprise ready</div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              "Our conversion rate increased 300%"
            </h2>
            <p className="text-xl text-gray-300">
              Real results from real customers
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-green-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-6">
                "Publishare transformed our content strategy. We went from 2% to 8% conversion rate in just 3 months."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-full"></div>
                <div>
                  <div className="font-semibold">Sarah Chen</div>
                  <div className="text-gray-400 text-sm">Marketing Director, TechFlow</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-green-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-6">
                "The interactive calculators alone generated 500+ qualified leads in our first month."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-full"></div>
                <div>
                  <div className="font-semibold">Mike Rodriguez</div>
                  <div className="text-gray-400 text-sm">CEO, GrowthLab</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Ready to drive real results?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join 2,000+ teams creating content that actually converts. Start your free trial today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4 rounded-lg font-semibold shadow-lg">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button className="bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8 py-4 rounded-lg font-semibold">
              Schedule Demo
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>No setup fees</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>SEC compliant</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
