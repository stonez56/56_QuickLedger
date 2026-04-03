import React from 'react';
import { LucideIcon } from 'lucide-react';

interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<BaseProps> = ({ children, className = '' }) => (
  <div className={`bg-surface-container-high border border-outline-variant rounded-xl shadow-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

interface LabelProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ htmlFor, children, required }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-on-surface-variant mb-1.5">
    {children}
    {required && <span className="text-error ml-1">*</span>}
  </label>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  rightElement?: React.ReactNode;
  hideIconOnMobile?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, error, rightElement, hideIconOnMobile, className = '', ...props }) => {
  const handleInvalid = (e: React.FormEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).setCustomValidity('請填寫此欄位');
    if (props.onInvalid) props.onInvalid(e);
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).setCustomValidity('');
    if (props.onInput) props.onInput(e as any);
  };

  return (
    <div className="w-full">
      {label && <Label htmlFor={props.id || props.name || ''} required={props.required}>{label}</Label>}
      <div className="relative">
        {Icon && (
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant ${hideIconOnMobile ? 'hidden md:flex' : ''}`}>
            <Icon size={18} />
          </div>
        )}
        <input
          className={`w-full bg-background border ${error ? 'border-error' : 'border-outline'} rounded-lg py-2.5 ${Icon ? (hideIconOnMobile ? 'pl-3 md:pl-10' : 'pl-10') : 'pl-3'} ${rightElement ? 'pr-10' : 'pr-3'} text-on-surface placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed ${props.type === 'date' ? '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer' : ''} ${className}`}
          onInvalid={handleInvalid}
          onInput={handleInput}
          onClick={(e) => {
            if (props.type === 'date' && 'showPicker' in e.target) {
              try {
                (e.target as HTMLInputElement).showPicker();
              } catch (err) {
                // ignore
              }
            }
            if (props.onClick) props.onClick(e);
          }}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  const handleInvalid = (e: React.FormEvent<HTMLSelectElement>) => {
    (e.target as HTMLSelectElement).setCustomValidity('請選擇一個項目');
    if (props.onInvalid) props.onInvalid(e);
  };

  const handleInput = (e: React.FormEvent<HTMLSelectElement>) => {
    (e.target as HTMLSelectElement).setCustomValidity('');
    if (props.onInput) props.onInput(e as any);
  };

  return (
    <div className="w-full">
      {label && <Label htmlFor={props.id || props.name || ''} required={props.required}>{label}</Label>}
      <div className="relative">
        <select
          className={`w-full bg-background border border-outline rounded-lg py-2.5 pl-3 pr-8 text-sm md:text-base text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none transition-all ${className}`}
          onInvalid={handleInvalid}
          onInput={handleInput}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  icon: Icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };
  
  const variants = {
    primary: "bg-primary hover:bg-sky-400 text-on-surface focus:ring-primary",
    secondary: "bg-outline-variant hover:bg-slate-600 text-on-surface focus:ring-slate-500",
    danger: "bg-error hover:bg-error text-on-surface focus:ring-rose-500",
    ghost: "bg-transparent hover:bg-surface-container text-on-surface-variant hover:text-on-surface",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 18} className="mr-2" />
      ) : null}
      {children}
    </button>
  );
};