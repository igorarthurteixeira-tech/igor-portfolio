import {
  STATUS,
  dataCurtaIso,
  dataHora,
  ehImagem,
  ehVideo,
  rotuloTipo,
  tamanhoLegivel,
  youtubeId,
  type Evento,
  type Pedido,
} from "@/lib/etm";
import type { ArquivoComUrl } from "@/lib/etm-servidor";
import EtapasPedido from "./EtapasPedido";

export function SeloStatus({ status }: { status: Pedido["status"] }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS[status].cor}`}>
      {STATUS[status].rotulo}
    </span>
  );
}

/**
 * Link de vídeo do YouTube vira player embutido e o endereço não aparece na tela.
 * Qualquer outro link continua como texto clicável.
 */
function LinkOuPlayer({ link, titulo }: { link: string; titulo: string }) {
  const id = youtubeId(link);
  if (!id) {
    return (
      <p className="mt-2 text-sm">
        <a href={link} target="_blank" rel="noreferrer" className="break-all font-semibold text-accent-strong hover:underline">
          {link}
        </a>
      </p>
    );
  }
  return (
    <div className="mt-3 aspect-video overflow-hidden rounded-xl bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        title={titulo}
        loading="lazy"
        allow="fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-full w-full"
      />
    </div>
  );
}

function Arquivos({ itens }: { itens: ArquivoComUrl[] }) {
  if (itens.length === 0) return null;
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
      {itens.map((a) => (
        <li key={a.id} className="overflow-hidden rounded-xl border border-line bg-page">
          {a.url && ehVideo(a.nome) ? (
            <video controls preload="metadata" src={a.url} className="max-h-96 w-full bg-black" />
          ) : a.url && ehImagem(a.nome) ? (
            <a href={a.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.nome} loading="lazy" className="max-h-72 w-full bg-black object-contain" />
            </a>
          ) : null}
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <span className="min-w-0 truncate text-fg" title={a.nome}>{a.nome}</span>
            <span className="flex shrink-0 items-center gap-3 text-muted">
              {tamanhoLegivel(a.tamanho)}
              {a.url && (
                <a href={a.url} target="_blank" rel="noreferrer" className="font-semibold text-accent-strong hover:underline">
                  Abrir
                </a>
              )}
              {a.urlBaixar && (
                <a href={a.urlBaixar} className="font-semibold text-accent-strong hover:underline">
                  Baixar
                </a>
              )}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function titulo(e: Evento) {
  switch (e.tipo) {
    case "criado": return "Pedido criado";
    case "entrega": return `Versão ${e.versao ?? ""} entregue para avaliação`;
    case "correcao": return "Correção solicitada";
    case "aprovacao": return "Vídeo aprovado";
    case "status": return `Status: ${e.status_novo ? STATUS[e.status_novo].rotulo : ""}`;
    default: return "Mensagem";
  }
}

const COR_BORDA: Record<Evento["tipo"], string> = {
  criado: "border-l-slate-400",
  comentario: "border-l-slate-300",
  status: "border-l-blue-400",
  entrega: "border-l-amber-500",
  correcao: "border-l-orange-500",
  aprovacao: "border-l-emerald-500",
};

export default function DetalhePedido({
  pedido,
  eventos,
  arquivos,
  comTitulo = true,
}: {
  comTitulo?: boolean;
  pedido: Pedido;
  eventos: Evento[];
  arquivos: ArquivoComUrl[];
}) {
  const info: [string, string][] = [
    ["Pedido de", pedido.solicitante_nome],
    ["Tipo", rotuloTipo(pedido.tipo)],
    ["Prazo desejado", dataCurtaIso(pedido.prazo)],
    ["Aberto em", dataHora(pedido.criado_em)],
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-muted">Pedido #{pedido.numero}</span>
          <SeloStatus status={pedido.status} />
          {pedido.urgente && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Urgente</span>}
        </div>
        {comTitulo && <h1 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{pedido.titulo}</h1>}
        <p className="mt-2 text-sm text-muted">{STATUS[pedido.status].dica}</p>

        <div className="mt-6 rounded-xl bg-page px-3 py-5 sm:px-6">
          <EtapasPedido status={pedido.status} />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-4">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{k}</dt>
              <dd className="mt-1 text-sm text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-fg">{pedido.descricao}</p>
        {pedido.link_material && (
          <div className="mt-4">
            {!youtubeId(pedido.link_material) && <p className="text-sm text-muted">Pasta do material:</p>}
            <LinkOuPlayer link={pedido.link_material} titulo="Material enviado" />
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-fg">Andamento</h2>
        <ol className="space-y-4">
          {[...eventos].reverse().map((e) => (
            <li key={e.id} className={`card border-l-4 p-5 ${COR_BORDA[e.tipo]}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-fg">{titulo(e)}</p>
                <p className="text-xs text-muted">
                  {e.autor_nome} · {dataHora(e.criado_em)}
                </p>
              </div>
              {e.texto && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">{e.texto}</p>}
              {e.link && <LinkOuPlayer link={e.link} titulo={titulo(e)} />}
              <Arquivos itens={arquivos.filter((a) => a.evento_id === e.id)} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
