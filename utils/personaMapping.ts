// Utility functions for persona mapping
export function getPersonaFromCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'finance': 'financial-planner',
    'insurance': 'insurance-seeker',
    'retirement': 'retirement-planner',
    'investment': 'investor',
    'healthcare': 'health-conscious',
    'real-estate': 'homeowner',
    'default': 'general'
  };
  
  return categoryMap[category.toLowerCase()] || categoryMap.default;
}

export function getPersonaDisplayName(persona: string): string {
  const displayNames: Record<string, string> = {
    'financial-planner': 'Financial Planner',
    'insurance-seeker': 'Insurance Seeker',
    'retirement-planner': 'Retirement Planner',
    'investor': 'Investor',
    'health-conscious': 'Health Conscious',
    'homeowner': 'Homeowner',
    'general': 'General Audience'
  };
  
  return displayNames[persona] || 'General Audience';
}

