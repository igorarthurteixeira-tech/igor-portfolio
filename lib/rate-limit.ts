const registros = new Map<string, { n: number; fim: number }>();

/**
 * Limite simples por IP, em memória. É uma proteção de melhor esforço:
 * em ambiente serverless cada instância tem a sua contagem, o que já
 * barra rajadas de um mesmo visitante sem precisar de serviço externo.
 * Retorna true se a requisição pode seguir.
 */
export function permitir(
  request: Request,
  rota: string,
  max: number,
  janelaMs: number,
): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const chave = `${rota}:${ip}`;
  const agora = Date.now();

  if (registros.size > 5000) {
    for (const [k, v] of registros) if (v.fim < agora) registros.delete(k);
  }

  const atual = registros.get(chave);
  if (!atual || atual.fim < agora) {
    registros.set(chave, { n: 1, fim: agora + janelaMs });
    return true;
  }
  atual.n += 1;
  return atual.n <= max;
}
