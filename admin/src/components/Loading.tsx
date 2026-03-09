import React from 'react';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses = {
  small: 'h-6 w-6 border-2',
  medium: 'h-10 w-10 border-2',
  large: 'h-16 w-16 border-4',
};

export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  fullScreen = false,
  className = '',
}) => {
  const spinner = (
    <div
      className={`animate-spin rounded-full border-[#256B6F] border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};
