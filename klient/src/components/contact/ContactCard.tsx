// src/components/contact/ContactCard.tsx
import React from "react";
import {
  Copy, Check, ExternalLink, MapPin, Phone, Mail,
  Globe, Newspaper, Rss, Facebook, Linkedin, Youtube, Twitter
} from "lucide-react";
import { motion } from "framer-motion";

export type ContactBlock = {
  title: string;
  subtitle?: string;
  items?: { label?: string; value: string; type?: "tel" | "email" | "url" | "text" }[];
  links?: { label: string; href: string }[];
};
export type ContactData = {
  header?: {
    title?: string;
    hours?: string;
    logoUrl?: string | null;
    social?: Record<string, string> | null;
  };
  address?: { lines: string[]; mapUrl?: string };
  sections: ContactBlock[];
};

const hrefFor = (v: string, type?: "tel" | "email" | "url" | "text") =>
  type === "tel" ? "tel:" + v.replace(/\s/g, "")
  : type === "email" ? "mailto:" + v
  : type === "url" ? (v.startsWith("http") ? v : "https://" + v)
  : undefined;

function SocialIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes("facebook")) return <Facebook size={18} />;
  if (n.includes("linkedin")) return <Linkedin size={18} />;
  if (n.includes("youtube")) return <Youtube size={18} />;
  if (n === "x" || n.includes("twitter")) return <Twitter size={18} />;
  return <ExternalLink size={18} />;
}

function ChipLink({
  href, icon, children, title,
}: { href: string; icon: React.ReactNode; children: React.ReactNode; title?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 text-sm
                 text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-200 dark:ring-slate-600 transition-colors"
    >
      {icon} {children}
    </a>
  );
}

function CopyBtn({ text, aria }: { text: string; aria?: string }) {
  const [ok, setOk] = React.useState(false);
  return (
    <button
      aria-label={aria || "Kopiuj do schowka"}
      onClick={async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        } catch {}
      }}
      className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium
                 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-indigo-300"
    >
      {ok ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {ok ? "Skopiowano" : "Kopiuj"}
    </button>
  );
}

function InfoRow({ type, value, label }:{
  type?: "tel"|"email"|"url"|"text"; value: string; label?: string;
}) {
  const href = hrefFor(value, type);
  const Icon =
    type === "tel" ? Phone :
    type === "email" ? Mail :
    type === "url" ? Globe :
    ExternalLink;

  const content = (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
      <div className="min-w-0">
        {label && <span className="font-medium text-slate-900 dark:text-slate-100 mr-1">{label}:</span>}
        <span className="text-slate-800 dark:text-slate-200 break-words">{value}</span>
      </div>
      <CopyBtn text={value} aria={`Skopiuj ${label || value}`} />
    </div>
  );

  return (
    <li className="group">
      {href ? (
        <a
          href={href}
          target={type === "url" ? "_blank" : undefined}
          rel="noreferrer"
          className="block rounded-xl px-2 py-2 -mx-2 transition-colors group-hover:bg-slate-50/80 dark:group-hover:bg-slate-700/50
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          {content}
        </a>
      ) : content}
    </li>
  );
}

