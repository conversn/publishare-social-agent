
import { useState } from "react";
import { useQuizNavigation } from "@/components/quiz/QuizNavigation";
import { financialQuizQuestions } from "@/data/financialQuizQuestions";

export const useFinancialQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigation = useQuizNavigation(financialQuizQuestions.length);

  const handleAnswer = async (questionId: string, answerValue: string) => {
    const newAnswers = { ...answers, [questionId]: answerValue };
    setAnswers(newAnswers);

    setIsTransitioning(true);
    
    setTimeout(() => {
      if (currentQuestion < financialQuizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setShowResults(true);
      }
      setIsTransitioning(false);
    }, 50);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setIsTransitioning(false);
  };

  return {
    currentQuestion,
    answers,
    showResults,
    isTransitioning,
    navigation,
    questions: financialQuizQuestions,
    handleAnswer,
    handleRestart
  };
};
