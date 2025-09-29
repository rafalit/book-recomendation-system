import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-[1100px] grid md:grid-cols-2 gap-10 items-center">
        {/* lewa kolumna (opcjonalnie możesz podmienić treść/grafikę) */}
        <div className="hidden md:block text-white/95">
          <h2 className="text-3xl font-semibold leading-tight">
            Witaj w systemie rekomendacji książek naukowych
          </h2>
          <p className="mt-3 text-white/80">
            Zaloguj się lub utwórz konto, aby kontynuować.
          </p>
        </div>

        {/* prawa – karta formularza */}
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
