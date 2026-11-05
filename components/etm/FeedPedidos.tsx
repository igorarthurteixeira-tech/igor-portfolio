import Link from "next/link";
import {
  ROTULO_EVENTO,
  chaveDia,
  dataCurtaIso,
  dataHora,
  hora,
  rotuloDia,
  rotuloTipo,
  type Pedido,
  type ResumoPedido,
  type StatusPedido,
  type Visao,
} from "@/lib/etm";
import { SeloStatus } from "./DetalhePedido";
import { EtapasCompactas } from "./EtapasPedido";

const BORDA: Record<StatusPedido, string> = {
  recebido: "border-l-slate-400",
  aguardando_aceite: "border-l-sky-500",
  em_producao: "border-l-blue-500",
  em_avaliacao: "border-l-amber-500",
  correcao: "border-l-orange-500",
  aprovado: "border-l-emerald-500",
  enviado: "border-l-emerald-700",
  cancelado: "border-l-slate-300",
};

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-page px-2.5 py-1 text-xs font-medium text-slate-600">{children}</span>;
}

function Cartao({
  pedido: p,
  resumo,
  base,
  aguarda,
  destacarPerguntas,
  visao,
}: {
  pedido: Pedido;
  resumo?: ResumoPedido;
  base: string;
  aguarda: boolean;
  destacarPerguntas: boolean;
  visao: Visao;
}) {
  const ultimo = resumo?.ultimo;
  const perguntas = resumo?.perguntasAbertas ?? 0;
  // para a ETM a pergunta aberta destaca o cartão inteiro; para quem produz é só um aviso de que falta resposta
  const destaque = destacarPerguntas && perguntas > 0;
  return (
    <Link
      href={`${base}/${p.id}`}
      className={`card card-hover group block border-l-4 p-5 ${BORDA[p.status]} ${destaque ? "bg-amber-50 ring-2 ring-amber-400" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted">
          #{p.numero} · {hora(p.criado_em)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {perguntas > 0 && (
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">
              {destacarPerguntas
                ? perguntas > 1 ? `${perguntas} perguntas para você` : "Pergunta para você"
                : "Aguardando resposta da ETM"}
            </span>
          )}
          {aguarda && <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">Precisa de ação</span>}
          {p.urgente && <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">Urgente</span>}
          <SeloStatus status={p.status} visao={visao} />
        </div>
      </div>

      <h3 className="mt-2 text-lg font-bold leading-snug text-fg transition group-hover:text-accent-strong">{p.titulo}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{p.descricao}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Chip>{rotuloTipo(p.tipo)}</Chip>
        <Chip>{p.solicitante_nome}</Chip>
        <Chip>Prazo: {dataCurtaIso(p.prazo)}</Chip>
        {!!resumo?.arquivos && <Chip>{resumo.arquivos} arquivo{resumo.arquivos > 1 ? "s" : ""}</Chip>}
        {!!resumo?.versoes && <Chip>{resumo.versoes} {resumo.versoes > 1 ? "versões" : "versão"}</Chip>}
      </div>

      <div className="mt-4">
        <EtapasCompactas status={p.status} />
      </div>

      <p className="mt-3 truncate text-xs text-muted">
        {ultimo ? (
          <>
            <span className="font-semibold text-slate-700">{ROTULO_EVENTO[ultimo.tipo]}</span> por {ultimo.autor_nome} ·{" "}
            {dataHora(ultimo.criado_em)}
            {ultimo.texto ? ` · “${ultimo.texto}”` : ""}
          </>
        ) : (
          "Sem movimentação ainda"
        )}
      </p>
    </Link>
  );
}

/**
 * Feed de pedidos: do mais recente para o mais antigo, separado por dia.
 * `base` é o prefixo do endereço (/etm ou /admin/etm); `precisaAcao` marca os cartões que esperam quem está olhando.
 */
export default function FeedPedidos({
  pedidos,
  resumos,
  base,
  precisaAcao,
  vazio,
  destacarPerguntas = false,
  visao = "etm",
}: {
  pedidos: Pedido[];
  resumos: Record<string, ResumoPedido>;
  base: string;
  precisaAcao: StatusPedido[];
  vazio: string;
  /** Na área da ETM, pergunta sem resposta destaca o cartão. */
  destacarPerguntas?: boolean;
  /** Quem está olhando: muda o texto de alguns status. */
  visao?: Visao;
}) {
  if (pedidos.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 border-dashed p-10 text-center">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 5h16v11H4zM8 20h8M12 16v4" />
        </svg>
        <p className="text-sm text-muted">{vazio}</p>
      </div>
    );
  }

  const dias: { chave: string; rotulo: string; itens: Pedido[] }[] = [];
  for (const p of pedidos) {
    const chave = chaveDia(p.criado_em);
    const ultimo = dias[dias.length - 1];
    if (ultimo?.chave === chave) ultimo.itens.push(p);
    else dias.push({ chave, rotulo: rotuloDia(p.criado_em), itens: [p] });
  }

  return (
    <div className="space-y-8">
      {dias.map((d) => (
        <section key={d.chave}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted first-letter:uppercase">{d.rotulo}</h2>
          <ul className="space-y-3">
            {d.itens.map((p) => (
              <li key={p.id}>
                <Cartao pedido={p} resumo={resumos[p.id]} base={base} aguarda={precisaAcao.includes(p.status)} destacarPerguntas={destacarPerguntas} visao={visao} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
