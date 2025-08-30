'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * {{NAME_PASCAL}} Component Props
 */
interface {{NAME_PASCAL}}Props {
  /**
   * Additional CSS classes to apply
   */
  className?: string;
  
  /**
   * Component variant
   */
  variant?: 'default' | 'secondary' | 'outline';
  
  /**
   * Component size
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether the component is loading
   */
  loading?: boolean;
  
  /**
   * Children elements
   */
  children?: React.ReactNode;
}

/**
 * {{NAME_PASCAL}} Component
 * 
 * A reusable component for {{NAME}} functionality
 * Generated on {{DATE}}
 */
export const {{NAME_PASCAL}}: React.FC<{{NAME_PASCAL}}Props> = ({
  className,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
  };
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 py-2 px-4',
    lg: 'h-12 py-3 px-6 text-lg',
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        loading && 'cursor-wait',
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </div>
  );
};

{{NAME_PASCAL}}.displayName = '{{NAME_PASCAL}}';

export default {{NAME_PASCAL}};