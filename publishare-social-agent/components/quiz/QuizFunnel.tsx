
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import QuizQuestion from "./QuizQuestion";
import QuizResults from "./QuizResults";
import QuizHeader from "./QuizHeader";
import QuizProgressSteps from "./QuizProgressSteps";
import QuizProgressBar from "./QuizProgressBar";
import QuizErrorBoundary from "./QuizErrorBoundary";
import { useQuizNavigation } from "./QuizNavigation";
import { 
  createQuizSession, 
  saveQuizResponse, 
  updateQuizProgress, 
  getQuizSessionId, 
  trackQuizPageView,
  abandonQuizSession
} from "@/utils/quizManager";

export interface QuizAnswer {
  id: string;
  text: string;
  icon: string;
  value: string;
  subtitle?: string;
}

export interface QuizQuestionType {
  id: string;
  title: string;
  subtitle?: string;
  type: "multiple-choice" | "gender" | "slider" | "input";
  answers?: QuizAnswer[];
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
}

const quizQuestions: QuizQuestionType[] = [
  {
    id: "gender",
    title: "Select your gender",
    subtitle: "Please choose an option",
    type: "gender",
    answers: [
      { id: "male", text: "Male", icon: "♂", value: "male" },
      { id: "female", text: "Female", icon: "♀", value: "female" }
    ]
  },
  {
    id: "maritalStatus",
    title: "What's your marital status?",
    subtitle: "Select below so we can better serve you",
    type: "multiple-choice",
    answers: [
      { id: "single", text: "Single", icon: "👤", value: "single", subtitle: "Not married" },
      { id: "married", text: "Married", icon: "💑", value: "married", subtitle: "Currently married" },
      { id: "divorced", text: "Divorced", icon: "💔", value: "divorced", subtitle: "Previously married" }
    ]
  },
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
    id: "income",
    title: "What's your annual income?",
    type: "slider",
    sliderConfig: {
      min: 25000,
      max: 200000,
      step: 5000,
      label: "Annual income",
      unit: "$"
    }
  },
  {
    id: "zipCode",
    title: "What's your zip code?",
    type: "input",
    inputConfig: {
      placeholder: "Your Zip code",
      type: "text",
      label: "92103"
    }
  }
];

// Background task queue for database operations
class DatabaseTaskQueue {
  private tasks: Array<() => Promise<void>> = [];
  private isProcessing = false;

  async addTask(task: () => Promise<void>) {
    this.tasks.push(task);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.isProcessing = true;
    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Background database task failed:', error);
        }
      }
    }
    this.isProcessing = false;
  }
}

const dbTaskQueue = new DatabaseTaskQueue();

