/** Separa a legenda do Instagram em abertura, parágrafos, fontes e hashtags para ler melhor no site. */
function separar(legenda: string) {
  const partes = legenda
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const ehHashtags = (p: string) => p.split(/\s+/).every((t) => t.startsWith("#"));
  const ehFontes = (p: string) => /^(?:\p{Extended_Pictographic}|️|\s)*Fontes?:/u.test(p);

  const hashtags = partes.filter(ehHashtags).flatMap((p) => p.split(/\s+/));
  const fontes = partes.find(ehFontes) ?? null;
  const texto = partes.filter((p) => !ehHashtags(p) && !ehFontes(p));
  return { abertura: texto[0] ?? "", corpo: texto.slice(1), fontes, hashtags };
}

export default function LegendaFormatada({ legenda }: { legenda: string }) {
  const { abertura, corpo, fontes, hashtags } = separar(legenda);

  return (
    <div className="card p-6 sm:p-8">
      {abertura && <p className="whitespace-pre-line text-xl font-semibold leading-snug tracking-tight text-fg">{abertura}</p>}

      {corpo.length > 0 && (
        <div className="mt-5 space-y-4">
          {corpo.map((p, i) => (
            <p key={i} className="whitespace-pre-line border-l-2 border-accent-strong/25 pl-4 text-base leading-relaxed text-fg">
              {p}
            </p>
          ))}
        </div>
      )}

      {fontes && <p className="mt-6 whitespace-pre-line border-t border-line pt-4 text-xs leading-relaxed text-muted">{fontes}</p>}

      {hashtags.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Hashtags">
          {hashtags.map((h) => (
            <li key={h} className="chip">
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
