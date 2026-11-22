// « Aujourd'hui » pour les relances : calculé en Europe/Paris, ici et nulle part ailleurs.
const PARIS_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// La date du jour à Paris, au format AAAA-MM-JJ (comparable comme une chaîne).
export function parisToday(now: Date): string {
  return PARIS_DATE.format(now);
}
