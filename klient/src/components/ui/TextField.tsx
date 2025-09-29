import { InputHTMLAttributes, ReactNode, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode;
  passwordToggle?: boolean;
};

export default function TextField({
  className = "",
  leftIcon,
  passwordToggle = false,
  type = "text",
  ...rest
}: Props) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative">
      {leftIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {leftIcon}
        </span>
      )}

      <input
        {...rest}
        type={isPassword && passwordToggle ? (show ? "text" : "password") : type}
        className={
          "w-full h-12 rounded-xl border border-slate-300 bg-white px-3 " +
          (leftIcon ? "pl-10 " : "") +
          "pr-10 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 " +
          className
        }
      />

      {isPassword && passwordToggle && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          aria-label={show ? "Ukryj hasło" : "Pokaż hasło"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  );
}
