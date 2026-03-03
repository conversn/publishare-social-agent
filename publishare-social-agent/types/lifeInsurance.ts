export interface LifeInsuranceQuestionType {
  id: string;
  title: string;
  subtitle?: string;
  type: "multiple-choice" | "gender" | "slider" | "input" | "multi-select" | "dropdown" | "date-picker" | "number-input" | "dual-input" | "conditional-branch";
  answers?: {
    id: string;
    text: string;
    value: string;
    icon?: string;
    subtitle?: string;
  }[];
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
    label: string;
    unit?: string;
  };
  inputConfig?: {
    placeholder: string;
    type: string;
    label: string;
  };
  multiSelectConfig?: {
    minSelections: number;
    maxSelections: number;
  };
  dropdownConfig?: {
    placeholder: string;
    options: {
      value: string;
      label: string;
    }[];
  };
  datePickerConfig?: {
    label: string;
    placeholder: string;
  };
  numberInputConfig?: {
    placeholder: string;
    min: number;
    max: number;
    label: string;
    unit: string;
  };
  dualInputConfig?: {
    input1: {
      label: string;
      placeholder?: string;
      min?: number;
      max?: number;
      unit?: string;
      type?: string;
      options?: { value: string; label: string; }[];
    };
    input2: {
      label: string;
      placeholder?: string;
      min?: number;
      max?: number;
      unit?: string;
      type?: string;
      options?: { value: string; label: string; }[];
    };
  };
  conditionalBranchConfig?: {
    options: {
      value: string;
      label: string;
      icon?: string;
      description?: string;
    }[];
  };
}

export interface InsuranceProvider {
  id: string;
  name: string;
  logo: string;
  rating: number;
  ratingSource?: string;
  reviewCount?: number;
  features?: string[];
  startingPrice?: string;
  coverageOptions?: string[];
  applicationTime?: string;
  approvalRate?: string;
  customerService?: string;
  financialStrength?: string;
  pros?: string[];
  cons?: string[];
  whyPicked?: string;
  cta?: string;
  highlight?: string;
}
