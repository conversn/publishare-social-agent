import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Linkedin, 
  Twitter, 
  Youtube,
  ArrowRight
} from 'lucide-react'

const footerColumns = [
  {
    heading: "Product",
    links: [
      { label: "Content Studio", href: "/product/content-studio" },
      { label: "Interactive Builder", href: "/product/interactive" },
      { label: "Analytics & ROI", href: "/product/analytics" },
      { label: "AI Assist", href: "/product/ai" },
      { label: "Integrations", href: "/integrations" }
    ]
  },
  {
    heading: "Solutions",
    links: [
      { label: "SaaS", href: "/solutions/saas" },
      { label: "Financial Services", href: "/solutions/finance" },
      { label: "Agencies", href: "/solutions/agencies" },
      { label: "E‑commerce", href: "/solutions/ecommerce" },
      { label: "Education", href: "/solutions/education" }
    ]
  },
  {
    heading: "Resources",
    links: [
      { label: "Case Studies", href: "/case-studies" },
      { label: "Blog", href: "/blog" },
      { label: "Guides", href: "/guides" },
      { label: "Webinars", href: "/webinars" }
    ]
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Security", href: "/security" },
      { label: "Contact", href: "/contact" }
    ]
  }
]

const legalLinks = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "DPA", href: "/legal/dpa" }
]

const socialLinks = [
  { network: "LinkedIn", href: "https://www.linkedin.com/company/publishare", icon: Linkedin },
  { network: "X", href: "https://x.com/publishare", icon: Twitter },
  { network: "YouTube", href: "https://youtube.com/@publishare", icon: Youtube }
]

export function Footer() {
  return (
    <footer className="bg-[#1B263B] text-white">
      <div className="container-max py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-[#00C2A8] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold">Publishare</span>
            </div>
            <p className="text-[#F5F7FA]/70 mb-6 leading-relaxed">
              Publishare is the platform where content meets results — bringing publishing, sharing, interactivity, and analytics into one seamless experience.
            </p>
            
            {/* Newsletter */}
            <div className="space-y-4">
              <h4 className="font-semibold">Get smarter about content ROI</h4>
              <div className="flex">
                <Input 
                  placeholder="you@company.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-r-none focus:ring-[#00C2A8]"
                />
                <Button className="bg-[#00C2A8] hover:bg-[#00A894] rounded-l-none px-4">
                  Subscribe
                </Button>
              </div>
              <p className="text-sm text-[#F5F7FA]/50">You're in. Watch your inbox.</p>
            </div>
          </div>

          {/* Footer Columns */}
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h4 className="font-semibold mb-4">{column.heading}</h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link 
                      href={link.href}
                      className="text-[#F5F7FA]/70 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-6">
              <span className="text-sm text-[#F5F7FA]/50">
                © 2024 Publishare. All rights reserved.
              </span>
              <div className="flex space-x-4">
                {legalLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-[#F5F7FA]/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <Link
                    key={social.network}
                    href={social.href}
                    className="text-[#F5F7FA]/50 hover:text-white transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
