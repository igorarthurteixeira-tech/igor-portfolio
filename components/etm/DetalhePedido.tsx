import {
  STATUS,
  dataCurtaIso,
  dicaStatus,
  rotuloStatus,
  dataHora,
  ehImagem,
  ehPdf,
  ehVideo,
  rotuloTipo,
  tamanhoLegivel,
  youtubeId,
  perguntasAbertas,
  permissoesMensagem,
  type Evento,
  type Pedido,
  type Visao,
} from "@/lib/etm";
import type { ArquivoComUrl } from "@/lib/etm-servidor";
import AbrirArquivo from "./AbrirArquivo";
import MensagemEditavel from "./MensagemEditavel";

export function SeloStatus({ status, visao = "etm" }: { status: Pedido["status"]; visao?: Visao }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS[status].cor}`}>
      {rotuloStatus(status, visao)}
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
      {itens.map((a) => {
        const abre = !!a.url && (ehVideo(a.nome) || ehImagem(a.nome) || ehPdf(a.nome));
        // entrega sem link de download = download bloqueado (pedido em correção)
        const bloqueado = a.papel === "entrega" && !a.urlBaixar;
        return (
          <li key={a.id} className="overflow-hidden rounded-xl border border-line bg-page">
            {a.url && ehVideo(a.nome) ? (
              <video
                controls
                preload="metadata"
                src={a.url}
                controlsList={bloqueado ? "nodownload" : undefined}
                className="max-h-96 w-full bg-black"
              />
            ) : a.url && ehImagem(a.nome) ? (
              <AbrirArquivo url={a.url} nome={a.nome} urlBaixar={a.urlBaixar} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.nome} loading="lazy" className="max-h-72 w-full bg-black object-contain" />
              </AbrirArquivo>
            ) : null}
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <span className="min-w-0 truncate text-fg" title={a.nome}>{a.nome}</span>
              <span className="flex shrink-0 items-center gap-3 text-muted">
                {tamanhoLegivel(a.tamanho)}
                {abre && a.url && (
                  <AbrirArquivo url={a.url} nome={a.nome} urlBaixar={a.urlBaixar} className="font-semibold text-accent-strong hover:underline">
                    Abrir
                  </AbrirArquivo>
                )}
                {a.urlBaixar ? (
                  <a href={a.urlBaixar} className="font-semibold text-accent-strong hover:underline">
                    Baixar
                  </a>
                ) : bloqueado ? (
                  <span className="text-slate-400" title="O download volta depois da aprovação">Download indisponível</span>
                ) : null}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function titulo(e: Evento) {
  switch (e.tipo) {
    case "criado": return "Pedido criado";
    case "entrega": return `Versão ${e.versao ?? ""} entregue para avaliação`;
    case "correcao": return "Correção solicitada";
    case "aprovacao": return "Vídeo aprovado";
    case "duvida": return "Pergunta";
    case "resposta": return "Resposta";
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
  duvida: "border-l-amber-500",
  resposta: "border-l-emerald-500",
};

const COR_NO: Record<Evento["tipo"], string> = {
  criado: "bg-slate-500",
  comentario: "bg-slate-400",
  status: "bg-blue-500",
  entrega: "bg-amber-500",
  correcao: "bg-orange-500",
  aprovacao: "bg-emerald-500",
  duvida: "bg-amber-500",
  resposta: "bg-emerald-500",
};

const ICONE_NO: Partial<Record<Evento["tipo"], string>> = {
  criado: "M12 5v14M5 12h14",
  comentario: "M4 5h16v11H9l-5 4V5z",
  status: "M5 12h14M13 6l6 6-6 6",
  entrega: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  correcao: "M4 20h4L19 9l-4-4L4 16v4z",
  aprovacao: "M5 12.5l4.5 4.5L19 7.5",
  resposta: "M9 14L4 9l5-5M4 9h10a6 6 0 016 6v3",
};

/** Círculo de um evento na linha do tempo: ícone do tipo (ou "?" na pergunta). */
function NoDoEvento({ tipo, cor }: { tipo: Evento["tipo"]; cor: string }) {
  const caminho = ICONE_NO[tipo];
  return (
    <span
      aria-hidden
      className={`absolute left-0 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full text-white ring-4 ring-page-2 ${cor}`}
    >
      {caminho ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={caminho} />
        </svg>
      ) : (
        <span className="text-base font-bold leading-none">?</span>
      )}
    </span>
  );
}

export default function DetalhePedido({
  pedido,
  eventos,
  arquivos,
  comTitulo = true,
  quem,
  visao = "etm",
}: {
  comTitulo?: boolean;
  /** Quem está olhando a página (muda o texto de alguns status). */
  visao?: Visao;
  /** Quem está olhando a página: define quais mensagens ele pode editar ou excluir. */
  quem?: { id: string; admin: boolean };
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

  const abertas = new Set(perguntasAbertas(eventos).map((e) => e.id));

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8">
        {comTitulo && <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{pedido.titulo}</h1>}
        <p className={`${comTitulo ? "mt-2 " : ""}text-sm text-muted`}>{dicaStatus(pedido.status, visao)}</p>

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
        <ol>
          {[...eventos].reverse().map((e, idx, lista) => {
            const perm = permissoesMensagem(e, quem);
            return (
            <li key={e.id} className="relative pb-6 pl-14 last:pb-0">
              {/* o traço desce do círculo deste evento até o do próximo: a linha do tempo fica contínua */}
              {idx < lista.length - 1 && <span aria-hidden className="absolute bottom-0 left-[17px] top-9 w-0.5 bg-slate-300" />}
              <NoDoEvento
                tipo={e.tipo}
                cor={e.tipo === "duvida" ? (abertas.has(e.id) ? "bg-amber-500" : "bg-emerald-500") : COR_NO[e.tipo]}
              />
              <div
                className={`card border-l-4 p-5 ${e.tipo === "duvida" && !abertas.has(e.id) ? "border-l-emerald-500" : COR_BORDA[e.tipo]} ${abertas.has(e.id) ? "bg-amber-50" : ""}`}
              >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-fg">
                  {titulo(e)}
                  {abertas.has(e.id) && (
                    <span className="ml-2 rounded-full bg-amber-500 px-2.5 py-0.5 align-middle text-[11px] font-bold text-white">Aguardando resposta</span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {e.autor_nome} · {dataHora(e.criado_em)}
                  {e.editado_em ? " · editada" : ""}
                </p>
              </div>
              {perm.editar || perm.excluir ? (
                <MensagemEditavel
                  eventoId={e.id}
                  tipo={e.tipo}
                  texto={e.texto}
                  podeEditar={perm.editar}
                  podeExcluir={perm.excluir}
                  temArquivos={arquivos.some((a) => a.evento_id === e.id)}
                />
              ) : (
                e.texto && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">{e.texto}</p>
              )}
              {e.link && <LinkOuPlayer link={e.link} titulo={titulo(e)} />}
              <Arquivos itens={arquivos.filter((a) => a.evento_id === e.id)} />
              </div>
            </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
