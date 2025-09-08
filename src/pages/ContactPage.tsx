import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TopNav from "../components/layout/TopNav";
import UniversitySidebar from "../components/home/UniversitySidebar";
import ContactCard, { ContactData, ContactBlock } from "../components/contact/ContactCard";

type Config = { university_faculties: Record<string, string[]> };

function toMapUrl(addr: any) {
  if (!addr) return undefined;
  if (addr.lat && addr.lon) {
    return `https://www.google.com/maps?q=${addr.lat},${addr.lon}`;
  }
  const q = [addr.street, `${addr.postal_code} ${addr.city}`].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function mapToCard(uniName: string, contacts: any): ContactData {
  const header = {
    title: `Kontakt – ${uniName}`,
    hours: contacts.hours || undefined,
    emoji: "📞",
    logoUrl: contacts.logo || null,            
    social: contacts.social || null,          
  };

  const addressLines: string[] = [];
  if (contacts.address?.street) addressLines.push(contacts.address.street);
  const pc = [contacts.address?.postal_code, contacts.address?.city].filter(Boolean).join(" ");
  if (pc) addressLines.push(pc);

  const sections: ContactBlock[] = [];

  // Kontakt ogólny
  sections.push({
    title: "Kontakt ogólny",
    items: [
      ...(contacts.phones?.length ? contacts.phones.map((p: string) => ({ value: p, type: "tel" as const })) : []),
      ...(contacts.email ? [{ value: contacts.email, type: "email" as const }] : []),
      ...(contacts.www ? [{ value: contacts.www, type: "url" as const, label: "www" }] : []),
      ...(contacts.bip ? [{ value: contacts.bip, type: "url" as const, label: "BIP" }] : []),
    ],
  });

  if (contacts.recruitment) {
    sections.push({
      title: "Rekrutacja",
      subtitle: contacts.recruitment.hours || undefined,
      items: [
        ...(contacts.recruitment.phone ? [{ value: contacts.recruitment.phone, type: "tel" as const }] : []),
        ...(contacts.recruitment.email ? [{ value: contacts.recruitment.email, type: "email" as const }] : []),
      ],
      links: contacts.recruitment.www ? [{ label: "Strona rekrutacji", href: contacts.recruitment.www }] : undefined,
    });
  }

  if (contacts.international) {
    sections.push({
      title: "Biuro współpracy międzynarodowej",
      items: [
        ...(contacts.international.phone ? [{ value: contacts.international.phone, type: "tel" as const }] : []),
        ...(contacts.international.email ? [{ value: contacts.international.email, type: "email" as const }] : []),
      ],
      links: contacts.international.www ? [{ label: "Strona biura", href: contacts.international.www }] : undefined,
    });
  }

  if (contacts.press) {
    sections.push({
      title: "Biuro prasowe",
      items: [
        ...(contacts.press.phone ? [{ value: contacts.press.phone, type: "tel" as const }] : []),
        ...(contacts.press.email ? [{ value: contacts.press.email, type: "email" as const }] : []),
      ],
    });
  }

  if (Array.isArray(contacts.faculties_offices) && contacts.faculties_offices.length) {
    // grupujemy każdy dziekanat w osobny kafelek (lub jeden zbiorczy – jak wolisz)
    contacts.faculties_offices.forEach((o: any) => {
      sections.push({
        title: `Dziekanat – ${o.faculty}`,
        items: [
          ...(o.phone ? [{ value: o.phone, type: "tel" as const }] : []),
          ...(o.email ? [{ value: o.email, type: "email" as const }] : []),
        ],
      });
    });
  }

  return {
    header,
    address: addressLines.length ? { lines: addressLines, mapUrl: toMapUrl(contacts.address) } : undefined,
    sections,
  };
}

export default function ContactPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [selected, setSelected] = useState<string>("wszystkie");
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(false);

  // uczelnie z configu
  useEffect(() => {
    axios.get<Config>("http://127.0.0.1:8000/meta/config")
      .then(r => setCfg(r.data))
      .catch(() => setCfg({ university_faculties: {} }));
  }, []);

  const universities = useMemo(() =>
    cfg ? Object.keys(cfg.university_faculties).sort((a, b) => a.localeCompare(b, "pl")) : [],
    [cfg]
  );

  // pobierz kontakt dla wybranej uczelni
  useEffect(() => {
    if (selected === "wszystkie") { setContact(null); return; }
    setLoading(true);
    axios.get(`http://127.0.0.1:8000/contact/${encodeURIComponent(selected)}`)
      .then(r => setContact(mapToCard(selected, r.data)))
      .catch(() => setContact(null))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      <TopNav />
      <div className="mx-auto max-w-[2000px] px-2 py-4 w-full h-[calc(100vh-80px)]
                      grid grid-cols-1 md:grid-cols-[400px,1fr] gap-4 overflow-hidden">
        <div className="h-full overflow-hidden">
          <UniversitySidebar
            universities={universities}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full overflow-y-auto p-4">
          {selected === "wszystkie" ? (
            <div className="text-slate-600">Wybierz uczelnię z lewej, aby zobaczyć dane kontaktowe.</div>
          ) : loading ? (
            <div className="text-slate-600">Ładowanie…</div>
          ) : contact ? (
            <ContactCard data={contact} />
          ) : (
            <div className="text-slate-600">Brak danych kontaktowych.</div>
          )}
        </section>
      </div>
    </div>
  );
}
