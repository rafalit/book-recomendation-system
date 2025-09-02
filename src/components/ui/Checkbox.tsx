import { InputHTMLAttributes } from "react";

export default function Checkbox({
  label,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`inline-flex items-center gap-2 select-none ${className}`}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        {...rest}
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}