function Card({
  title, right, children,
}:{ title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl bg-white/70 dark:bg-slate-800/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-800/80
                 border border-white/60 dark:border-slate-600 shadow-[0_8px_30px_-15px_rgba(15,23,42,0.25)] dark:shadow-[0_8px_30px_-15px_rgba(0,0,0,0.3)]"
    >
      <div className="p-5 border-b border-slate-200/70 dark:border-slate-600/70 flex items-start justify-between gap-3">
        {/* POWIĘKSZONE NAGŁÓWKI KAFELKÓW */}
        <h3 className="text-[20px] md:text-[21px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

/* =================== MAIN =================== */
export default function ContactCard({ data }: { data: ContactData }) {
  const header = data.header ?? { title: "Kontakt" };

  // sekcja „Kontakt ogólny” jeśli istnieje
  const generalIdx = data.sections.findIndex((s) => s.title.toLowerCase().includes("ogóln"));
  const general = generalIdx >= 0 ? data.sections[generalIdx] : undefined;
  const rest   = generalIdx >= 0 ? data.sections.filter((_, i) => i !== generalIdx) : data.sections;

  return (
    // KONIEC POZIOMEGO SCROLLA: overflow-hidden + tło bez -inset
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_300px_at_0%_-10%,theme(colors.indigo.100/60),transparent),radial-gradient(700px_260px_at_100%_-20%,theme(colors.sky.100/55),transparent),radial-gradient(600px_200px_at_50%_110%,theme(colors.fuchsia.100/45),transparent)] blur-xl" />
      </div>

      {/* HERO */}
      <div className="overflow-hidden rounded-[28px] border border-white/60 dark:border-slate-600 bg-white/70 dark:bg-slate-800/90 backdrop-blur supports-[backdrop-filter]:bg-white/55 dark:supports-[backdrop-filter]:bg-slate-800/80
                      shadow-[0_12px_40px_-16px_rgba(15,23,42,0.25)] dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.3)] mb-6">
        <div className="relative p-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            {/* lewa: DUŻE LOGO + tytuł */}
            <div className="flex items-center gap-4 min-w-0">
              {header.logoUrl && (
                <img
                  src={header.logoUrl}
                  alt=""
                  className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-contain bg-white/60 dark:bg-slate-700/60 p-1 ring-1 ring-slate-200 dark:ring-slate-600 shrink-0"
                />
              )}
              <div className="min-w-0">
                {/* POWIĘKSZONY TYTUŁ */}
                <div className="truncate text-[24px] md:text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {header.title || "Kontakt"}
                </div>
                {header.hours && (
                  <div className="text-[14px] text-slate-600 dark:text-slate-400">
                    {header.hours.replace("pn–pt", "poniedziałek – piątek").replace("pn-pt", "poniedziałek – piątek")}
                  </div>
                )}
              </div>
            </div>

            {/* prawa: social */}
            {header.social && (
              <div className="flex items-center gap-2">
                {Object.entries(header.social).map(([name, href]) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    title={name}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-slate-700/90
                               ring-1 ring-slate-200 dark:ring-slate-600 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    <SocialIcon name={name} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GRID sekcji */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Adres */}
        {data.address && (
          <Card
            title="Dane adresowe"
            right={
              data.address.mapUrl ? (
                <ChipLink href={data.address.mapUrl} icon={<MapPin size={16} />} title="Pokaż na mapie">
                  Mapa
                </ChipLink>
              ) : null
            }
          >
            <div className="text-[16px] text-slate-700 dark:text-slate-300 leading-relaxed min-w-0 break-words">
              {data.address.lines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </Card>
        )}

        {/* Kontakt ogólny */}
        {general && (
          <Card
            title="Kontakt ogólny"
            right={
              <div className="flex flex-wrap gap-2">
                {/* jeżeli w general.links dodasz WWW/BIP/RSS, chipy pojawią się same */}
                {general.links?.map(l => (
                  <ChipLink key={l.href}
                            href={l.href}
                            icon={/bip/i.test(l.label) ? <Newspaper size={16}/> : /rss/i.test(l.label) ? <Rss size={16}/> : <Globe size={16}/>}>
                    {l.label}
                  </ChipLink>
                ))}
              </div>
            }
          >
            <ul className="space-y-2">
              {general.items?.map((it, i) => (
                <InfoRow key={i} type={it.type} value={it.value} label={it.label} />
              ))}
            </ul>
          </Card>
        )}

        {/* Pozostałe sekcje */}
        {rest.map((s) => (
          <Card
            key={s.title}
            title={s.title}
            right={s.subtitle ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs
                               px-2.5 py-1 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-600">
                {s.subtitle}
              </span>
            ) : undefined}
          >
            {!!s.items?.length && (
              <ul className="space-y-2">
                {s.items.map((it, i) => (
                  <InfoRow key={i} type={it.type} value={it.value} label={it.label} />
                ))}
              </ul>
            )}
            {!!s.links?.length && (
              <div className="mt-4 flex flex-wrap gap-2">
                {s.links.map((l) => (
                  <ChipLink key={l.href} href={l.href} icon={<ExternalLink size={16}/>}>
                    {l.label}
                  </ChipLink>
                ))}
              </div>
            )}
          </Card>
        ))}

      </div>
    </section>
  );
}
