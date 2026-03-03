import React from 'react';

interface MarkdownPreviewProps {
  content?: string;
  markdown?: string;
  className?: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content = '',
  markdown = '',
  className = ''
}) => {
  // Simple markdown-to-HTML conversion for preview
  const formatContent = (text: string) => {
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={`border rounded-md p-4 bg-gray-50 ${className}`}>
      <div className="text-sm text-gray-600 mb-2">Preview:</div>
      <div 
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ 
          __html: `<p class="mb-4">${formatContent(markdown || content)}</p>` 
        }}
      />
    </div>
  );
};

export default MarkdownPreview;
