import { ButtonHTMLAttributes } from "react";

export default function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={
        "w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition " +
        className
      }
    />
  );
}
