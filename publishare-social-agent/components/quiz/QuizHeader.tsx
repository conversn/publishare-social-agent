import React from 'react';

interface QuizHeaderProps {
  title?: string;
  subtitle?: string;
  logo?: string;
}

const QuizHeader: React.FC<QuizHeaderProps> = ({
  title = 'Quiz',
  subtitle,
  logo
}) => {
  return (
    <div className="text-center mb-8">
      {logo && (
        <div className="mb-4">
          <img src={logo} alt="Logo" className="h-12 mx-auto" />
        </div>
      )}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      {subtitle && (
        <p className="text-gray-600">{subtitle}</p>
      )}
    </div>
  );
};

export default QuizHeader;
