import { useState } from "react";
import api from "../lib/api";
import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import TextField from "../components/ui/TextField";
import PrimaryButton from "../components/ui/PrimaryButton";
import { Link } from "react-router-dom";

export default function ResetPassword() {
  const [step, setStep] = useState<1|2|3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const next1 = async (e:React.FormEvent) => {
    e.preventDefault();
    await api.post("/auth/password/reset/start", { email: email.toLowerCase() });
    setStep(2);
  };

  const next2 = async (e:React.FormEvent) => {
    e.preventDefault();
    await api.post("/auth/password/reset/verify", { email: email.toLowerCase(), code });
    setStep(3);
  };

  const finish = async (e:React.FormEvent) => {
    e.preventDefault();
    if (pw1 !== pw2) return alert("Hasła się różnią.");
    if (!/\d/.test(pw1) || !/[^A-Za-z0-9]/.test(pw1) || pw1.length < 8)
      return alert("Hasło: min 8, 1 cyfra i 1 znak specjalny.");
    await api.post("/auth/password/reset/confirm", {
      email: email.toLowerCase(), code, new_password: pw1
    });
    alert("Hasło zmienione. Zaloguj się.");
    window.location.href = "/login";
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Reset hasła"
        subtitle={step===1 ? "Podaj e-mail" : step===2 ? "Wpisz kod weryfikacyjny" : "Ustaw nowe hasło"}
        footer={<div className="text-sm text-center">Pamiętasz hasło? <Link to="/login" className="text-blue-700 hover:underline">Wróć do logowania</Link></div>}
      >
        {step===1 && (
          <form onSubmit={next1} className="space-y-4">
            <TextField type="email" placeholder="np. jan@agh.edu.pl" value={email} onChange={e=>setEmail(e.target.value.toLowerCase())} required />
            <PrimaryButton type="submit">Dalej</PrimaryButton>
          </form>
        )}
        {step===2 && (
          <form onSubmit={next2} className="space-y-4">
            <TextField placeholder="np. luty2026" value={code} onChange={e=>setCode(e.target.value)} required />
            <PrimaryButton type="submit">Potwierdź kod</PrimaryButton>
          </form>
        )}
        {step===3 && (
          <form onSubmit={finish} className="space-y-4">
            <TextField type="password" placeholder="Nowe hasło" value={pw1} onChange={e=>setPw1(e.target.value)} required />
            <TextField type="password" placeholder="Powtórz hasło" value={pw2} onChange={e=>setPw2(e.target.value)} required />
            <PrimaryButton type="submit">Zmień hasło</PrimaryButton>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
