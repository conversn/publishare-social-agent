
import { supabase } from "@/integrations/supabase/client";
import { QuizSession, QuizResponse } from "@/types/database";
import { findOrCreateContact, linkContactWithUtmSession, logContactInteraction, updateContactActivity } from "./contact";
import { getCurrentUtmSessionId } from "./utmTracking";

export const createQuizSession = async (
  quizType: 'retirement_quiz' | 'life_insurance_quiz' | 'financial_calculator',
  contactData?: { email: string; first_name?: string; last_name?: string; phone?: string; zip_code?: string },
  totalSteps?: number
): Promise<string | null> => {
  try {
    console.log('Creating quiz session:', { quizType, contactData, totalSteps });
    
    let contactId: string | null = null;
    let utmSessionId: string | null = getCurrentUtmSessionId();
    
    // Create or find contact if contact data is provided
    if (contactData) {
      const contact = await findOrCreateContact(contactData.email, contactData);
      if (contact) {
        contactId = contact.id;
        // Link with UTM session
        utmSessionId = await linkContactWithUtmSession(contact.id);
        
        // Log quiz start interaction with enhanced data
        await logContactInteraction(contact.id, {
          type: 'quiz_started',
          quiz_type: quizType,
          total_steps: totalSteps,
          utm_session_id: utmSessionId,
          user_agent: navigator.userAgent,
          page_url: window.location.href,
          timestamp: new Date().toISOString(),
          session_metadata: {
            browser: navigator.userAgent,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language
          }
        });

        // Update contact activity
        await updateContactActivity(contact.id, { type: 'quiz_started' });
      }
    }

    // Create comprehensive session data
    const sessionData = {
      started_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      quiz_type: quizType,
      total_steps: totalSteps || null,
      current_step: 0,
      progress_percentage: 0,
      answers_count: 0,
      session_metadata: {
        browser: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
      }
    };

    const sessionInsertData = {
      quiz_type: quizType,
      results: sessionData,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    };

    console.log('Creating quiz session with data:', sessionInsertData);

    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert(sessionInsertData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating quiz session:', error);
      throw error;
    }

    const sessionId = data.id;
    console.log('Created quiz session:', sessionId);
    
    // Store session ID in localStorage
    localStorage.setItem(`${quizType}_session_id`, sessionId);

    // Log session creation interaction for anonymous users too
    if (!contactId) {
      console.log('Logging anonymous quiz session creation');
      // We can still log this for analytics even without a contact
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error creating quiz session:', error);
    return null;
  }
};

export const getQuizSessionId = (quizType: string): string | null => {
  return localStorage.getItem(`${quizType}_session_id`);
};

export const updateQuizSession = async (
  sessionId: string,
  updates: Partial<QuizSession>
): Promise<void> => {
  try {
    console.log('Updating quiz session:', { sessionId, updates });
    
    const { error } = await supabase
      .from('quiz_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating quiz session:', error);
      throw error;
    }
    
    console.log('Successfully updated quiz session');

    // Log session update interaction
    console.log('Quiz session updated:', { sessionId, updates });
  } catch (error) {
    console.error('Error updating quiz session:', error);
  }
};

export const updateQuizProgress = async (
  sessionId: string,
  currentStep: number,
  totalSteps: number,
  additionalData?: Record<string, any>
): Promise<void> => {
  try {
    console.log('Updating quiz progress:', { sessionId, currentStep, totalSteps });
    
    // Calculate progress percentage
    const progressPercentage = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;
    
    // First, get current session data to merge with new data
    const { data: currentSession, error: fetchError } = await supabase
      .from('quiz_sessions')
      .select('results, quiz_type')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      console.error('Error fetching current session:', fetchError);
      throw fetchError;
    }

    // Ensure we have a valid object to spread with proper type checking
    const currentSessionData = (currentSession?.results && typeof currentSession.results === 'object' && currentSession.results !== null) 
      ? currentSession.results as Record<string, any>
      : {};
    
    // Ensure additionalData is a valid object
    const safeAdditionalData = (additionalData && typeof additionalData === 'object' && additionalData !== null) 
      ? additionalData 
      : {};
    
    // Merge current session data with progress updates
    const updatedSessionData = {
      ...currentSessionData,
      current_step: currentStep,
      total_steps: totalSteps,
      progress_percentage: progressPercentage,
      last_updated: new Date().toISOString(),
      ...safeAdditionalData
    };

    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        results: updatedSessionData
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating quiz progress:', error);
      throw error;
    }
    
    console.log('Successfully updated quiz progress:', { currentStep, totalSteps, progressPercentage });

    // Log progress interaction if we have a contact
    // Note: contact_id is not available in quiz_sessions table, so we skip contact logging for now
    console.log('Quiz progress updated:', { sessionId, currentStep, totalSteps, progressPercentage });
  } catch (error) {
    console.error('Error updating quiz progress:', error);
  }
};

