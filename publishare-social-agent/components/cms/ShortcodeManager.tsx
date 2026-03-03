import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface ShortcodeManagerProps {
  onShortcodeInsert?: (shortcode: string) => void;
  articleId?: string;
  onFactCheck?: () => void;
}

const ShortcodeManager: React.FC<ShortcodeManagerProps> = ({ 
  onShortcodeInsert, 
  articleId, 
  onFactCheck 
}) => {
  const [factCheckStatus, setFactCheckStatus] = useState<'idle' | 'loading' | 'completed'>('idle');

  const shortcodes = [
    { 
      name: 'Calculator', 
      code: '[calculator id="mortgage"]', 
      description: 'Embed a calculator' 
    },
    { 
      name: 'Quote Box', 
      code: '[quote author="Expert"]Your quote here[/quote]', 
      description: 'Add a styled quote' 
    },
    { 
      name: 'CTA Button', 
      code: '[cta text="Get Started" url="/signup"]', 
      description: 'Call-to-action button' 
    },
    { 
      name: 'Info Box', 
      code: '[info]Important information here[/info]', 
      description: 'Highlighted info box' 
    },
  ];

  const handleFactCheck = async () => {
    setFactCheckStatus('loading');
    try {
      // Simulate fact-checking process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setFactCheckStatus('completed');
      onFactCheck?.();
    } catch (error) {
      setFactCheckStatus('idle');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Available Shortcodes</h3>
      <div className="space-y-3">
        {shortcodes.map((shortcode, index) => (
          <Card key={index} className="shortcode-card border border-gray-200 bg-white hover:border-gray-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                      {shortcode.name}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                    {shortcode.description}
                  </p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 border">
                    {shortcode.code}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShortcodeInsert?.(shortcode.code)}
                  className="ml-4 flex-shrink-0 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Insert
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Fact-Check & Quality Section */}
        <Card className="shortcode-card border border-gray-200 bg-white hover:border-gray-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
                    Fact-Check & Quality
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                  {factCheckStatus === 'idle' && 'No fact-check results available. Click "Check Facts" to run analysis.'}
                  {factCheckStatus === 'loading' && 'Running fact-check analysis...'}
                  {factCheckStatus === 'completed' && 'Fact-check completed. Review results below.'}
                </p>
                {factCheckStatus === 'completed' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="text-green-600">All claims verified</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span className="text-yellow-600">2 sources need citation</span>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFactCheck}
                disabled={factCheckStatus === 'loading'}
                className="ml-4 flex-shrink-0 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700"
              >
                {factCheckStatus === 'loading' ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Facts'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShortcodeManager;
