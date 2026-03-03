
import { QuizQuestionType } from "@/components/quiz/QuizFunnel";

export const financialQuizQuestions: QuizQuestionType[] = [
  {
    id: "age",
    title: "What's your age?",
    type: "slider",
    sliderConfig: {
      min: 18,
      max: 80,
      step: 1,
      label: "Age in years"
    }
  },
  {
    id: "children",
    title: "How many children under 18 do you have?",
    type: "slider",
    sliderConfig: {
      min: 0,
      max: 10,
      step: 1,
      label: "Number of children"
    }
  },
  {
    id: "income",
    title: "What's your annual income?",
    type: "slider",
    sliderConfig: {
      min: 25000,
      max: 500000,
      step: 5000,
      label: "Annual income",
      unit: "$"
    }
  },
  {
    id: "debt",
    title: "What's your total debt?",
    type: "slider",
    sliderConfig: {
      min: 0,
      max: 200000,
      step: 1000,
      label: "Total debt",
      unit: "$"
    }
  },
  {
    id: "housing",
    title: "What's your monthly rent or mortgage payment?",
    type: "slider",
    sliderConfig: {
      min: 500,
      max: 8000,
      step: 100,
      label: "Monthly housing payment",
      unit: "$"
    }
  },
  {
    id: "collegeContrib",
    title: "What's your college contribution goal?",
    type: "slider",
    sliderConfig: {
      min: 0,
      max: 100000,
      step: 5000,
      label: "College savings goal",
      unit: "$"
    }
  },
  {
    id: "monthlySavings",
    title: "How much do you save monthly?",
    type: "slider",
    sliderConfig: {
      min: 0,
      max: 5000,
      step: 50,
      label: "Monthly savings",
      unit: "$"
    }
  },
  {
    id: "totalSavings",
    title: "What's your total savings to date?",
    type: "slider",
    sliderConfig: {
      min: 0,
      max: 500000,
      step: 5000,
      label: "Total savings",
      unit: "$"
    }
  },
  {
    id: "investments",
    title: "What's in your investment/retirement accounts?",
    type: "slider",
    sliderConfig: {
      min: 0,
      max: 1000000,
      step: 10000,
      label: "Investment accounts",
      unit: "$"
    }
  },
  {
    id: "assets",
    title: "What are your additional assets worth?",
    subtitle: "Include home equity, cars, etc.",
    type: "slider",
    sliderConfig: {
      min: 0,
      max: 1000000,
      step: 10000,
      label: "Additional assets",
      unit: "$"
    }
  },
  {
    id: "bigWhy",
    title: "What's your Big Why for financial success?",
    type: "input",
    inputConfig: {
      placeholder: "My motivation for building wealth...",
      type: "text",
      label: "Family security, freedom, etc."
    }
  },
  {
    id: "tenYearGoal",
    title: "What's your 10-year financial goal?",
    type: "input",
    inputConfig: {
      placeholder: "In 10 years I want to...",
      type: "text",
      label: "Own a home, start a business, etc."
    }
  },
  {
    id: "lifeGoal",
    title: "What's your ultimate life goal?",
    type: "input",
    inputConfig: {
      placeholder: "My biggest life aspiration is...",
      type: "text",
      label: "Travel the world, retire early, etc."
    }
  },
  {
    id: "retirementAge",
    title: "At what age do you want to retire?",
    type: "slider",
    sliderConfig: {
      min: 50,
      max: 75,
      step: 1,
      label: "Retirement age"
    }
  },
  {
    id: "retirementIncome",
    title: "What monthly retirement income do you want?",
    type: "slider",
    sliderConfig: {
      min: 2000,
      max: 20000,
      step: 500,
      label: "Monthly retirement income",
      unit: "$"
    }
  },
  {
    id: "name",
    title: "What's your name?",
    subtitle: "First and last name",
    type: "input",
    inputConfig: {
      placeholder: "Your full name",
      type: "text",
      label: "John Smith"
    }
  },
  {
    id: "email",
    title: "What's your email address?",
    type: "input",
    inputConfig: {
      placeholder: "your.email@example.com",
      type: "email",
      label: "john@example.com"
    }
  },
  {
    id: "phone",
    title: "What's your phone number?",
    subtitle: "Optional - for faster service",
    type: "input",
    inputConfig: {
              placeholder: "(888) 440-9669",
      type: "tel",
              label: "(888) 440-9669"
    }
  }
];
