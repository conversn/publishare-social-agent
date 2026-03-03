import { useState } from "react";
import { lifeInsuranceQuestions } from "@/data/lifeInsuranceQuestions";
import { useToast } from "@/hooks/use-toast";
import { createQuizSession, saveQuizResponse, updateQuizProgress, completeQuizSession } from "@/utils/quizManager";

export const useLifeInsuranceQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  // const navigate = useNavigate(); // Removed for Next.js compatibility
  const { toast } = useToast();

  const progress = ((currentQuestion + 1) / lifeInsuranceQuestions.length) * 100;

  const handleAnswer = async (questionId: string, answerValue: string) => {
    console.log('🚀 LifeInsuranceQuiz: handleAnswer called', { questionId, answerValue, currentQuestion });
    
    const newAnswers = { ...answers, [questionId]: answerValue };
    setAnswers(newAnswers);

    // Create quiz session if it doesn't exist
    if (!quizSessionId) {
      console.log('📝 LifeInsuranceQuiz: Creating new quiz session...');
      const sessionId = await createQuizSession('life_insurance_quiz', undefined, lifeInsuranceQuestions.length);
      if (sessionId) {
        console.log('✅ LifeInsuranceQuiz: Quiz session created successfully:', sessionId);
        setQuizSessionId(sessionId);
      } else {
        console.error('❌ LifeInsuranceQuiz: Failed to create quiz session');
        toast({
          title: "Session Error",
          description: "Failed to create quiz session. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Save the response
    if (quizSessionId) {
      console.log('💾 LifeInsuranceQuiz: Saving quiz response...', { 
        sessionId: quizSessionId, 
        questionId, 
        answerValue,
        questionTitle: lifeInsuranceQuestions[currentQuestion].title
      });
      
      await saveQuizResponse(
        quizSessionId,
        questionId,
        answerValue,
        lifeInsuranceQuestions[currentQuestion].title
      );
      
      console.log('📊 LifeInsuranceQuiz: Updating quiz progress...', {
        sessionId: quizSessionId,
        currentStep: currentQuestion + 1,
        totalSteps: lifeInsuranceQuestions.length
      });
      
      await updateQuizProgress(
        quizSessionId,
        currentQuestion + 1,
        lifeInsuranceQuestions.length
      );
      
      console.log('✅ LifeInsuranceQuiz: Answer processing completed successfully');
      
      // Show success feedback to user
      toast({
        title: "Answer Saved",
        description: `Response for "${lifeInsuranceQuestions[currentQuestion].title}" saved successfully`,
      });
    }

    // Handle conditional flow for callback preference
    if (questionId === "callback-preference") {
      await handleCallbackPreference(answerValue, newAnswers);
      return;
    }

    // Move to next question after a short delay
    setTimeout(() => {
      if (currentQuestion < lifeInsuranceQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setShowResults(true);
      }
    }, 500);
  };

  const handleCallbackPreference = async (preference: string, allAnswers: Record<string, string>) => {
    console.log('🎯 LifeInsuranceQuiz: handleCallbackPreference called', { preference, allAnswers });
    
    // Complete the quiz session
    if (quizSessionId) {
      const contactData = {
        email: allAnswers.email || '',
        first_name: allAnswers['full-name']?.split(' ')[0] || '',
        last_name: allAnswers['full-name']?.split(' ').slice(1).join(' ') || '',
        phone: allAnswers.phone || '',
        zip_code: allAnswers['zip-code'] || ''
      };

      console.log('🏁 LifeInsuranceQuiz: Completing quiz session with contact data:', { 
        sessionId: quizSessionId, 
        contactData 
      });
      
      await completeQuizSession(quizSessionId, contactData);
      
      console.log('✅ LifeInsuranceQuiz: Quiz session completed successfully');
      
      toast({
        title: "Quiz Completed",
        description: "Your responses have been saved successfully!",
      });
    }

    // Route based on preference
    if (preference === "call-now") {
      toast({
        title: "Redirecting to Partner Options",
        description: "You'll see our recommended insurance providers with agent contact information.",
      });
      
      setTimeout(() => {
        // navigate("/assessment/life-insurance/partners", { 
        //   state: { answers: allAnswers, preference: "call-now" } 
        // });
        console.log('Would navigate to partners page with answers:', allAnswers);
      }, 1000);
    } else if (preference === "book-later") {
      toast({
        title: "Redirecting to Booking",
        description: "You'll be able to schedule a convenient callback time.",
      });
      
      setTimeout(() => {
        // navigate("/consultation", { 
        //   state: { answers: allAnswers, preference: "book-later", source: "life-insurance" } 
        // });
        console.log('Would navigate to consultation page with answers:', allAnswers);
      }, 1000);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setQuizSessionId(null);
  };

  return {
    currentQuestion,
    answers,
    showResults,
    progress,
    questions: lifeInsuranceQuestions,
    handleAnswer,
    handleBack,
    handleRestart
  };
};