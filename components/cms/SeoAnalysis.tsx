
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { calculateSeoScore, getScoreColor, getScoreLabel } from '@/utils/seoUtils';

interface SeoAnalysisProps {
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  content: string;
  focusKeyword?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
}

const SeoAnalysis: React.FC<SeoAnalysisProps> = (props) => {
  const { score, issues, suggestions } = calculateSeoScore(props);

  const getIcon = (type: 'good' | 'warning' | 'error') => {
    switch (type) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-forest-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-clay-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-clay-700" />;
    }
  };

  return (
    <Card className="bg-ivory border-warm-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-forest-800">
          SEO Analysis
          <Badge variant={score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive'} className={
            score >= 80 
              ? 'bg-forest-600 text-ivory hover:bg-forest-700' 
              : score >= 60 
                ? 'bg-sand-200 text-forest-700 hover:bg-sand-300' 
                : 'bg-clay-500 text-ivory hover:bg-clay-600'
          }>
            <span>
              {score}/100 - {getScoreLabel(score)}
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full bg-warm-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              score >= 80 ? 'bg-forest-600' : score >= 60 ? 'bg-clay-600' : 'bg-clay-700'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>

        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-clay-700">Issues to Fix:</h4>
            {issues.map((issue, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                {getIcon('error')}
                <span className="text-forest-700">{issue}</span>
              </div>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-clay-600">Suggestions:</h4>
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                {getIcon('warning')}
                <span className="text-forest-700">{suggestion}</span>
              </div>
            ))}
          </div>
        )}

        {score >= 80 && (
          <div className="flex items-center gap-2 text-sm text-forest-600">
            {getIcon('good')}
            <span>Great job! Your content is well optimized for SEO.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeoAnalysis;
