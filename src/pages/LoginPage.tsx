import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import TextField from "../components/ui/TextField";
import PrimaryButton from "../components/ui/PrimaryButton";
import Checkbox from "../components/ui/Checkbox";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const form = new URLSearchParams();
      form.append("username", email.toLowerCase());
      form.append("password", password);
      const res = await axios.post("http://127.0.0.1:8000/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("token", res.data.access_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.access_token}`;
      navigate("/home", { replace: true });
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Błąd logowania");
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Logowanie"
        subtitle="Wprowadź dane konta."
        footer={
          <>
            <div className="text-sm">
              Nie masz konta?{" "}
              <Link to="/register" className="text-blue-700 hover:underline">
                Zarejestruj się
              </Link>
            </div>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField
            leftIcon={<Mail size={18} />}
            type="email"
            placeholder="Wprowadź swój e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            required
          />
          <TextField
            leftIcon={<Lock size={18} />}
            type="password"
            placeholder="Wprowadź hasło"
            passwordToggle
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between">
            <Checkbox label="Zapamiętaj mnie" />
            <Link to="/reset-password" className="text-sm text-blue-700 hover:underline">
              Zapomniałeś hasła?
            </Link>
          </div>

          <PrimaryButton type="submit">Zaloguj się</PrimaryButton>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
