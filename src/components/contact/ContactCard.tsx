import React from "react";
import {
  Copy,
  ExternalLink,
  MapPin,
  Check,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
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
    emoji?: string;
    logoUrl?: string | null;
    social?: Record<string, string> | null;
  };
  address?: { lines: string[]; mapUrl?: string };
  sections: ContactBlock[];
};

// --- helpers ---------------------------------------------------------------
function hrefFor(v: string, type?: "tel" | "email" | "url" | "text") {
  if (type === "tel") return "tel:" + v.replace(/\s/g, "");
  if (type === "email") return "mailto:" + v;
  if (type === "url") return v.startsWith("http") ? v : "https://" + v;
  return undefined;
}

function emojiFor(type?: "tel" | "email" | "url" | "text") {
  if (type === "tel") return "📞";
  if (type === "email") return "✉️";
  if (type === "url") return "🌐";
  return "•";
}

function SocialIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes("facebook")) return <Facebook size={18} className="text-slate-600" />;
  if (n.includes("linkedin")) return <Linkedin size={18} className="text-slate-600" />;
  if (n.includes("youtube")) return <Youtube size={18} className="text-slate-600" />;
  if (n === "x" || n.includes("twitter")) return <Twitter size={18} className="text-slate-600" />;
  return <ExternalLink size={18} className="text-slate-600" />;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// --- UI bits ---------------------------------------------------------------
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
        } catch { }
      }}
      className="ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
    >
      {ok ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
      {ok ? "Skopiowano" : "Kopiuj"}
    </button>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/70 bg-indigo-50/70 px-3 py-1 text-xs font-medium text-indigo-700">
      {children}
    </span>
  );
}

