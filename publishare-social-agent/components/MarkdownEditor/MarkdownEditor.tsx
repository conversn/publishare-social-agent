import React from 'react';

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Write your content in Markdown...',
  className = ''
}) => {
  return (
    <div className={`border rounded-md ${className}`}>
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full h-64 p-3 border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
      />
    </div>
  );
};

export default MarkdownEditor;

