import React from 'react';

interface QuizProgressStepsProps {
  currentStep: number;
  totalSteps: number;
}

const QuizProgressSteps: React.FC<QuizProgressStepsProps> = ({
  currentStep,
  totalSteps
}) => {
  return (
    <div className="flex justify-center mb-6">
      <div className="flex space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full ${
              index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default QuizProgressSteps;

