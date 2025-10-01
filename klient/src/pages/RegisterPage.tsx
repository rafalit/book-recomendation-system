import { useEffect, useMemo, useState } from "react";
import api from "../lib/api"
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import TextField from "../components/ui/TextField";
import PrimaryButton from "../components/ui/PrimaryButton";

import { User, Mail, Lock, School, Building2, BookOpen, Calendar } from "lucide-react";

// ---- typy danych z backendu /meta/config ----
type Config = {
  domain_to_uni: Record<string, string>;
  university_faculties: Record<string, string[]>;
  titles: string[];
};

// tylko litery (PL) i '-', 1 wielka litera na start
function onlyNameCase(s: string) {
  return s.replace(/[^A-Za-zĄĆĘŁŃÓŚŻŹąćęłńóśżź-]/g, "");
}

export default function RegisterPage() {
  // konfiguracja z backendu
  const [cfg, setCfg] = useState<Config>({
    domain_to_uni: {},
    university_faculties: {},
    titles: [],
  });

  // pola formularza
  const [role, setRole] = useState<"student" | "researcher">("student");
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [field, setField] = useState("");           // student
  const [year, setYear] = useState("1");            // student
  const [title, setTitle] = useState<string>("");   // researcher
  const [password, setPassword] = useState("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState("");

  const navigate = useNavigate();

  // 1) pobierz konfigurację do UI (jedno źródło prawdy z backendu)
  useEffect(() => {
    api
      .get<Config>("/meta/config")
      .then((res) => {
        setCfg(res.data);
        if (res.data.titles?.length) setTitle(res.data.titles[0]);
      })
      .catch(() => alert("Nie udało się pobrać konfiguracji uczelni/domen."));
  }, []);

  // 2) auto-uzupełnianie uczelni na podstawie domeny e-mail
  useMemo(() => {
    const dom = email.toLowerCase().split("@")[1] || "";
    const uni = cfg.domain_to_uni[dom];
    if (uni) {
      setUniversity(uni);
      setFaculty("");
    }
  }, [email, cfg.domain_to_uni]);

  const faculties = cfg.university_faculties[university] || [];

  // 3) czy można przejść dalej (frontendowa wstępna walidacja)
  const canSubmit =
    !!email &&
    !!university &&
    !!first &&
    !!last &&
    !!faculty &&
    !!password &&
    (role === "student" ? !!field && ["1", "2", "3", "4", "5"].includes(year) : !!title);

  // 4) walidacje UI (backend i tak sprawdzi te same reguły)
  const validateBeforeModal = () => {
    if (email !== email.toLowerCase()) return alert("Email bez wielkich liter.");
    if (!/^[A-ZĄĆĘŁŃÓŚŻŹ][a-ząćęłńóśżź-]*$/.test(first))
      return alert("Imię: tylko litery, 1 wielka na początku.");
    if (!/^[A-ZĄĆĘŁŃÓŚŻŹ][a-ząćęłńóśżź-]*$/.test(last))
      return alert("Nazwisko: tylko litery, 1 wielka na początku.");
    if (!/\d/.test(password) || !/[^A-Za-z0-9]/.test(password) || password.length < 8)
      return alert("Hasło: min 8 znaków, 1 cyfra i 1 znak specjalny.");
    // wymóg .edu.pl dla studenta i .pl (nie .edu.pl) dla pracownika
    if (role === "student" && !email.endsWith(".edu.pl"))
      return alert("Student: e-mail musi kończyć się na .edu.pl");
    if (role === "researcher" && (email.endsWith(".edu.pl") || !email.endsWith(".pl")))
      return alert("Pracownik: e-mail w domenie .pl (nie .edu.pl)");

    setShowCodeModal(true);
  };

  // 5) finalny submit po wpisaniu kodu (styczeń2026)
  const submit = async () => {
    try {
      await api.post("/auth/register", {
        role,
        email: email.toLowerCase(),
        first_name: first,
        last_name: last,
        university,
        faculty,
        field: role === "student" ? field : null,
        study_year: role === "student" ? year : null,
        academic_title: role === "researcher" ? title : null,
        password,
        verification_code: code, // „styczeń2026”
      });
      alert("Konto utworzone. Zaloguj się.");
      navigate("/login");
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Rejestracja nieudana");
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Rejestracja"
        subtitle="Uzupełnij dane, aby założyć konto."
        footer={
          <div className="text-sm">
            Masz już konto?{" "}
            <Link to="/login" className="text-blue-700 hover:underline">
              Zaloguj się
            </Link>
          </div>
        }
      >
        {/* przełącznik roli – dwa „kwadraciki” */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={role === "student"}
              onChange={() => setRole("student")}
            />
            <span>Student</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={role === "researcher"}
              onChange={() => setRole("researcher")}
            />
            <span>Pracownik naukowy</span>
          </label>
        </div>

        {/* formularz w nowej szacie graficznej */}
        <div className="space-y-4">
          <TextField
            leftIcon={<Mail size={18} />}
            type="email"
            placeholder={
              role === "student"
                ? "np. jan.kowalski@agh.edu.pl"
                : "np. jan.kowalski@agh.pl"
            }
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              leftIcon={<User size={18} />}
              placeholder="Imię"
              value={first}
              onChange={(e) => setFirst(onlyNameCase(e.target.value))}
            />
            <TextField
              leftIcon={<User size={18} />}
              placeholder="Nazwisko"
              value={last}
              onChange={(e) => setLast(onlyNameCase(e.target.value))}
            />
          </div>

          <TextField
            leftIcon={<School size={18} />}
            placeholder="Uczelnia (auto z e-maila)"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            readOnly
          />

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Building2 size={18} />
            </span>
            <select
              className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-10 pr-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
            >
              <option value="">– wybierz wydział –</option>
              {faculties.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {role === "student" && (
            <>
              <TextField
                leftIcon={<BookOpen size={18} />}
                placeholder="Kierunek"
                value={field}
                onChange={(e) => setField(e.target.value)}
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Calendar size={18} />
                </span>
                <select
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-10 pr-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {["1", "2", "3", "4", "5"].map((y) => (
                    <option key={y} value={y}>
                      {`Rok ${y}`}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {role === "researcher" && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <User size={18} />
              </span>
              <select
                className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-10 pr-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              >
                {cfg.titles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          <TextField
            leftIcon={<Lock size={18} />}
            type="password"
            passwordToggle
            placeholder="Hasło (min 8, 1 cyfra i 1 znak specjalny)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <PrimaryButton
            type="button"
            onClick={validateBeforeModal}
            disabled={!canSubmit || !Object.keys(cfg.domain_to_uni).length}
          >
            Zatwierdź
          </PrimaryButton>
        </div>

        {/* Modal na kod weryfikacyjny */}
        {showCodeModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
              <h3 className="text-lg font-semibold">Wpisz kod weryfikacyjny</h3>
              <p className="text-sm text-slate-600 mb-4">
                Kod został wysłany na e-mail.
              </p>
              <TextField
                placeholder="np. styczeń2026"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <div className="mt-4 flex gap-3">
                <PrimaryButton type="button" onClick={submit}>
                  Potwierdź
                </PrimaryButton>
                <button
                  className="px-4 py-2 border rounded-lg"
                  onClick={() => setShowCodeModal(false)}
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
