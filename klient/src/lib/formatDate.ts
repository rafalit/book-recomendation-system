export function formatDateOnly(dateStr: string) {
  if (!dateStr) return "";

  const pureDate = dateStr.split("T")[0];

  const [y, m, d] = pureDate.split("-");
  if (!y || !m || !d) return dateStr;

  return `${d}.${m}.${y}`; 
}