export const saveQuizResponse = async (
  quizSessionId: string,
  questionId: string,
  answerValue: string,
  questionText?: string,
  answerData?: Record<string, any>
): Promise<void> => {
  try {
    console.log('Saving quiz response:', { quizSessionId, questionId, answerValue });
    
    const responseData = {
      quiz_session_id: quizSessionId,
      question_id: questionId,
      response_data: {
        question_text: questionText,
        answer_value: answerValue,
        answer_data: answerData || {},
        answered_at: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from('quiz_responses')
      .insert(responseData);

    if (error) {
      console.error('Error saving quiz response:', error);
      throw error;
    }
    
    console.log('Successfully saved quiz response');

    // Get session info for contact interaction logging
    const { data: sessionInfo, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('quiz_type')
      .eq('id', quizSessionId)
      .single();

    if (!sessionError && sessionInfo) {
      // Log the specific answer interaction
      console.log('Quiz answer submitted:', { 
        sessionId: quizSessionId, 
        quizType: sessionInfo.quiz_type,
        questionId, 
        answerValue 
      });
    }

    // Update session data with answer count
    try {
      const { data: responseCount, error: countError } = await supabase
        .from('quiz_responses')
        .select('id', { count: 'exact' })
        .eq('quiz_session_id', quizSessionId);

      if (!countError && responseCount && sessionInfo) {
        // Update session with answer count
        console.log('Quiz response count:', responseCount.length);
      }
    } catch (countError) {
      console.warn('Could not update answer count:', countError);
    }
  } catch (error) {
    console.error('Error saving quiz response:', error);
  }
};

export const completeQuizSession = async (
  sessionId: string,
  contactData?: { email: string; first_name?: string; last_name?: string; phone?: string; zip_code?: string }
): Promise<void> => {
  try {
    console.log('Completing quiz session:', { sessionId, contactData });
    
    let contactId: string | null = null;
    
    // Create or find contact if contact data is provided
    if (contactData) {
      const contact = await findOrCreateContact(contactData.email, contactData);
      if (contact) {
        contactId = contact.id;
        
        // Log quiz completion interaction with detailed data
        await logContactInteraction(contact.id, {
          type: 'quiz_completed',
          quiz_session_id: sessionId,
          contact_data_provided: contactData,
          completion_timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          page_url: window.location.href
        });

        await updateContactActivity(contact.id, { type: 'quiz_completed' });
      }
    }

    // Get current session data to update with completion info
    const { data: currentSession, error: fetchError } = await supabase
      .from('quiz_sessions')
      .select('results, quiz_type')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      console.error('Error fetching session for completion:', fetchError);
    }

    const completionData = {
      completed_at: new Date().toISOString(),
      completion_percentage: 100,
      completion_status: 'completed' as const
    };

    // Ensure we have a valid object to spread with proper type checking
    const currentSessionData = (currentSession?.results && typeof currentSession.results === 'object' && currentSession.results !== null) 
      ? currentSession.results as Record<string, any>
      : {};
    
    const updatedSessionData = {
      ...currentSessionData,
      ...completionData,
      final_completion_at: new Date().toISOString(),
      contact_data_at_completion: contactData
    };

    const updates: Partial<QuizSession> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      results: updatedSessionData
    };

    await updateQuizSession(sessionId, updates);

    // Log completion
    console.log('Quiz session completed:', { sessionId, completionData });
    
    console.log('Successfully completed quiz session');
  } catch (error) {
    console.error('Error completing quiz session:', error);
  }
};

// New function to log quiz abandonment
export const abandonQuizSession = async (sessionId: string, reason?: string): Promise<void> => {
  try {
    console.log('Abandoning quiz session:', { sessionId, reason });

    // Get session info
    const { data: sessionInfo, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('quiz_type, results')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching session for abandonment:', sessionError);
      return;
    }

    // Ensure we have a valid object to spread with proper type checking
    const currentSessionData = (sessionInfo.results && typeof sessionInfo.results === 'object' && sessionInfo.results !== null) 
      ? sessionInfo.results as Record<string, any>
      : {};

    // Update session status to abandoned
    await updateQuizSession(sessionId, {
      status: 'abandoned',
      results: {
        ...currentSessionData,
        abandoned_at: new Date().toISOString(),
        abandonment_reason: reason
      }
    });

    // Log abandonment
    console.log('Quiz session abandoned:', { sessionId, reason });
  } catch (error) {
    console.error('Error abandoning quiz session:', error);
  }
};

// New function to track quiz page views
export const trackQuizPageView = async (sessionId: string, pageInfo: Record<string, any>): Promise<void> => {
  try {
    // Get session info
    const { data: sessionInfo, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('quiz_type')
      .eq('id', sessionId)
      .single();

    if (!sessionError && sessionInfo) {
      console.log('Quiz page viewed:', { sessionId, quizType: sessionInfo.quiz_type, pageInfo });
    }
  } catch (error) {
    console.error('Error tracking quiz page view:', error);
  }
};
