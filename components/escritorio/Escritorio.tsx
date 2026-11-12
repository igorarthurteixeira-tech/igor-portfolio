"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Produto } from "@/lib/escritorio/fonte";
import { descrever, proximaColeta, type EventoGravado, type OfertaAtual, type Rodada } from "@/lib/escritorio/eventos";
import { clienteEscritorio } from "@/lib/escritorio/cliente";
import type { RespostaBusca, ResultadoBusca } from "@/lib/escritorio/busca";
import Escritorio3D, { type Colocando } from "./Escritorio3D";
import { BuscaProdutos } from "./Busca";
import { CartaoNovo, CartaoProduto, FichaProduto, GraficoPreco, Painel } from "./Paineis";
import { EquipePesquisa, restante, type Contrato } from "./Contrato";
import Conta from "./Conta";
import Personalizar from "./Personalizar";
import {
  PORTA,
  VELOCIDADE,
  assentoDe,
  criarNav,
  inicialDe,
  ladoDoAnalista,
  lugarNasLojas,
  pontoArquivo,
  pontoCafe,
  pontoQuadro,
  montarLayout,
  normalizarConfig,
  type Config,
  type Id,
  type Layout,
  type Nav,
  type Papel,
  type Pos,
  type Vis,
} from "./planta";

type Ponto = { t: string; preco: number; loja: string };
type Funcionario = { id: string; papel: Papel; nome: string };
type Estado = {
  rodada: Rodada | null;
  eventos: EventoGravado[];
  ofertas: OfertaAtual[];
  historico: Record<string, Ponto[]>;
  catalogo: Produto[];
  escritorio: { id: string; nome: string; plano: "gratis" | "pago"; config: Config } | null;
  funcionarios: Funcionario[];
  contratos: Contrato[];
};
type Sessao = { token: string; email: string } | null;

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hora = (iso: string | Date) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const horaSeg = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR");
const avisosDe = (eventos: EventoGravado[]) => {
  const e = eventos.find((x) => x.tipo === "aviso_afixado");
  return e && e.tipo === "aviso_afixado" ? e.dados.avisos : [];
};
const LAYOUT_DEMO = montarLayout([]);

