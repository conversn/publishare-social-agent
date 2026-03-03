import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QuizQuestionProps {
  question: any;
  onAnswer: (answer: string) => void;
  currentStep: number;
  totalSteps: number;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onAnswer,
  currentStep,
  totalSteps
}) => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">{question?.title || 'Question'}</h2>
            <p className="text-gray-600">{question?.description || 'Please select an answer'}</p>
          </div>
          
          <div className="space-y-3">
            {question?.options?.map((option: any, index: number) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => onAnswer(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          
          <div className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizQuestion;

