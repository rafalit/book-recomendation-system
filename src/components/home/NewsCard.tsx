import { useMemo, useState } from "react";
import { Globe } from "lucide-react";

export type NewsCardProps = {
  title: string;
  link: string;
  source?: string | null;
  snippet?: string | null;
  date?: string | null;
  thumbnail?: string | null;
  publisher_domain?: string | null;   // domena wydawcy z backendu
  publisher_favicon?: string | null;  // gotowy URL favikony (jeśli backend poda)
};

export function hostFrom(link: string): string | null {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function timeAgo(date?: string | null): string {
  if (!date) return "";
  const t = Date.parse(date || "");
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "przed chwilą";
  if (m < 60) return `${m} min temu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} godz temu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} dni temu`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} mies. temu`;
  const y = Math.floor(mo / 12);
  return `${y} lat temu`;
}

// z HTML wyciągnij href pierwszego <a> – backup, gdy snippet jednak przyjdzie jako HTML
function extractFirstHref(html?: string | null): string | null {
  if (!html) return null;
  const div = document.createElement("div");
  div.innerHTML = html;
  const a = div.querySelector("a[href]");
  return a?.getAttribute("href") || null;
}

const isGoogleDomain = (s?: string | null) =>
  !!s && (/(^|\.)google\./i.test(s) || /google\s*news/i.test(s));

function resolvePublisher(
  title: string,
  link: string,
  source?: string | null,
  snippet?: string | null
) {
  if (isGoogleDomain(source)) source = undefined;

  if (source && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(source) && !isGoogleDomain(source)) {
    return { label: source, domain: source };
  }

  const href = extractFirstHref(snippet);
  const domFromSnippet = href ? hostFrom(href) : null;
  if (domFromSnippet && !isGoogleDomain(domFromSnippet)) {
    return { label: domFromSnippet, domain: domFromSnippet };
  }

  const m = title.match(/[-–—]\s*([^–—-]+)$/);
  const fromTitle = m ? m[1].trim() : undefined;

  const fallbackDomain = hostFrom(link) || undefined;

  const label =
    source && !isGoogleDomain(source)
      ? source
      : fromTitle || fallbackDomain || "źródło";

  return { label, domain: fallbackDomain };
}

// usuń duplikat tytułu i spróbuj dać 2–3 zdania snippetu
function cleanedPreview(title: string, snippet?: string | null): string {
  if (!snippet) return "";
  const div = document.createElement("div");
  div.innerHTML = snippet;
  let text = (div.textContent || div.innerText || "").trim().replace(/\s+/g, " ");

  const norm = (s: string) =>
    s.toLowerCase().replace(/[\s\-–—:;,.!?\"“”'’]+/g, " ").trim();
  if (norm(text) === norm(title) || norm(text).startsWith(norm(title))) return "";

  const parts = text.split(/(?<=[\.!?…])\s+/).filter(Boolean);
  const joined = parts.slice(0, 3).join(" ");
  const MAX = 280;
  const cut =
    joined.length > MAX
      ? joined.slice(0, MAX).replace(/\s+\S*$/, "") + "…"
      : joined;
  return cut.length < 40 ? "" : cut;
}

// placeholder jako data URL (zero requestów, brak 404)
const PLACEHOLDER_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
       <rect width='100%' height='100%' fill='#e2e8f0'/>
       <text x='50%' y='54%' text-anchor='middle' font-size='64' fill='#64748b'>📰</text>
     </svg>`
  );

export default function NewsCard({
  title,
  link,
  source,
  snippet,
  date,
  thumbnail,
  publisher_domain,
  publisher_favicon,
}: NewsCardProps) {
  const pub = resolvePublisher(title, link, source ?? undefined, snippet ?? undefined);
  const preview = cleanedPreview(title, snippet);

  const host = publisher_domain || hostFrom(link) || undefined;

  const initialFavicon = useMemo(() => {
    if (publisher_favicon) return publisher_favicon;
    return host
      ? `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&url=https://${host}&size=128`
      : PLACEHOLDER_DATA_URL;
  }, [publisher_favicon, host]);

  const [faviconSrc, setFaviconSrc] = useState(initialFavicon);

  const handleFaviconError = () => {
    if (faviconSrc !== PLACEHOLDER_DATA_URL) {
      setFaviconSrc(PLACEHOLDER_DATA_URL);
    }
  };

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm transition"
    >
      <div className="p-4 grid grid-cols-[1fr,160px] gap-4 items-start">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {faviconSrc ? (
              <img
                src={faviconSrc}
                alt=""
                className="h-4 w-4 rounded-sm"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={handleFaviconError}
              />
            ) : (
              <Globe size={14} className="text-slate-500" />
            )}
            <span className="truncate">{pub.label}</span>
            {date && <span className="text-slate-400">• {timeAgo(date)}</span>}
          </div>

          <h3 className="mt-1 text-[18px] leading-snug font-semibold text-slate-900">
            {title}
          </h3>
          {preview && <p className="mt-1 text-sm text-slate-600">{preview}</p>}
        </div>

        {thumbnail && (
          <img
            src={thumbnail}
            alt=""
            className="w-40 h-28 object-cover rounded-md border border-slate-200"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </a>
  );
}
