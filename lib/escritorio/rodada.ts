// Só no servidor: usa a chave service role. Importar apenas em rotas de API.
import { createClient } from "@supabase/supabase-js";
import { FONTE, visitar, type Leitura, type Produto } from "./fonte";
import { LIMITE_ALERTA, dinheiro, type Evento, type EventoGravado, type OfertaAtual, type Rodada } from "./eventos";
import { normalizarConfig, type Config } from "@/components/escritorio/planta";

export const DURACOES = [1, 7, 30] as const;
export const MAX_DIAS_GRATIS = 7;

/** Banco do escritório (projeto Supabase próprio). */
export function bancoEscritorio() {
  const url = process.env.ESCRITORIO_SUPABASE_URL;
  const key = process.env.ESCRITORIO_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type Banco = NonNullable<ReturnType<typeof bancoEscritorio>>;

export type Funcionario = { id: string; papel: "pesquisador" | "analista" | "comprador"; nome: string };
export type Contrato = { id: string; funcionario_id: string; produto_id: string; inicio: string; fim: string };
export type Escritorio = { id: string; nome: string; plano: "gratis" | "pago"; config: Config };

/** Usuário logado, pelo token "Authorization: Bearer ..." enviado pelo navegador. */
export async function usuarioDe(db: Banco, request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user ?? null;
}

export async function escritorioDoUsuario(db: Banco, usuarioId: string) {
  const { data: bruto } = await db.from("escritorios").select("id, nome, plano, config").eq("dono", usuarioId).maybeSingle();
  if (!bruto) return null;
  const escritorio = { ...bruto, config: normalizarConfig(bruto.config) };
  const [{ data: funcionarios }, { data: contratos }] = await Promise.all([
    db.from("funcionarios").select("id, papel, nome").eq("escritorio_id", escritorio.id).order("criado_em"),
    db.from("contratos").select("id, funcionario_id, produto_id, inicio, fim").eq("escritorio_id", escritorio.id).order("inicio", { ascending: false }).limit(30),
  ]);
  return {
    escritorio: escritorio as Escritorio,
    funcionarios: (funcionarios ?? []) as Funcionario[],
    contratos: (contratos ?? []) as Contrato[],
  };
}

/** Produtos do catálogo (tabela "produtos"). */
export async function produtosPorIds(db: Banco, ids: string[]): Promise<Produto[]> {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return [];
  const { data, error } = await db.from("produtos").select("id, nome, categoria, marca, modelo, destaques, ofertas").in("id", unicos);
  if (error) throw new Error(error.message);
  return (data ?? []) as Produto[];
}

const ativos = (contratos: Contrato[], agora = Date.now()) => contratos.filter((c) => new Date(c.fim).getTime() > agora);

// ---------------------------------------------------------------------------
// Coleta: visita as lojas dos produtos pedidos. É compartilhada entre escritórios.
// ---------------------------------------------------------------------------
type Visita = { ok: true; leitura: Leitura } | { ok: false; loja: string; motivo: string; quando: string };

async function coletar(db: Banco, origem: "agendada" | "manual", produtoIds: string[]) {
  const produtos = await produtosPorIds(db, produtoIds);
  const { data: coleta, error } = await db.from("coletas").insert({ origem, fonte: FONTE.nome }).select().single();
  if (error || !coleta) throw new Error(error?.message ?? "Não consegui abrir a coleta.");

  const visitas = new Map<string, Visita[]>();
  await Promise.all(
    produtos.map(async (p) => {
      visitas.set(
        p.id,
        await Promise.all(
          p.ofertas.map(async (o): Promise<Visita> => {
            try {
              return { ok: true, leitura: await visitar(o) };
            } catch (e) {
              return { ok: false, loja: o.loja, motivo: e instanceof Error ? e.message : "erro", quando: new Date().toISOString() };
            }
          }),
        ),
      );
    }),
  );

  // melhor oferta disponível de cada produto
  const melhores = new Map<string, Leitura & { preco: number }>();
  for (const [id, lista] of visitas) {
    for (const v of lista) {
      if (!v.ok || !v.leitura.disponivel || v.leitura.preco === null) continue;
      const atual = melhores.get(id);
      if (!atual || v.leitura.preco < atual.preco) melhores.set(id, { ...v.leitura, preco: v.leitura.preco });
    }
  }

  const linhas = [...visitas.entries()].flatMap(([produto_id, lista]) =>
    lista.flatMap((v) => {
      if (!v.ok) return [];
      const m = melhores.get(produto_id);
      const l = v.leitura;
      return [{
        coleta_id: coleta.id,
        produto_id,
        loja: l.loja,
        vendedor: l.vendedor,
        preco: l.preco,
        disponivel: l.disponivel,
        melhor: !!m && m.url === l.url && m.vendedor === l.vendedor,
        url: l.url,
        imagem: l.imagem,
        coletado_em: l.coletadoEm,
      }];
    }),
  );
  if (linhas.length) {
    const { error: e } = await db.from("precos").insert(linhas);
    if (e) throw new Error(e.message);
  }
  await db.from("coletas").update({ concluida_em: new Date().toISOString() }).eq("id", coleta.id);
  return { coletaId: coleta.id as string, visitas, melhores, nomes: new Map(produtos.map((p) => [p.id, p.nome])) };
}

/** Ids das coletas que já entraram em rodadas deste escritório (o "arquivo" dele). */
async function coletasDoEscritorio(db: Banco, escritorioId: string, exceto?: string) {
  let q = db.from("rodadas").select("coleta_id").eq("escritorio_id", escritorioId).not("coleta_id", "is", null);
  if (exceto) q = q.neq("coleta_id", exceto);
  const { data } = await q.order("iniciada_em", { ascending: false }).limit(800);
  return [...new Set((data ?? []).map((r) => r.coleta_id as string))];
}

/** Histórico do melhor preço que ESTE escritório já registrou (mais recente primeiro). */
async function historicoDoEscritorio(db: Banco, escritorioId: string, produtos: string[], exceto?: string) {
  const historico = new Map<string, number[]>();
  const coletas = await coletasDoEscritorio(db, escritorioId, exceto);
  if (!coletas.length || !produtos.length) return historico;
  const { data, error } = await db
    .from("precos")
    .select("produto_id, preco")
    .eq("melhor", true)
    .in("coleta_id", coletas)
    .in("produto_id", produtos)
    .order("coletado_em", { ascending: false })
    .limit(3000);
  if (error) throw new Error(error.message);
  for (const r of data ?? []) historico.set(r.produto_id, [...(historico.get(r.produto_id) ?? []), Number(r.preco)]);
  return historico;
}

type ResultadoColeta = Awaited<ReturnType<typeof coletar>>;

// ---------------------------------------------------------------------------
// Rodada de um escritório: transforma a coleta em eventos do diário daquele escritório.
// ---------------------------------------------------------------------------
async function registrarRodada(
  db: Banco,
  escritorioId: string,
  origem: "agendada" | "manual",
  contratos: Contrato[],
  funcionarios: Funcionario[],
  coleta: ResultadoColeta,
  inicio: number,
) {
  const { data: rodada, error } = await db
    .from("rodadas")
    .insert({ escritorio_id: escritorioId, coleta_id: coleta.coletaId, origem, iniciada_em: new Date(inicio).toISOString() })
    .select()
    .single();
  if (error || !rodada) throw new Error(error?.message ?? "Não consegui abrir a rodada.");

  const analista = funcionarios.find((f) => f.papel === "analista")?.id ?? null;
  const comprador = funcionarios.find((f) => f.papel === "comprador")?.id ?? null;
  const eventos: (EventoGravado & { funcionario_id: string | null })[] = [];
  const registrar = (e: Evento, funcionario: string | null, quando = new Date().toISOString()) =>
    eventos.push({ ...e, ordem: eventos.length, criado_em: quando, funcionario_id: funcionario } as EventoGravado & { funcionario_id: string | null });

  // 1. cada pesquisador relata o seu produto
  const produtos = contratos.map((c) => c.produto_id);
  const totalOfertas = contratos.reduce((n, c) => n + (coleta.visitas.get(c.produto_id)?.length ?? 0), 0);
  registrar(
    { tipo: "rodada_iniciada", agente: "pesquisador", dados: { origem, produtos: produtos.length, ofertas: totalOfertas } },
    contratos[0]?.funcionario_id ?? null,
    new Date(inicio).toISOString(),
  );
  let achados = 0;
  for (const c of contratos) {
    for (const v of coleta.visitas.get(c.produto_id) ?? []) {
      if (!v.ok) {
        registrar({ tipo: "loja_falhou", agente: "pesquisador", produto_id: c.produto_id, dados: { loja: v.loja, motivo: v.motivo } }, c.funcionario_id, v.quando);
        continue;
      }
      const l = v.leitura;
      const base = { loja: l.loja, vendedor: l.vendedor, url: l.url };
      if (l.disponivel && l.preco !== null) {
        achados++;
        registrar({ tipo: "preco_coletado", agente: "pesquisador", produto_id: c.produto_id, dados: { ...base, preco: l.preco } }, c.funcionario_id, l.coletadoEm);
      } else {
        registrar({ tipo: "sem_estoque", agente: "pesquisador", produto_id: c.produto_id, dados: { ...base, preco: l.preco } }, c.funcionario_id, l.coletadoEm);
      }
    }
  }
  const comPreco = produtos.filter((id) => coleta.melhores.has(id)).length;
  registrar({ tipo: "entregou", agente: "pesquisador", dados: { precos: achados, produtos: comPreco } }, contratos[0]?.funcionario_id ?? null);

  // 2. analista: consulta o arquivo DESTE escritório (só coletas que ele mesmo fez)
  const historico = await historicoDoEscritorio(db, escritorioId, produtos, coleta.coletaId);
  const avisos: string[] = [];
  for (const id of produtos) {
    const m = coleta.melhores.get(id);
    const hist = historico.get(id);
    if (!m) registrar({ tipo: "sem_preco", agente: "analista", produto_id: id, dados: {} }, analista);
    else if (!hist?.length) registrar({ tipo: "sem_historico", agente: "analista", produto_id: id, dados: { preco: m.preco, loja: m.loja } }, analista);
    else registrar({ tipo: "historico_consultado", agente: "analista", produto_id: id, dados: { coletas: hist.length, anterior: hist[0] } }, analista);
  }
  for (const id of produtos) {
    const m = coleta.melhores.get(id);
    const anterior = historico.get(id)?.[0];
    if (!m || anterior === undefined) continue;
    const variacao = (m.preco - anterior) / anterior;
    registrar({ tipo: "comparou", agente: "analista", produto_id: id, dados: { preco: m.preco, anterior, variacao, loja: m.loja, vendedor: m.vendedor } }, analista);
    if (Math.abs(variacao) >= LIMITE_ALERTA) {
      const v = Math.abs(variacao * 100).toFixed(1).replace(".", ",");
      avisos.push(`${coleta.nomes.get(id) ?? id} ${variacao < 0 ? "caiu" : "subiu"} ${v}%: de ${dinheiro(anterior)} para ${dinheiro(m.preco)} (${m.loja}).`);
    }
  }

  // 3. comprador
  if (avisos.length) registrar({ tipo: "aviso_afixado", agente: "comprador", dados: { avisos } }, comprador);
  else registrar({ tipo: "nada_a_avisar", agente: "comprador", dados: {} }, comprador);
  registrar({ tipo: "rodada_concluida", agente: "comprador", dados: { duracao_ms: Date.now() - inicio } }, comprador);

  const { error: e2 } = await db.from("eventos").insert(
    eventos.map((e) => ({
      rodada_id: rodada.id,
      ordem: e.ordem,
      criado_em: e.criado_em,
      agente: e.agente,
      funcionario_id: e.funcionario_id,
      tipo: e.tipo,
      produto_id: "produto_id" in e ? e.produto_id : null,
      dados: e.dados,
    })),
  );
  if (e2) throw new Error(e2.message);
  await db.from("rodadas").update({ concluida_em: new Date().toISOString() }).eq("id", rodada.id);
}

/** Rodada pedida pelo dono do escritório (ou logo depois de assinar um contrato). */
export async function executarManual(db: Banco, usuarioId: string) {
  const dados = await escritorioDoUsuario(db, usuarioId);
  if (!dados) throw new Error("Escritório não encontrado.");
  const contratos = ativos(dados.contratos);
  if (!contratos.length) throw new Error("Nenhum pesquisador tem contrato em andamento.");
  const inicio = Date.now();
  const coleta = await coletar(db, "manual", [...new Set(contratos.map((c) => c.produto_id))]);
  await registrarRodada(db, dados.escritorio.id, "manual", contratos, dados.funcionarios, coleta, inicio);
}

/** Coleta automática: uma visita por produto contratado, e uma rodada para cada escritório com contrato. */
export async function executarAgendada(db: Banco) {
  const inicio = Date.now();
  const { data: contratos, error } = await db
    .from("contratos")
    .select("id, escritorio_id, funcionario_id, produto_id, inicio, fim")
    .gt("fim", new Date().toISOString());
  if (error) throw new Error(error.message);
  if (!contratos?.length) return { escritorios: 0, produtos: 0 };

  const produtos = [...new Set(contratos.map((c) => c.produto_id))];
  const coleta = await coletar(db, "agendada", produtos);

  const porEscritorio = new Map<string, Contrato[]>();
  for (const c of contratos) porEscritorio.set(c.escritorio_id, [...(porEscritorio.get(c.escritorio_id) ?? []), c as Contrato]);
  const { data: funcionarios } = await db.from("funcionarios").select("id, papel, nome, escritorio_id").in("escritorio_id", [...porEscritorio.keys()]);
  for (const [escritorioId, lista] of porEscritorio) {
    const equipe = ((funcionarios ?? []) as (Funcionario & { escritorio_id: string })[]).filter((f) => f.escritorio_id === escritorioId);
    try {
      await registrarRodada(db, escritorioId, "agendada", lista, equipe, coleta, inicio);
    } catch (e) {
      console.error("escritorio: rodada agendada falhou para", escritorioId, e);
    }
  }
  return { escritorios: porEscritorio.size, produtos: produtos.length };
}

// ---------------------------------------------------------------------------
// Leitura para a tela
// ---------------------------------------------------------------------------
/**
 * Histórico do melhor preço e últimas ofertas de cada produto.
 * Com escritório: SÓ o que aquele escritório pesquisou. Sem conta: a base geral (vitrine para o visitante).
 */
async function precosPara(db: Banco, coletas: string[] | null) {
  const historico: Record<string, { t: string; preco: number; loja: string }[]> = {};
  const ofertas: OfertaAtual[] = [];
  if (coletas && !coletas.length) return { historico, ofertas };
  let qMelhores = db.from("precos").select("produto_id, preco, loja, coletado_em").eq("melhor", true);
  let qRecentes = db.from("precos").select("produto_id, coleta_id, loja, vendedor, preco, disponivel, url, imagem, coletado_em");
  if (coletas) {
    qMelhores = qMelhores.in("coleta_id", coletas);
    qRecentes = qRecentes.in("coleta_id", coletas);
  }
  const [{ data: melhores }, { data: recentes }] = await Promise.all([
    qMelhores.order("coletado_em", { ascending: false }).limit(4000),
    qRecentes.order("coletado_em", { ascending: false }).limit(300),
  ]);
  for (const r of (melhores ?? []).reverse()) (historico[r.produto_id] ??= []).push({ t: r.coletado_em, preco: Number(r.preco), loja: r.loja });
  // ofertas da coleta mais recente de cada produto
  const ultimaColeta = new Map<string, string>();
  for (const r of recentes ?? []) {
    if (!ultimaColeta.has(r.produto_id)) ultimaColeta.set(r.produto_id, r.coleta_id);
    if (ultimaColeta.get(r.produto_id) !== r.coleta_id) continue;
    ofertas.push({ ...r, preco: r.preco === null ? null : Number(r.preco) } as OfertaAtual);
  }
  return { historico, ofertas };
}

export async function lerEstado(db: Banco, usuarioId: string | null) {
  const dados = usuarioId ? await escritorioDoUsuario(db, usuarioId) : null;
  if (!dados) {
    const base = await precosPara(db, null);
    const catalogo = await produtosPorIds(db, Object.keys(base.historico));
    return { ...base, catalogo, escritorio: null, funcionarios: [], contratos: [], rodada: null, eventos: [] };
  }

  const { historico, ofertas } = await precosPara(db, await coletasDoEscritorio(db, dados.escritorio.id));
  const catalogo = await produtosPorIds(db, [...dados.contratos.map((c) => c.produto_id), ...Object.keys(historico)]);
  const { data: rodada } = await db
    .from("rodadas")
    .select("id, origem, iniciada_em, concluida_em")
    .eq("escritorio_id", dados.escritorio.id)
    .not("concluida_em", "is", null)
    .order("iniciada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  let eventos: EventoGravado[] = [];
  if (rodada) {
    const { data } = await db.from("eventos").select("ordem, criado_em, agente, funcionario_id, tipo, produto_id, dados").eq("rodada_id", rodada.id).order("ordem");
    eventos = (data ?? []) as EventoGravado[];
  }
  return {
    historico,
    ofertas,
    catalogo,
    ...dados,
    rodada: rodada ? ({ ...rodada, fonte: FONTE.nome, simulada: false } as Rodada) : null,
    eventos,
  };
}
