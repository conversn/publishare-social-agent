import { InsuranceProvider } from "@/types/lifeInsurance";

export const mockInsuranceProviders: InsuranceProvider[] = [
  {
    id: "term-life",
    name: "Term Life Insurance Co.",
    logo: "🛡️",
    rating: 4.8,
    ratingSource: "AM Best",
    features: [
      "Competitive rates for healthy applicants",
      "No medical exam options available",
      "Conversion options to permanent insurance",
      "24/7 customer support"
    ],
    whyPicked: "Term Life Insurance Co. consistently offers some of the most competitive rates in the market, especially for healthy individuals. Their no-exam policies make it easy to get coverage quickly, and their conversion options provide flexibility for the future.",
    cta: "Get Quote",
    highlight: "Best Overall Value"
  },
  {
    id: "whole-life",
    name: "Whole Life Solutions",
    logo: "💰",
    rating: 4.6,
    ratingSource: "S&P",
    features: [
      "Cash value accumulation",
      "Fixed premiums for life",
      "Dividend payments",
      "Loan options against cash value"
    ],
    whyPicked: "For those looking to build wealth while protecting their family, Whole Life Solutions offers excellent cash value growth potential with guaranteed premiums that never increase.",
    cta: "Learn More"
  },
  {
    id: "quick-quote",
    name: "QuickQuote Insurance",
    logo: "⚡",
    rating: 4.5,
    ratingSource: "Moody's",
    features: [
      "Instant online quotes",
      "Simplified underwriting",
      "Same-day approval possible",
      "Mobile app management"
    ],
    whyPicked: "Perfect for busy professionals who need coverage fast. QuickQuote's streamlined process can get you covered in as little as 24 hours with their simplified underwriting process.",
    cta: "Get Instant Quote",
    highlight: "Fastest Approval"
  },
  {
    id: "senior-care",
    name: "Senior Care Life",
    logo: "👥",
    rating: 4.7,
    ratingSource: "AM Best",
    features: [
      "Guaranteed acceptance (ages 50-80)",
      "No medical questions",
      "Immediate coverage available",
      "Simplified application process"
    ],
    whyPicked: "Specifically designed for seniors who may have health issues that make traditional life insurance difficult to obtain. Guaranteed acceptance with no medical questions asked.",
    cta: "Apply Now"
  }
];

export const mockFAQs = [
  {
    question: "How were these partners selected?",
    answer: "Our partners are carefully vetted based on financial strength ratings, customer satisfaction scores, product offerings, and competitive pricing. We only work with A-rated insurance companies."
  },
  {
    question: "Will I get the best rate?",
    answer: "Each partner will provide personalized quotes based on your specific information. Rates can vary significantly between companies, so comparing multiple options ensures you get the best available rate."
  },
  {
    question: "Is this service free?",
    answer: "Yes, our comparison service is completely free. We're compensated by our insurance partners, but this doesn't affect the quotes you receive or our recommendations."
  },
  {
    question: "How long does the application process take?",
    answer: "Application times vary by company and coverage amount. Some policies can be approved within 24 hours, while others requiring medical exams may take 4-6 weeks."
  },
  {
    question: "Can I apply for multiple policies?",
    answer: "Yes, you can apply with multiple carriers to compare final offers. There's no obligation to purchase, and you can choose the best option for your needs."
  }
];