function Block({ block }: { block: ContactBlock }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* gradient border */}
      <div className="p-[1px] rounded-3xl bg-gradient-to-br from-indigo-200/70 via-sky-200/50 to-fuchsia-200/70 shadow-[0_6px_20px_-8px_rgba(99,102,241,0.35)]">
        {/* inner card */}
        <div className="rounded-[calc(theme(borderRadius.3xl)-1px)] border border-white/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 hover:bg-white/75 transition-colors">
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[21px] leading-6 font-semibold text-slate-900 tracking-tight">
                {block.title}
              </h3>
              {block.subtitle && <StatPill>{block.subtitle}</StatPill>}
            </div>

            {block.items?.length ? (
              <ul className="mt-4 space-y-2.5">
                {block.items.map((it, i) => {
                  const h = hrefFor(it.value, it.type);
                  const content = (
                    <div className="flex items-center gap-2 text-[16px] text-slate-800">
                      <span className="select-none" aria-hidden>{emojiFor(it.type)}</span>
                      <span className="min-w-0 truncate">
                        {it.label && <span className="font-medium mr-1 text-slate-900">{it.label}:</span>}
                        <span className="font-[450]">{it.value}</span>
                      </span>
                      <CopyBtn text={it.value} aria={`Skopiuj ${it.label || it.value}`} />
                    </div>
                  );
                  return (
                    <li key={i} className="group">
                      {h ? (
                        <a
                          href={h}
                          target={it.type === "url" ? "_blank" : undefined}
                          rel="noreferrer"
                          className="block rounded-xl px-2.5 py-2 -mx-2.5 transition-colors group-hover:bg-slate-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        >
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {block.links?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {block.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-1.5 text-sm text-indigo-800 ring-1 ring-inset ring-indigo-200 hover:from-indigo-100 hover:to-sky-100 transition-colors"
                  >
                    <ExternalLink size={16} /> {l.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}


// --- main component --------------------------------------------------------
export default function ContactCard({ data }: { data: ContactData }) {
  const header = data.header ?? { title: "Kontakt", emoji: "📞" };

  const generalIdx = data.sections.findIndex((s) =>
    s.title.toLowerCase().includes("ogólny")
  );
  const general = generalIdx >= 0 ? data.sections[generalIdx] : undefined;
  const rest =
    generalIdx >= 0 ? data.sections.filter((_, i) => i !== generalIdx) : data.sections;

  return (
    <section className="relative">
      {/* dreamy background */}
      <div aria-hidden className="pointer-events-none absolute -inset-8 -z-30">
        <div className="absolute inset-0 bg-[radial-gradient(900px_300px_at_0%_-10%,theme(colors.indigo.100/60),transparent),radial-gradient(700px_260px_at_100%_-20%,theme(colors.sky.100/55),transparent),radial-gradient(600px_200px_at_50%_110%,theme(colors.fuchsia.100/45),transparent)] blur-xl" />
      </div>

      {/* subtle watermark */}
      {header.logoUrl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 opacity-[0.03] flex items-center justify-center"
        >
          <img
            src={header.logoUrl}
            alt=""
            className="w-[72%] max-w-[720px] object-contain blur-[0.6px]"
          />
        </div>
      )}

      {/* OUTER CARD */}
      <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/55 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.25)] relative">
        {/* HEADER */}
        {/* HEADER */}
        <div className="relative border-b border-slate-200/70 overflow-hidden">
          <div
            className="absolute inset-0 bg-[radial-gradient(1200px_220px_at_10%_-80px,theme(colors.indigo.50),transparent),radial-gradient(800px_200px_at_90%_-60px,theme(colors.sky.50),transparent)]"
            aria-hidden
          />

          {/* watermark lewy */}
          {header.logoUrl && (
            <div
              aria-hidden
              className="pointer-events-none select-none absolute inset-y-0 left-0 w-[220px] md:w-[300px] opacity-[0.80] z-0 hidden sm:block"
            >
              <img
                src={header.logoUrl}
                alt=""
                className="h-full w-full object-contain object-left pl-6"
              />
            </div>
          )}

          {/* watermark prawy */}
          {header.logoUrl && (
            <div
              aria-hidden
              className="pointer-events-none select-none absolute inset-y-0 right-0 w-[220px] md:w-[300px] opacity-[0.80] z-0 hidden sm:block"
            >
              <img
                src={header.logoUrl}
                alt=""
                className="h-full w-full object-contain object-right pr-6"
              />
            </div>
          )}

          {/* treść nagłówka – podniesiona nad watermark + poduszki po bokach */}
          <div className="relative z-10 p-6 pl-24 pr-24 md:pl-40 md:pr-40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <div className="truncate text-[24px] leading-7 font-extrabold tracking-tight text-slate-900">
                    {header.title}
                  </div>
                  {header.hours && (
                    <div className="text-[15px] text-slate-600">
                      {header.hours.replace("pn-pt", "poniedziałek – piątek")}
                    </div>
                  )}
                </div>
              </div>

              {header.social && (
                <div className="relative z-10 flex items-center gap-2.5">
                  {Object.entries(header.social).map(([name, href]) => (
                    <a
                      key={name}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      title={name}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 ring-1 ring-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                    >
                      <SocialIcon name={name} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============= CONTENT (układ jak wcześniej) ============= */}
        <div className="p-6">
          {/* rząd 1: adres + kontakt ogólny */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.address && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35 }}
                className="p-[1px] rounded-3xl bg-gradient-to-br from-indigo-200/70 via-sky-200/50 to-fuchsia-200/70"
              >
                <div className="rounded-[calc(theme(borderRadius.3xl)-1px)] border border-white/60 bg-white/75 backdrop-blur p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-indigo-600" />
                    <h3 className="text-[20px] font-semibold text-slate-900">Dane adresowe</h3>
                  </div>
                  <div className="mt-2 text-[16px] text-slate-700 leading-relaxed">
                    {data.address.lines.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                  {data.address.mapUrl && (
                    <a
                      href={data.address.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
                    >
                      <ExternalLink size={16} /> Zobacz na mapie
                    </a>
                  )}
                </div>
              </motion.div>
            )}

            {general && <Block block={general} />}
          </div>

          {/* rząd 2: pozostałe sekcje w 2 kolumnach */}
          {!!rest.length && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {rest.map((s) => (
                <Block key={s.title} block={s} />
              ))}
            </div>
          )}
        </div>
        {/* ============= /CONTENT ============= */}
      </div>
    </section>
  );
}

