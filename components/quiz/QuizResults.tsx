import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QuizResultsProps {
  results: any;
  onRestart: () => void;
  onContact: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({
  results,
  onRestart,
  onContact
}) => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Your Results</h2>
            <p className="text-gray-600">
              {results?.summary || 'Thank you for completing the quiz!'}
            </p>
          </div>
          
          {results?.score && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-lg font-semibold text-blue-800">
                Score: {results.score}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button onClick={onContact} className="w-full">
              Get Your Results
            </Button>
            <Button variant="outline" onClick={onRestart} className="w-full">
              Take Quiz Again
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizResults;

