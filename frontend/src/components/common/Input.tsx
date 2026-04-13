import React from "react";

type InputProps = {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
};

export function Input({ label, error, required, className = "", ...props }: InputProps) {
  const inputId = props.id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-sky-700/70 mb-1 ml-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-2.5 rounded-xl border bg-sky-50/70 ${error ? "border-red-400 focus:ring-red-400" : "border-sky-100 focus:ring-blue-500"} focus:ring-2 focus:border-transparent outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
}
