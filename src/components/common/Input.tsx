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
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 rounded-xl border ${error ? "border-red-400 focus:ring-red-400" : "border-gray-200 focus:ring-[#5A5A40]"} focus:ring-2 focus:border-transparent outline-none transition-all text-sm ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
}
