import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function inputClassName(hasError: boolean): string {
  return `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
  }`;
}

export default function FormField({ label, error, required, children, hint }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1" role="alert">
          <span aria-hidden="true">•</span>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
