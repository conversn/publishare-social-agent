import React from 'react';
import { Textarea } from '@/components/ui/textarea';

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  showToolbar?: boolean;
  showPreview?: boolean;
  showLineNumbers?: boolean;
  onLineNumberClick?: (lineNumber: number) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Write your content in Markdown...',
  className = '',
  rows = 10,
  showToolbar = false,
  showPreview = false,
  showLineNumbers = false,
  onLineNumberClick
}) => {
  return (
    <div className={`${className}`}>
      {showToolbar && (
        <div className="border-b p-2 bg-gray-50">
          <div className="text-sm text-gray-600">Markdown Toolbar</div>
        </div>
      )}
      <div className="flex">
        {showLineNumbers && (
          <div className="w-12 bg-gray-50 border-r p-2 text-xs text-gray-500 font-mono">
            {Array.from({ length: Math.max(10, (value?.split('\n').length || 1)) }, (_, i) => (
              <div
                key={i + 1}
                className="cursor-pointer hover:bg-gray-200 px-1"
                onClick={() => onLineNumberClick?.(i + 1)}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <div className="flex-1">
          <Textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="font-mono border-0 focus:ring-0"
            style={{ minHeight: `${rows * 1.5}em` }}
          />
        </div>
      </div>
      {showPreview && (
        <div className="border-t p-4 bg-gray-50">
          <div className="text-sm text-gray-600 mb-2">Preview:</div>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: value || '' }} />
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;