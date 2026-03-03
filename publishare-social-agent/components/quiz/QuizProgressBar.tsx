
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface QuizProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const QuizProgressBar: React.FC<QuizProgressBarProps> = ({
  currentStep,
  totalSteps
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full mb-6">
      <Progress value={progress} className="h-2" />
      <div className="text-center text-sm text-gray-500 mt-2">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
};

export default QuizProgressBar;