export default function Escritorio() {
  const [sessao, setSessao] = useState<Sessao>(null);
  const [abrirConta, setAbrirConta] = useState<null | "criar" | "entrar">(null);
  const [personalizando, setPersonalizando] = useState(false);
  const [previa, setPrevia] = useState<Config | null>(null);
  const [editando, setEditando] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [msgEdicao, setMsgEdicao] = useState("");
  const [colocando, setColocando] = useState<Colocando>(null);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [agora, setAgora] = useState(() => Date.now());
  const [estado, setEstado] = useState<Estado | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [tocando, setTocando] = useState(-1); // índice do evento sendo mostrado (-1 = nenhum)
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [proxima, setProxima] = useState<Date | null>(null);
  const [vis, setVis] = useState<Record<Id, Vis>>(() => inicialDe(LAYOUT_DEMO));
  const [falas, setFalas] = useState<Record<Id, string | null>>({});
  const [foco, setFoco] = useState<string>("");
  const [abrirEquipe, setAbrirEquipe] = useState(false);
  // produtos escolhidos na busca nesta visita (antes de virem do servidor junto com o estado)
  const [extras, setExtras] = useState<Produto[]>([]);
  const [escolhido, setEscolhido] = useState<{ chave: string; produto: Produto } | null>(null);
  const catalogo = useMemo(() => {
    const doServidor = estado?.catalogo ?? [];
    return [...doServidor, ...extras.filter((x) => !doServidor.some((p) => p.id === x.id))];
  }, [estado?.catalogo, extras]);
  const nomeNaTela = (id: string) => catalogo.find((p) => p.id === id)?.nome ?? "Produto";

  const sessaoRef = useRef<Sessao>(null);
  const rodando = useRef(false);
  const vivo = useRef(true);
  const pos = useRef<Record<Id, Vis>>(inicialDe(LAYOUT_DEMO));
  const ficha = useRef<Record<Id, number>>({});
  const rodadaAtual = useRef<string | null>(null);
  const proximaRef = useRef<Date | null>(null);
  const layoutRef = useRef<Layout>(LAYOUT_DEMO);
  const navRef = useRef<Nav>(criarNav({ layout: LAYOUT_DEMO, itens: [] }));
  const assentosRef = useRef<Record<Id, string>>({});
  const livresRef = useRef<Set<Id>>(new Set());
  const voltarTelaCheia = useRef(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  /** Nomes dos produtos para as falas da encenação (que roda fora do ciclo de renderização). */
  const nomesRef = useRef<Map<string, string>>(new Map());
  const nomeGuardado = (id: string) => nomesRef.current.get(id) ?? "Produto";

  // ---------- equipe e planta ----------
  const logado = !!sessao && !!estado?.escritorio;
  const funcionarios = useMemo(() => (logado ? (estado?.funcionarios ?? []) : []), [logado, estado?.funcionarios]);
  const configSalva = useMemo(() => normalizarConfig(estado?.escritorio?.config), [estado?.escritorio?.config]);
  const config = previa ?? configSalva;
  const layout = useMemo(
    () =>
      funcionarios.length
        ? montarLayout(
            funcionarios.map((f) => ({ chave: f.id, papel: f.papel, nome: f.nome })),
            config.mesas,
            config.ampliacao,
            config.ampliacaoLateral,
            config.estacoes,
          )
        : LAYOUT_DEMO,
    [funcionarios, config.mesas, config.ampliacao, config.ampliacaoLateral, config.estacoes],
  );
  const nav = useMemo(() => criarNav({ layout, itens: config.itens }), [layout, config.itens]);
  const pesquisadores = layout.agentes.filter((a) => a.papel === "pesquisador");
  const contratosAtivos = (estado?.contratos ?? []).filter((c) => logado && new Date(c.fim).getTime() > agora);
  const contratoDe = (id: Id) => contratosAtivos.find((c) => c.funcionario_id === id) ?? null;

  useEffect(() => {
    layoutRef.current = layout;
    navRef.current = nav;
    livresRef.current = new Set(logado ? pesquisadores.filter((p) => !contratoDe(p.chave)).map((p) => p.chave) : []);
  });

  // quando uma mesa muda de lugar, o dono dela vai andando até lá (se estiver parado na mesa antiga)
  useEffect(() => {
    const antes = assentosRef.current;
    const agoraAssentos: Record<Id, string> = {};
    for (const a of layout.agentes) {
      const s = assentoDe(layout.mesas[a.chave]);
      agoraAssentos[a.chave] = `${s.x},${s.y}`;
      const velho = antes[a.chave];
      if (velho && velho !== agoraAssentos[a.chave] && !rodando.current) {
        const [vx, vy] = velho.split(",").map(Number);
        const p = pos.current[a.chave];
        if (p && !p.andando && Math.hypot(p.x - vx, p.y - vy) < 2) void ir(a.chave, s);
      }
    }
    assentosRef.current = agoraAssentos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // posição atual de cada pessoa (quem acabou de chegar começa na própria mesa)
  const mesaDe = (id: Id): Pos => {
    const m = layoutRef.current.mesas[id];
    return m ? assentoDe(m) : { x: 400, y: 388 };
  };
  const posDe = (id: Id): Vis => {
    if (!pos.current[id]) pos.current[id] = { ...mesaDe(id), andando: false, dur: 0 };
    return pos.current[id];
  };
  const visEfetivo = useMemo(() => ({ ...inicialDe(layout), ...vis }), [layout, vis]);

  // ---------- movimento ----------
  function falar(id: Id, texto: string | null) {
    setFalas((f) => ({ ...f, [id]: texto }));
  }
  const calar = () => setFalas({});
  const em = (id: Id, p: Pos) => Math.hypot(posDe(id).x - p.x, posDe(id).y - p.y) < 2;

  /** Anda até o destino desviando dos móveis. Devolve false se outra ordem tomou o lugar desta. */
  async function ir(id: Id, destino: Pos): Promise<boolean> {
    const minha = (ficha.current[id] = (ficha.current[id] ?? 0) + 1);
    const pontos = navRef.current.caminho(posDe(id), destino) ?? [destino];
    for (const alvo of pontos) {
      const atual = posDe(id);
      const dist = Math.hypot(alvo.x - atual.x, alvo.y - atual.y);
      if (dist < 1) continue;
      const dur = Math.round(dist / VELOCIDADE);
      const novo: Vis = { x: alvo.x, y: alvo.y, andando: true, dur };
      pos.current[id] = novo;
      setVis((v) => ({ ...v, [id]: novo }));
      await espera(dur);
      if (!vivo.current || ficha.current[id] !== minha) return false;
    }
    const parado: Vis = { x: destino.x, y: destino.y, andando: false, dur: 0 };
    pos.current[id] = parado;
    setVis((v) => ({ ...v, [id]: parado }));
    return true;
  }

  // ---------- tocar os eventos de uma rodada ----------
  async function tocar(eventos: EventoGravado[]) {
    if (rodando.current) return;
    rodando.current = true;
    setOcupado(true);
    setAvisos([]);
    calar();
    const L = layoutRef.current;
    const analista = L.agentes.find((a) => a.papel === "analista")!.chave;
    const comprador = L.agentes.find((a) => a.papel === "comprador")!.chave;
    const primeiroPesq = L.agentes.find((a) => a.papel === "pesquisador")!.chave;
    const pesq = (e: EventoGravado) => (e.funcionario_id && L.mesas[e.funcionario_id] ? e.funcionario_id : primeiroPesq);
    // pesquisadores que trabalharam nesta rodada
    const equipe = [...new Set(eventos.filter((e) => ["preco_coletado", "sem_estoque", "loja_falhou"].includes(e.tipo)).map(pesq))];
    if (!equipe.length) equipe.push(primeiroPesq);

    await Promise.all(L.agentes.map((a) => ir(a.chave, assentoDe(L.mesas[a.chave]))));
    try {
      for (let i = 0; i < eventos.length; i++) {
        if (!vivo.current) return;
        const e = eventos[i];
        setTocando(i);
        const texto = descrever(e, nomeGuardado);
        switch (e.tipo) {
          case "rodada_iniciada":
            falar(equipe[0], texto);
            await espera(1600);
            equipe.forEach((p) => falar(p, "Indo às lojas."));
            await Promise.all(equipe.map((p, j) => ir(p, lugarNasLojas(L, j))));
            calar();
            break;
          case "preco_coletado":
          case "sem_estoque":
          case "loja_falhou":
            falar(pesq(e), texto);
            await espera(1600);
            falar(pesq(e), null);
            break;
          case "entregou": {
            const [quemEntrega, ...outros] = equipe;
            outros.forEach((p) => void ir(p, mesaDe(p)));
            if (e.dados.precos > 0) {
              await ir(quemEntrega, ladoDoAnalista(L));
              falar(quemEntrega, texto);
              falar(analista, "Recebi!");
              await espera(1500);
              falar(analista, null);
            } else {
              falar(quemEntrega, texto);
              await espera(1500);
            }
            falar(quemEntrega, null);
            void ir(quemEntrega, mesaDe(quemEntrega));
            break;
          }
          case "historico_consultado":
            if (!em(analista, pontoArquivo(L))) {
              falar(analista, "Vou buscar o histórico no arquivo.");
              await ir(analista, pontoArquivo(L));
            }
            falar(analista, texto);
            await espera(1400);
            break;
          case "sem_historico":
          case "sem_preco":
            falar(analista, texto);
            await espera(1400);
            break;
          case "comparou":
            if (!em(analista, mesaDe(analista))) {
              falar(analista, "Voltando para comparar.");
              await ir(analista, mesaDe(analista));
            }
            falar(analista, texto);
            await espera(1300);
            break;
          case "aviso_afixado":
            if (!em(analista, mesaDe(analista))) void ir(analista, mesaDe(analista));
            falar(analista, null);
            falar(comprador, "Tem mudança. Vou afixar no quadro.");
            await ir(comprador, pontoQuadro(L));
            setAvisos(e.dados.avisos);
            falar(comprador, texto);
            await espera(1800);
            falar(comprador, null);
            await ir(comprador, mesaDe(comprador));
            break;
          case "nada_a_avisar":
            if (!em(analista, mesaDe(analista))) void ir(analista, mesaDe(analista));
            falar(analista, null);
            falar(comprador, texto);
            await espera(2000);
            break;
          case "rodada_concluida":
            falar(comprador, texto);
            await espera(1600);
            break;
        }
      }
    } finally {
      calar();
      setTocando(-1);
      setAvisos(avisosDe(eventos));
      rodando.current = false;
      setOcupado(false);
    }
  }

  // ---------- dados do servidor ----------
  /** Chamada às rotas do escritório, levando o token de login quando houver. */
  function api(caminho: string, init: RequestInit = {}) {
    const t = sessaoRef.current?.token;
    return fetch(caminho, {
      ...init,
      cache: "no-store",
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    });
  }

  async function chamar(caminho: string, init: RequestInit, falha: string): Promise<Estado | null> {
    try {
      const r = await api(caminho, init);
      const dados = (await r.json()) as Estado & { erro?: string };
      if (!r.ok) throw new Error(dados.erro ?? falha);
      for (const p of dados.catalogo ?? []) nomesRef.current.set(p.id, p.nome);
      return dados;
    } catch (e) {
      setErro(e instanceof Error ? e.message : falha);
      return null;
    }
  }

  /** Busca o estado; se houver rodada nova desde a última vista, toca ela. */
  async function atualizar(tocarSeNova: boolean) {
    const dados = await chamar("/api/escritorio/rodada", {}, "Não consegui abrir o escritório.");
    if (!dados || !vivo.current) return;
    const nova = dados.rodada && dados.rodada.id !== rodadaAtual.current;
    const conhecida = rodadaAtual.current !== null;
    rodadaAtual.current = dados.rodada?.id ?? null;
    setEstado(dados);
    if (nova && conhecida && tocarSeNova) await tocar(dados.eventos);
    else if (!rodando.current) setAvisos(avisosDe(dados.eventos));
  }

  useEffect(() => {
    vivo.current = true;
    // login: carrega a sessão salva e acompanha entradas e saídas
    const sb = clienteEscritorio();
    const aplicarSessao = (s: { access_token: string; user: { email?: string } } | null) => {
      const nova: Sessao = s ? { token: s.access_token, email: s.user.email ?? "" } : null;
      const mudouUsuario = (sessaoRef.current?.email ?? null) !== (nova?.email ?? null);
      sessaoRef.current = nova;
      setSessao(nova);
      if (mudouUsuario) {
        rodadaAtual.current = null;
        void atualizar(false);
      }
    };
    const assinatura = sb?.auth.onAuthStateChange((_ev, s) => aplicarSessao(s));
    Promise.resolve().then(async () => {
      if (!vivo.current) return;
      const p = proximaColeta();
      proximaRef.current = p;
      setProxima(p);
      const s = sb ? (await sb.auth.getSession()).data.session : null;
      sessaoRef.current = s ? { token: s.access_token, email: s.user.email ?? "" } : null;
      setSessao(sessaoRef.current);
      void atualizar(false);
    });
    const tique = setInterval(() => setAgora(Date.now()), 30_000);
    // ao voltar para a aba, confere se o agendador rodou enquanto estava fora
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void atualizar(true);
    };
    document.addEventListener("visibilitychange", aoVoltar);
    // quando passar o horário da coleta automática, confere uma vez
    const relogio = setInterval(() => {
      const p = proximaRef.current;
      if (!p || Date.now() < p.getTime() + 45_000) return;
      const nova = proximaColeta();
      proximaRef.current = nova;
      setProxima(nova);
      void atualizar(true);
    }, 15_000);
    return () => {
      vivo.current = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      clearInterval(relogio);
      clearInterval(tique);
      assinatura?.data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- tempo livre: só acontece entre rodadas ----------
  useEffect(() => {
    const t = setInterval(async () => {
      if (rodando.current || !vivo.current || Math.random() > 0.7) return;
      const agentes = layoutRef.current.agentes;
      const id = agentes[Math.floor(Math.random() * agentes.length)].chave;
      if (posDe(id).andando || !em(id, mesaDe(id))) return;
      const quando = proximaRef.current ? hora(proximaRef.current) : "";
      if (livresRef.current.has(id)) {
        // sem contrato o pesquisador não tem o que pesquisar: diz isso, de verdade
        falar(id, "Estou sem contrato. Me dê um produto para pesquisar.");
        await espera(4000);
        if (!rodando.current) falar(id, null);
        return;
      }
      if (Math.random() < 0.5) {
        falar(id, quando ? `Esperando a coleta das ${quando}.` : "Esperando a próxima coleta.");
        await espera(3500);
        if (!rodando.current) falar(id, null);
        return;
      }
      if (!(await ir(id, pontoCafe(layoutRef.current)))) return;
      falar(id, quando ? `Intervalo até as ${quando}.` : "Intervalo.");
      await espera(3000);
      if (rodando.current || !vivo.current) return;
      falar(id, null);
      await ir(id, mesaDe(id));
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- ações do dono do escritório ----------
  async function assinar(funcionarioId: string, produtoId: string, dias: number) {
    if (rodando.current) return;
    setErro("");
    setAviso("");
    setOcupado(true);
    const dados = await chamar(
      "/api/escritorio/contrato",
      { method: "POST", body: JSON.stringify({ funcionario_id: funcionarioId, produto_id: produtoId, dias }) },
      "Não consegui assinar o contrato.",
    );
    setOcupado(false);
    if (!dados) return;
    rodadaAtual.current = dados.rodada?.id ?? null;
    setEstado(dados);
    setFoco(produtoId);
    // a primeira visita às lojas já aconteceu no servidor: encena ela
    if (dados.eventos.length) await tocar(dados.eventos);
  }

  /** Busca nas lojas. Um pesquisador vai de verdade até a mesa das lojas enquanto a busca acontece. */
  async function buscarProdutos(termo: string): Promise<RespostaBusca | string> {
    const L = layoutRef.current;
    const pesqs = L.agentes.filter((a) => a.papel === "pesquisador");
    const quem = (pesqs.find((a) => livresRef.current.has(a.chave)) ?? pesqs[0])?.chave;
    const encenar = !!quem && !rodando.current;
    if (encenar) {
      falar(quem, `Pesquisando "${termo}" nas lojas...`);
      void ir(quem, lugarNasLojas(L, 0));
    }
    let resposta: RespostaBusca | string;
    try {
      const r = await api(`/api/escritorio/busca?q=${encodeURIComponent(termo)}`);
      const d = (await r.json()) as RespostaBusca & { erro?: string };
      resposta = r.ok ? d : (d.erro ?? "Não consegui pesquisar agora.");
    } catch {
      resposta = "Não consegui pesquisar agora.";
    }
    if (encenar) {
      falar(quem, typeof resposta === "string" ? "As lojas não responderam." : `Achei ${resposta.resultados.length} produtos à venda.`);
      void (async () => {
        await espera(3500);
        if (rodando.current || !vivo.current) return;
        falar(quem, null);
        await ir(quem, mesaDe(quem));
      })();
    }
    return resposta;
  }

  /** O servidor confere o produto nas lojas e coloca no catálogo; depois é só assinar o contrato. */
  async function escolherProduto(r: ResultadoBusca): Promise<string | null> {
    try {
      const resp = await api("/api/escritorio/produto", {
        method: "POST",
        body: JSON.stringify({
          ofertas: r.ofertas.map((o) => (o.tipo === "kabum" ? { tipo: o.tipo, codigo: o.codigo } : { tipo: o.tipo, base: o.base, ref: o.ref, id: o.id })),
        }),
      });
      const d = (await resp.json()) as { produto?: Produto; erro?: string };
      if (!resp.ok || !d.produto) return d.erro ?? "Não consegui escolher este produto.";
      const p = d.produto;
      nomesRef.current.set(p.id, p.nome);
      setExtras((x) => [...x.filter((y) => y.id !== p.id), p]);
      setEscolhido({ chave: r.chave, produto: p });
      return null;
    } catch {
      return "Não consegui escolher este produto.";
    }
  }

  async function contratar() {
    setErro("");
    setOcupado(true);
    const dados = await chamar("/api/escritorio/funcionario", { method: "POST" }, "Não consegui contratar.");
    setOcupado(false);
    if (!dados) return;
    // quem acabou de ser contratado entra pela porta e vai até a mesa nova
    const antes = new Set((estado?.funcionarios ?? []).map((f) => f.id));
    const novos = dados.funcionarios.filter((f) => !antes.has(f.id));
    for (const f of novos) {
      const naPorta: Vis = { ...PORTA, andando: false, dur: 0 };
      pos.current[f.id] = naPorta;
      setVis((v) => ({ ...v, [f.id]: naPorta }));
    }
    setEstado(dados);
    setAviso("Pesquisador contratado. Ele está chegando pela porta.");
    await espera(900); // a sala é remontada com a mesa nova
    await Promise.all(
      novos.map(async (f) => {
        falar(f.id, "Bom dia! Cheguei.");
        await ir(f.id, mesaDe(f.id));
        falar(f.id, "Qual produto eu vou pesquisar?");
        await espera(3500);
        falar(f.id, null);
      }),
    );
  }

  async function salvarPersonalizacao(nome: string, c: Config, nomes: Record<string, string>) {
    setErro("");
    let dados = await chamar("/api/escritorio/config", { method: "PATCH", body: JSON.stringify({ nome, config: c }) }, "Não consegui salvar.");
    if (!dados) return false;
    for (const f of estado?.funcionarios ?? []) {
      const novo = (nomes[f.id] ?? "").trim();
      if (novo && novo !== f.nome) {
        dados = (await chamar("/api/escritorio/funcionario", { method: "PATCH", body: JSON.stringify({ id: f.id, nome: novo }) }, "Não consegui renomear.")) ?? dados;
      }
    }
    setEstado(dados);
    setPrevia(null);
    return true;
  }

  async function sair() {
    await clienteEscritorio()?.auth.signOut();
  }

  async function rodarAgora() {
    if (rodando.current) return;
    setErro("");
    setAviso("");
    setOcupado(true);
    try {
      const r = await api("/api/escritorio/rodada", { method: "POST" });
      const dados = (await r.json()) as Estado & { erro?: string; repetida?: boolean };
      if (!r.ok) throw new Error(dados.erro ?? "A rodada falhou.");
      if (dados.repetida) setAviso("Houve uma rodada há menos de 2 minutos. Mostrando ela.");
      rodadaAtual.current = dados.rodada?.id ?? null;
      setEstado(dados);
      setOcupado(false);
      await tocar(dados.eventos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "A rodada falhou.");
      setOcupado(false);
    }
  }

  // ---------- tela cheia ----------
  const [telaCheia, setTelaCheia] = useState(false);
  const [podeTelaCheia, setPodeTelaCheia] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setPodeTelaCheia(!!document.fullscreenEnabled));
    const aoMudar = () => setTelaCheia(document.fullscreenElement === consoleRef.current);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);
  function alternarTelaCheia() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void consoleRef.current?.requestFullscreen().catch(() => setErro("O navegador não permitiu a tela cheia."));
  }
  /**
   * O Chrome sai da tela cheia quando mostra sugestões de preenchimento (e-mail/senha).
   * Para não parecer um defeito, a janela de conta sai da tela cheia antes e volta depois do login.
   */
  function abrirJanelaConta(modo: "criar" | "entrar") {
    if (document.fullscreenElement) {
      voltarTelaCheia.current = true;
      void document.exitFullscreen();
    }
    setAbrirConta(modo);
  }
  function fecharJanelaConta(ok: boolean) {
    setAbrirConta(null);
    if (ok && voltarTelaCheia.current) void consoleRef.current?.requestFullscreen().catch(() => {});
    voltarTelaCheia.current = false;
  }

  // ---------- o que mostrar ----------
  const eventos = estado?.eventos ?? [];
  const atual = tocando >= 0 ? eventos[tocando] : null;
  const nomeDe = (e: EventoGravado) =>
    (e.funcionario_id && funcionarios.find((f) => f.id === e.funcionario_id)?.nome) || `${e.agente[0].toUpperCase()}${e.agente.slice(1)}`;

  const etiquetas: Partial<Record<Id, string>> = {};
  if (logado) {
    for (const p of pesquisadores) {
      const c = contratoDe(p.chave);
      etiquetas[p.chave] = c ? `${catalogo.find((x) => x.id === c.produto_id)?.modelo ?? ""} · ${restante(c.fim, agora)}` : "livre";
    }
  }

  // Durante a encenação, um preço desta rodada só aparece depois que o pesquisador o "encontra".
  const inicioRodada = estado?.rodada ? new Date(estado.rodada.iniciada_em).getTime() : Infinity;
  const encontrados = new Set(
    eventos.filter((e, i) => e.tipo === "preco_coletado" && (tocando < 0 || i <= tocando)).map((e) => e.produto_id),
  );
  const historico: Record<string, Ponto[]> = {};
  for (const [id, pts] of Object.entries(estado?.historico ?? {})) {
    historico[id] = tocando < 0 || encontrados.has(id) ? pts : pts.filter((p) => new Date(p.t).getTime() < inicioRodada);
  }

  const emPesquisa =
    atual && (atual.tipo === "preco_coletado" || atual.tipo === "sem_estoque" || atual.tipo === "loja_falhou") ? atual.produto_id : null;
  // durante a encenação, a ficha só mostra as ofertas que o pesquisador já visitou
  const urlsVistas = new Set(
    eventos.slice(0, tocando + 1).flatMap((e) => (e.tipo === "preco_coletado" || e.tipo === "sem_estoque" ? [e.dados.url] : [])),
  );
  const ofertasVistas = (estado?.ofertas ?? []).filter((o) => o.produto_id === foco && urlsVistas.has(o.url));
  // produto sem nenhuma oferta disponível na última coleta (só depois que o pesquisador relatou)
  const semEstoque = new Set(
    catalogo
      .filter((p) => {
        const of = (estado?.ofertas ?? []).filter((o) => o.produto_id === p.id && (tocando < 0 || urlsVistas.has(o.url)));
        return of.length > 0 && of.every((o) => !o.disponivel);
      })
      .map((p) => p.id),
  );
  const situacao = atual
    ? `${nomeDe(atual)}: ${descrever(atual, nomeNaTela)}`
    : proxima
      ? `Entre rodadas · próxima coleta às ${hora(proxima)}`
      : "Entre rodadas";
  const plano = estado?.escritorio?.plano ?? "gratis";
  // produtos do escritório: os com contrato em andamento e, depois, os que já foram pesquisados
  const idsVisiveis = logado
    ? [...new Set([...contratosAtivos.map((c) => c.produto_id), ...Object.keys(estado?.historico ?? {})])]
    : Object.keys(estado?.historico ?? {});
  const produtosVisiveis = catalogo.filter((p) => idsVisiveis.includes(p.id)).sort((a, b) => idsVisiveis.indexOf(a.id) - idsVisiveis.indexOf(b.id));
  const focoVisivel = produtosVisiveis.some((p) => p.id === foco) ? foco : (produtosVisiveis[0]?.id ?? null);
  const livres = pesquisadores.filter((p) => !contratoDe(p.chave)).length;

  return (
    <div className="space-y-8">
      {/* ---------- console: escritório + painéis ---------- */}
      <div className="mx-auto max-w-400 px-3 sm:px-6">
        <div
          ref={consoleRef}
          className={`bg-brand p-3 shadow-xl ring-1 ring-white/10 sm:p-4 ${telaCheia ? "h-full overflow-y-auto" : "rounded-3xl"}`}
        >
          {/* janelas ficam dentro do console para continuarem visíveis em tela cheia */}
          {abrirConta && <Conta modoInicial={abrirConta} aoFechar={fecharJanelaConta} />}
          {personalizando && estado?.escritorio && (
            <Personalizar
              nomeInicial={estado.escritorio.nome}
              configSalva={configSalva}
              cfg={config}
              aoMudar={(c) => setPrevia(c)}
              layout={layout}
              funcionarios={funcionarios}
              corPadrao={(id) => layout.agentes.find((a) => a.chave === id)?.corPadrao ?? "#0f46e6"}
              plano={plano}
              selecionado={selecionado}
              aoSelecionar={setSelecionado}
              mensagem={msgEdicao}
              miniaturas={miniaturas}
              colocando={colocando}
              aoColocando={(c) => {
                setColocando(c);
                setMsgEdicao("");
              }}
              aoSalvar={salvarPersonalizacao}
              aoFechar={() => {
                setPersonalizando(false);
                setEditando(false);
                setColocando(null);
                setSelecionado(null);
                setPrevia(null);
              }}
            />
          )}

          <div className="mb-3 flex flex-wrap items-center gap-3 px-1">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${atual ? "animate-pulse bg-amber-300" : "bg-emerald-400"}`} aria-hidden />
            <p className="min-w-0 flex-1 truncate text-sm text-slate-200" aria-live="polite">
              {logado && !atual && <strong className="mr-2 text-white">{estado?.escritorio?.nome}</strong>}
              {logado && !atual && plano === "pago" && (
                <span className="mr-2 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">pago</span>
              )}
              {situacao}
            </p>
            {!logado ? (
              <>
                <button type="button" className="btn-primary px-5! py-2.5!" onClick={() => abrirJanelaConta("criar")}>
                  Criar meu escritório grátis
                </button>
                <button type="button" className="btn-ghost px-5! py-2.5!" onClick={() => abrirJanelaConta("entrar")}>
                  Entrar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary px-5! py-2.5!"
                  disabled={ocupado || !contratosAtivos.length}
                  title={contratosAtivos.length ? undefined : "Assine um contrato de pesquisa primeiro"}
                  onClick={rodarAgora}
                >
                  {ocupado ? "Trabalhando..." : "Pedir uma rodada agora"}
                </button>
                {estado?.rodada && (
                  <button type="button" className="btn-ghost px-5! py-2.5!" disabled={ocupado} onClick={() => void tocar(eventos)}>
                    Rever a última rodada
                  </button>
                )}
                <button type="button" className="btn-ghost px-5! py-2.5!" disabled={ocupado} onClick={() => {
                    setPersonalizando(true);
                    setEditando(true);
                    setColocando(null);
                    setSelecionado(null);
                    setMsgEdicao("");
                    // a barra fica no pé da tela: traz o escritório inteiro para a vista
                    setTimeout(() => document.querySelector("[data-escritorio-3d]")?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
                  }}>
                  Personalizar
                </button>
              </>
            )}
            {podeTelaCheia && (
              <button
                type="button"
                onClick={alternarTelaCheia}
                title={telaCheia ? "Sair da tela cheia (Esc)" : "Tela cheia"}
                className="btn-ghost px-4! py-2.5!"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  {telaCheia ? <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" /> : <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" />}
                </svg>
                {telaCheia ? "Sair" : "Tela cheia"}
              </button>
            )}
            {sessao && (
              <span className="flex items-center gap-2 text-[11px] text-slate-400">
                {sessao.email}
                <button type="button" onClick={sair} className="text-blue-300 hover:underline">
                  sair
                </button>
              </span>
            )}
          </div>
          {(aviso || erro) && (
            <p role={erro ? "alert" : undefined} className={`mb-3 px-1 text-sm ${erro ? "text-rose-300" : "text-slate-300"}`}>
              {erro || aviso}
            </p>
          )}

          {/* ---------- 1. o escritório trabalhando e o diário ---------- */}
          <div className="mb-2 flex items-end justify-between gap-3 px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200/80">Seu escritório trabalhando</h2>
            <span className="text-[11px] text-slate-400">cada movimento é um passo real da pesquisa</span>
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div>
              <Escritorio3D
                key={`${layout.assinatura}|${layout.fundo}|${layout.direita}`}
                layout={layout}
                config={config}
                vis={visEfetivo}
                falas={falas}
                notas={avisos.length}
                relogio={proxima ? `Próxima coleta ${hora(proxima)}` : ""}
                etiquetas={etiquetas}
                editando={personalizando && editando}
                selecionado={selecionado}
                aoSelecionar={(id) => {
                  setSelecionado(id);
                  setMsgEdicao("");
                }}
                aoMover={(id, x, z, rot) => {
                  setMsgEdicao("");
                  setPrevia((c) => {
                    const base = c ?? configSalva;
                    if (id.startsWith("estacao:")) {
                      return { ...base, estacoes: { ...base.estacoes, [id.slice(8)]: { x, z, rot } } };
                    }
                    if (id.startsWith("mesa:")) {
                      const chave = id.slice(5);
                      const atual = layout.mesas[chave];
                      return atual ? { ...base, mesas: { ...base.mesas, [chave]: { ...atual, x, z, rot } } } : base;
                    }
                    return { ...base, itens: base.itens.map((i) => (i.id === id ? { ...i, x, z, rot } : i)) };
                  });
                }}
                aoRecusar={(motivo) => setMsgEdicao(motivo)}
                colocando={personalizando && editando ? colocando : null}
                aoColocar={(tipo, x, z, rot) => {
                  const id = `${tipo}-${Math.random().toString(36).slice(2, 8)}`;
                  setPrevia((c) => {
                    const base = c ?? configSalva;
                    return { ...base, itens: [...base.itens, { id, tipo, x, z, rot }] };
                  });
                  setColocando(null);
                  setSelecionado(id);
                  setMsgEdicao("");
                }}
                aoMiniaturas={setMiniaturas}
              />
            </div>
            <Painel
              titulo="Diário da última rodada"
              extra={
                estado?.rodada && (
                  <span className="text-[11px] text-slate-400">
                    {estado.rodada.origem === "agendada" ? "agendada" : "pedida por você"} · {new Date(estado.rodada.iniciada_em).toLocaleString("pt-BR")}
                  </span>
                )
              }
            >
              {eventos.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {logado ? "Nenhuma rodada ainda. Dê um produto para o seu pesquisador." : "Crie seu escritório para ver o diário da sua equipe."}
                </p>
              ) : (
                <ol className="max-h-[26rem] space-y-1 overflow-y-auto pr-1 text-sm">
                  {eventos.map((e, i) => (
                    <li
                      key={e.ordem}
                      className={`flex gap-2 rounded px-1.5 py-0.5 transition ${
                        i === tocando ? "bg-amber-300/15 text-white" : tocando >= 0 && i > tocando ? "text-slate-500" : "text-slate-200"
                      }`}
                    >
                      <span className="shrink-0 font-mono text-[11px] leading-5 text-slate-400">{horaSeg(e.criado_em)}</span>
                      <span className="w-24 shrink-0 truncate text-[11px] font-semibold leading-5 text-blue-300">{nomeDe(e)}</span>
                      <span>{descrever(e, nomeNaTela)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Painel>
          </div>

          {/* ---------- 2. o resultado: produtos e preços ---------- */}
          <section aria-labelledby="titulo-produtos" className="mt-5">
            <div className="mb-2 flex items-end justify-between gap-3 px-1">
              <h2 id="titulo-produtos" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200/80">
                {logado ? "Seus produtos monitorados" : "Preços que o escritório já pesquisou"}
              </h2>
              <span className="text-[11px] text-slate-400">
                {logado ? "preços reais das lojas, atualizados a cada rodada" : "base geral · crie seu escritório para escolher os seus"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {produtosVisiveis.map((p) => {
                const c = contratosAtivos.find((x) => x.produto_id === p.id);
                const pesq = c ? funcionarios.find((f) => f.id === c.funcionario_id)?.nome ?? "Pesquisador" : "";
                return (
                  <CartaoProduto
                    key={p.id}
                    produto={p}
                    pontos={historico[p.id] ?? []}
                    ofertas={(estado?.ofertas ?? []).filter((o) => o.produto_id === p.id)}
                    contrato={logado ? (c ? { pesquisador: pesq, restante: restante(c.fim, agora) } : "encerrado") : null}
                    aberto={focoVisivel === p.id}
                    pesquisando={emPesquisa === p.id}
                    semEstoque={semEstoque.has(p.id)}
                    aoAbrir={() => setFoco(p.id)}
                  />
                );
              })}
              {logado ? (
                <CartaoNovo
                  titulo="Monitorar produto"
                  detalhe={
                    livres > 0
                      ? `${livres} pesquisador${livres > 1 ? "es" : ""} livre${livres > 1 ? "s" : ""}`
                      : plano === "pago"
                        ? "todos ocupados: contrate mais um pesquisador"
                        : "seu pesquisador está ocupado · plano pago contrata mais"
                  }
                  aoClicar={() => setAbrirEquipe(true)}
                />
              ) : (
                <CartaoNovo
                  titulo="Criar meu escritório grátis"
                  detalhe="escolha um produto e por quanto tempo o pesquisador acompanha o preço · já tem conta? entre por aqui"
                  aoClicar={() => abrirJanelaConta("criar")}
                />
              )}
            </div>
            {!produtosVisiveis.length && logado && (
              <p className="mt-2 px-1 text-sm text-slate-400">
                Nenhum produto ainda. Clique em <strong className="text-white">Monitorar produto</strong> e dê um produto para o seu pesquisador.
              </p>
            )}
          </section>

          {/* ---------- 3. o produto aberto: histórico e ofertas ---------- */}
          {focoVisivel && (
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <GraficoPreco produto={catalogo.find((p) => p.id === focoVisivel)} pontos={historico[focoVisivel] ?? []} />
              <FichaProduto
                produto={catalogo.find((p) => p.id === focoVisivel)}
                ofertas={tocando >= 0 ? ofertasVistas : (estado?.ofertas ?? []).filter((o) => o.produto_id === focoVisivel)}
              />
            </div>
          )}

          {/* ---------- equipe de pesquisa (abre por cima) ---------- */}
          {abrirEquipe && logado && (
            <div className="fixed inset-0 z-80 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Monitorar produto">
              <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-brand p-3 ring-1 ring-white/15">
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <h2 className="text-sm font-semibold text-white">Monitorar produto</h2>
                  <button type="button" onClick={() => setAbrirEquipe(false)} className="rounded px-2 text-slate-300 hover:bg-white/10" aria-label="Fechar">
                    ✕
                  </button>
                </div>
                <p className="mb-3 px-1 text-[12px] text-slate-300">
                  <strong className="text-white">1.</strong> Pesquise e escolha o produto · <strong className="text-white">2.</strong> Diga qual
                  pesquisador acompanha e por quanto tempo.
                </p>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
                  <BuscaProdutos aoBuscar={buscarProdutos} aoEscolher={escolherProduto} escolhidoChave={escolhido?.chave ?? null} />
                  <EquipePesquisa
                  catalogo={produtosVisiveis}
                  escolhido={escolhido?.produto ?? null}
                  pesquisadores={funcionarios.filter((f) => f.papel === "pesquisador")}
                  contratos={estado?.contratos ?? []}
                  plano={plano}
                  agora={agora}
                  ocupado={ocupado}
                  aoAssinar={async (f, prod, dias) => {
                    setAbrirEquipe(false);
                    setEscolhido(null);
                    await assinar(f, prod, dias);
                  }}
                  aoContratar={contratar}
                />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