const QuizFunnel = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);

  // Initialize quiz session on component mount
  useEffect(() => {
    const initializeQuizSession = async () => {
      let sessionId = getQuizSessionId('retirement_quiz');
      
      if (!sessionId) {
        sessionId = await createQuizSession('retirement_quiz', undefined, quizQuestions.length);
        console.log('Created new quiz session:', sessionId);
      } else {
        console.log('Found existing quiz session:', sessionId);
      }
      
      if (sessionId) {
        setQuizSessionId(sessionId);
        
        // Queue initial session setup as background task
        dbTaskQueue.addTask(async () => {
          await updateQuizProgress(sessionId, currentQuestion, quizQuestions.length, {
            session_initialized: true,
            quiz_version: '1.0',
            questions_loaded: quizQuestions.length
          });

          await trackQuizPageView(sessionId, {
            page_type: 'quiz_start',
            question_count: quizQuestions.length,
            initial_load: true
          });
        });
      }
    };

    initializeQuizSession();
  }, []);

  // Update progress when question changes
  useEffect(() => {
    if (quizSessionId) {
      // Queue progress update as background task
      dbTaskQueue.addTask(async () => {
        await updateQuizProgress(quizSessionId, currentQuestion, quizQuestions.length, {
          current_question_id: quizQuestions[currentQuestion]?.id,
          answers_so_far: Object.keys(answers).length,
          navigation_timestamp: new Date().toISOString()
        });

        await trackQuizPageView(quizSessionId, {
          page_type: 'quiz_question',
          question_id: quizQuestions[currentQuestion]?.id,
          question_index: currentQuestion,
          question_title: quizQuestions[currentQuestion]?.title
        });
      });

      console.log('Queued quiz progress update:', { step: currentQuestion, total: quizQuestions.length });
    }
  }, [currentQuestion, quizSessionId]);

  // Track quiz abandonment on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (quizSessionId && !showResults) {
        // Fire and forget - don't await
        abandonQuizSession(quizSessionId, 'page_unload');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && quizSessionId && !showResults) {
        // User switched tabs or minimized - potential abandonment
        abandonQuizSession(quizSessionId, 'tab_hidden');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quizSessionId, showResults]);

  const navigation = useQuizNavigation(quizQuestions.length);

  const handleAnswer = async (questionId: string, answerValue: string) => {
    // STEP 1: Update UI state immediately for instant feedback
    const newAnswers = { ...answers, [questionId]: answerValue };
    setAnswers(newAnswers);

    // STEP 2: Handle auto-advance UI updates immediately
    setIsTransitioning(true);
    
    // Immediate navigation without waiting for database
    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setShowResults(true);
      }
      setIsTransitioning(false);
    }, 50); // Minimal delay for visual feedback only

    // STEP 3: Queue all database operations as background tasks
    if (quizSessionId) {
      const currentQuestionData = quizQuestions.find(q => q.id === questionId);
      
      dbTaskQueue.addTask(async () => {
        console.log('Processing background database operations for:', { questionId, answerValue });
        
        // Save quiz response
        await saveQuizResponse(
          quizSessionId,
          questionId,
          answerValue,
          currentQuestionData?.title,
          {
            questionType: currentQuestionData?.type,
            questionSubtitle: currentQuestionData?.subtitle,
            questionIndex: currentQuestion,
            totalQuestions: quizQuestions.length,
            answerTimestamp: new Date().toISOString(),
            previousAnswersCount: Object.keys(answers).length,
            timeOnQuestion: Date.now() - (window as any).questionStartTime,
            navigationMethod: 'auto_advance'
          }
        );

        // Update session progress
        await updateQuizProgress(quizSessionId, currentQuestion, quizQuestions.length, {
          latest_answer: {
            question_id: questionId,
            answer_value: answerValue,
            answered_at: new Date().toISOString()
          },
          completion_percentage: Math.round(((Object.keys(newAnswers).length) / quizQuestions.length) * 100)
        });
      });
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setIsTransitioning(false);
    setQuizSessionId(null);
    // Clear the session from localStorage
    localStorage.removeItem('retirement_quiz_session_id');
  };

  // Track time on each question
  useEffect(() => {
    (window as any).questionStartTime = Date.now();
  }, [currentQuestion]);

  if (showResults) {
    return (
      <QuizErrorBoundary>
        <QuizResults results={{ answers }} onRestart={handleRestart} onContact={() => {}} />
      </QuizErrorBoundary>
    );
  }

  return (
    <QuizErrorBoundary>
      <section className="py-2 px-4 sm:px-6 lg:px-8 min-h-screen flex items-start pt-4">
        <div className="max-w-2xl mx-auto w-full">
          <QuizHeader
            title="Plan Your Financial Future"
            subtitle="Personalized Retirement Strategy"
          />

          <QuizProgressSteps
            currentStep={currentQuestion + 1}
            totalSteps={quizQuestions.length}
          />

          <QuizProgressBar
            currentStep={currentQuestion + 1}
            totalSteps={quizQuestions.length}
          />

          <Card className={`shadow-xl border-0 bg-white/80 backdrop-blur-sm transition-opacity duration-200 ${
            isTransitioning ? 'opacity-50' : 'opacity-100'
          }`}>
            <CardContent className="p-8">
              <QuizQuestion
                question={quizQuestions[currentQuestion]}
                onAnswer={(answer) => handleAnswer(quizQuestions[currentQuestion].id, answer)}
                currentStep={currentQuestion + 1}
                totalSteps={quizQuestions.length}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </QuizErrorBoundary>
  );
};

export default QuizFunnel;
