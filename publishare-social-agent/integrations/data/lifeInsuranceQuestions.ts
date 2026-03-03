import { LifeInsuranceQuestionType } from "@/types/lifeInsurance";

export const lifeInsuranceQuestions: LifeInsuranceQuestionType[] = [
  {
    id: "gender",
    title: "Select your gender",
    type: "gender",
    answers: [
      { id: "male", text: "Male", icon: "♂", value: "male" },
      { id: "female", text: "Female", icon: "♀", value: "female" }
    ]
  },
  {
    id: "goals",
    title: "What will be your goal with life insurance?",
    type: "multi-select",
    multiSelectConfig: {
      minSelections: 1,
      maxSelections: 5
    },
    answers: [
      { id: "final-expenses", text: "Cover my final expenses", icon: "⚰️", value: "final-expenses" },
      { id: "safety-net", text: "Create a safety net for my family", icon: "🛡️", value: "safety-net" },
      { id: "cash-value", text: "Build long term cash value", icon: "💰", value: "cash-value" },
      { id: "replace-policy", text: "Replace/supplement existing policy", icon: "🔄", value: "replace-policy" },
      { id: "protect-income", text: "Protect my income until retirement", icon: "💼", value: "protect-income" }
    ]
  },
  {
    id: "coverage-amount",
    title: "How much coverage would you like to get?",
    subtitle: "Choose an amount to be paid to your beneficiaries if you were to pass away during the policy term",
    type: "dropdown",
    dropdownConfig: {
      placeholder: "Select coverage amount",
      options: [
        { value: "25000", label: "$25,000" },
        { value: "50000", label: "$50,000" },
        { value: "75000", label: "$75,000" },
        { value: "100000", label: "$100,000" },
        { value: "150000", label: "$150,000" },
        { value: "200000", label: "$200,000" },
        { value: "300000", label: "$300,000" },
        { value: "350000", label: "$350,000" },
        { value: "400000", label: "$400,000" },
        { value: "450000", label: "$450,000" },
        { value: "500000", label: "$500,000" },
        { value: "600000", label: "$600,000" },
        { value: "700000", label: "$700,000" },
        { value: "800000", label: "$800,000" },
        { value: "900000", label: "$900,000" },
        { value: "1000000", label: "$1,000,000" },
        { value: "1250000", label: "$1,250,000" },
        { value: "1500000", label: "$1,500,000" },
        { value: "1750000", label: "$1,750,000" },
        { value: "2000000", label: "$2,000,000" },
        { value: "2250000", label: "$2,250,000" },
        { value: "2500000", label: "$2,500,000" },
        { value: "3000000", label: "$3,000,000" },
        { value: "5000000", label: "$5,000,000" }
      ]
    }
  },
  {
    id: "term-length",
    title: "Choose the number of years that you would need coverage for",
    subtitle: "The term length typically should cover the number of years that your family members will be dependent on you for education, housing, and other living expenses",
    type: "multiple-choice",
    answers: [
      { id: "10-years", text: "10", icon: "📅", value: "10", subtitle: "years" },
      { id: "15-years", text: "15", icon: "📅", value: "15", subtitle: "years" },
      { id: "20-years", text: "20", icon: "📅", value: "20", subtitle: "years" },
      { id: "30-years", text: "30", icon: "📅", value: "30", subtitle: "years" }
    ]
  },
  {
    id: "birth-date",
    title: "When is your birthday?",
    subtitle: "This will help us get you the most affordable coverage",
    type: "date-picker",
    datePickerConfig: {
      label: "Pick your date of birth",
      placeholder: "Select your birthday"
    }
  },
  {
    id: "weight",
    title: "What is your height & weight?",
    subtitle: "We need this information to calculate your rates",
    type: "number-input",
    numberInputConfig: {
      placeholder: "Enter weight",
      min: 50,
      max: 600,
      label: "Weight (lbs)",
      unit: "lbs"
    }
  },
  {
    id: "height",
    title: "Height",
    type: "dual-input",
    dualInputConfig: {
      input1: {
        label: "Height (ft.)",
        type: "select",
        options: [
          { value: "4", label: "4'" },
          { value: "5", label: "5'" },
          { value: "6", label: "6'" },
          { value: "7", label: "7'" }
        ]
      },
      input2: {
        label: "Height (in.)",
        type: "select",
        options: [
          { value: "0", label: "0\"" },
          { value: "1", label: "1\"" },
          { value: "2", label: "2\"" },
          { value: "3", label: "3\"" },
          { value: "4", label: "4\"" },
          { value: "5", label: "5\"" },
          { value: "6", label: "6\"" },
          { value: "7", label: "7\"" },
          { value: "8", label: "8\"" },
          { value: "9", label: "9\"" },
          { value: "10", label: "10\"" },
          { value: "11", label: "11\"" }
        ]
      }
    }
  },
  {
    id: "health-rating",
    title: "How would you rate your health?",
    type: "multiple-choice",
    answers: [
      { id: "excellent", text: "Excellent", icon: "🟢", value: "excellent", subtitle: "Healthy weight, normal cholesterol and blood pressure, no medical conditions" },
      { id: "good", text: "Good", icon: "🟡", value: "good", subtitle: "Normal weight, need some medications, minor pre-existing medical conditions" },
      { id: "fair", text: "Fair", icon: "🟠", value: "fair", subtitle: "Normal weight, need some medications, minor pre-existing medical conditions" }
    ]
  },
  {
    id: "tobacco-use",
    title: "Have you used any tobacco or nicotine products in the last year?",
    subtitle: "Cigarettes, cigars, pipes, vapes, gum, or patches",
    type: "multiple-choice",
    answers: [
      { id: "yes", text: "Yes", icon: "🚬", value: "yes" },
      { id: "no", text: "No", icon: "🚭", value: "no" }
    ]
  },
  {
    id: "zip-code",
    title: "What's your zip code?",
    type: "input",
    inputConfig: {
      placeholder: "Enter zip code",
      type: "text",
      label: "Zip Code"
    }
  },
  {
    id: "full-name",
    title: "Enter your first and last name below",
    type: "input",
    inputConfig: {
      placeholder: "Full Name",
      type: "text",
      label: "Full Name"
    }
  },
  {
    id: "email",
    title: "What's your best email address?",
    subtitle: "We'll need it to get back to you with your quote",
    type: "input",
    inputConfig: {
      placeholder: "your@email.com",
      type: "email",
      label: "Email Address"
    }
  },
  {
    id: "phone",
    title: "What's your best phone number?",
    subtitle: "This helps us to provide more accurate quotes, not just estimates",
    type: "input",
    inputConfig: {
              placeholder: "(888) 440-9669",
      type: "tel",
      label: "Phone Number"
    }
  },
  {
    id: "callback-preference",
    title: "Do you have any preferred time for a callback to confirm your application?",
    subtitle: "We will be able to provide you with more accurate rates and introduce you to better prices and more providers",
    type: "conditional-branch",
    conditionalBranchConfig: {
      options: [
        { value: "call-now", label: "Call Me Now", icon: "📞", description: "We'll call you immediately" },
        { value: "book-later", label: "Book Callback For Later", icon: "📅", description: "Schedule a convenient time" }
      ]
    }
  }
];