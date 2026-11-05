import { createHmac } from "crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Limite de tentativas de entrada (senha errada) e de criação de contas.
 * Fica no banco e não na memória do servidor: na Vercel cada requisição pode cair numa instância diferente,
 * e uma contagem em memória não seguraria quem insiste. Se o banco ou a tabela falharem, ninguém é bloqueado
 * (melhor deixar passar do que trancar todo mundo para fora).
 */

type Regra = { chave: string; max: number; janelaMin: number };

/** Resumo irreversível de um IP ou e-mail: o valor em si nunca é guardado. */
function resumo(valor: string) {
  const segredo = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "sem-segredo";
  return createHmac("sha256", segredo).update(valor.trim().toLowerCase()).digest("hex").slice(0, 32);
}

async function ipAtual() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "desconhecido";
}

function espera(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.ceil(minutos / 60);
  return h === 1 ? "1 hora" : `${h} horas`;
}

/** Alguma regra estourou? Se sim, diz em quantos minutos a mais restritiva libera. */
async function checar(tipo: string, regras: Regra[]) {
  const db = supabaseAdmin();
  if (!db) return { bloqueado: false, esperaMin: 0 };
  let esperaMin = 0;
  let bloqueado = false;
  for (const r of regras) {
    const desde = new Date(Date.now() - r.janelaMin * 60_000).toISOString();
    const { data, error } = await db
      .from("tentativas_acesso")
      .select("criado_em")
      .eq("tipo", tipo)
      .eq("chave", r.chave)
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(r.max);
    if (error || !data) continue;
    if (data.length >= r.max) {
      bloqueado = true;
      // a tentativa mais antiga que ainda conta sai da janela e libera
      const libera = new Date(data[data.length - 1].criado_em as string).getTime() + r.janelaMin * 60_000;
      esperaMin = Math.max(esperaMin, Math.max(1, Math.ceil((libera - Date.now()) / 60_000)));
    }
  }
  return { bloqueado, esperaMin };
}

async function registrar(tipo: string, chaves: string[]) {
  const db = supabaseAdmin();
  if (!db) return;
  await db.from("tentativas_acesso").insert(chaves.map((chave) => ({ tipo, chave })));
  // limpeza de vez em quando: o que passou de 3 dias não serve mais
  if (Math.random() < 0.05) {
    await db.from("tentativas_acesso").delete().lt("criado_em", new Date(Date.now() - 3 * 86_400_000).toISOString());
  }
}

async function contar(tipo: string, chave: string, janelaMin: number) {
  const db = supabaseAdmin();
  if (!db) return 0;
  const desde = new Date(Date.now() - janelaMin * 60_000).toISOString();
  const { count } = await db
    .from("tentativas_acesso")
    .select("*", { count: "exact", head: true })
    .eq("tipo", tipo)
    .eq("chave", chave)
    .gte("criado_em", desde);
  return count ?? 0;
}

// ---- entrada (senha) ----

// por e-mail o limite é mais curto: protege a conta mesmo que o ataque venha de muitos endereços
const POR_EMAIL = { max: 5, janelaMin: 15 };
const POR_IP = { max: 20, janelaMin: 15 };

async function regrasLogin(email: string): Promise<Regra[]> {
  return [
    { chave: `email:${resumo(email)}`, ...POR_EMAIL },
    { chave: `ip:${resumo(await ipAtual())}`, ...POR_IP },
  ];
}

/** Antes de conferir a senha: devolve a mensagem de bloqueio, ou null se pode tentar. */
export async function loginBloqueado(email: string) {
  const r = await checar("login", await regrasLogin(email));
  return r.bloqueado ? `Muitas tentativas de entrada. Por segurança, aguarde ${espera(r.esperaMin)} e tente de novo.` : null;
}

/** Depois de uma senha errada: anota a tentativa e devolve a mensagem, avisando quando está perto do bloqueio. */
export async function loginFalhou(email: string) {
  const regras = await regrasLogin(email);
  await registrar("login", regras.map((r) => r.chave));
  const restantes = POR_EMAIL.max - (await contar("login", regras[0].chave, POR_EMAIL.janelaMin));
  if (restantes <= 0) return `E-mail ou senha incorretos. O acesso foi bloqueado por ${POR_EMAIL.janelaMin} min por excesso de tentativas.`;
  if (restantes <= 2) {
    return `E-mail ou senha incorretos. Restam ${restantes} ${restantes === 1 ? "tentativa" : "tentativas"} antes de um bloqueio de ${POR_EMAIL.janelaMin} min.`;
  }
  return "E-mail ou senha incorretos.";
}

/** Entrou: as falhas anteriores desse e-mail deixam de contar. (As do IP ficam: ele pode estar testando várias contas.) */
export async function loginDeuCerto(email: string) {
  const db = supabaseAdmin();
  if (!db) return;
  await db.from("tentativas_acesso").delete().eq("tipo", "login").eq("chave", `email:${resumo(email)}`);
}

// ---- criação de contas ----

/**
 * Cada tentativa de criar conta conta contra o IP (3 por hora), contra o e-mail (3 por dia) e contra o total do site
 * (40 por dia: impede encher a lista de cadastros pendentes). Devolve a mensagem de bloqueio, ou null e já anota a tentativa.
 */
export async function limiteCadastro(email: string) {
  const regras: Regra[] = [
    { chave: `ip:${resumo(await ipAtual())}`, max: 3, janelaMin: 60 },
    { chave: `email:${resumo(email)}`, max: 3, janelaMin: 1440 },
    { chave: "global", max: 40, janelaMin: 1440 },
  ];
  const r = await checar("cadastro", regras);
  if (r.bloqueado) return `Muitas tentativas de cadastro. Tente de novo em ${espera(r.esperaMin)}.`;
  await registrar("cadastro", regras.map((x) => x.chave));
  return null;
}
