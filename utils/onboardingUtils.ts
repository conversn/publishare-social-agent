import { supabase } from '@/integrations/supabase/client'

export interface OnboardingStatus {
  businessType?: string
  persona?: string
  onboardingCompleted: boolean
  onboardingCompletedAt?: string
}

/**
 * Check if a user needs to complete onboarding
 */
export async function checkOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('business_type, persona, onboarding_completed, onboarding_completed_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error checking onboarding status:', error)
      return {
        onboardingCompleted: false
      }
    }

    return {
      businessType: data.business_type || undefined,
      persona: data.persona || undefined,
      onboardingCompleted: data.onboarding_completed || false,
      onboardingCompletedAt: data.onboarding_completed_at || undefined
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return {
      onboardingCompleted: false
    }
  }
}

/**
 * Mark onboarding as completed for a user
 */
export async function markOnboardingCompleted(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Error marking onboarding completed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error marking onboarding completed:', error)
    return false
  }
}

/**
 * Save user onboarding preferences
 */
export async function saveOnboardingPreferences(
  userId: string, 
  businessType: string, 
  persona?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        business_type: businessType,
        persona: persona || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Error saving onboarding preferences:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving onboarding preferences:', error)
    return false
  }
}

/**
 * Get the appropriate redirect path for a user after authentication
 */
export async function getRedirectPath(userId: string): Promise<string> {
  const onboardingStatus = await checkOnboardingStatus(userId)
  
  if (!onboardingStatus.onboardingCompleted) {
    return '/onboarding'
  }
  
  return '/dashboard'
}
