"use client";

import { useCallback, useEffect, useState } from "react";

export type Comentario = { id: string; nome: string; texto: string; created_at: string };
export type Estado = {
  curtidas: number | null;
  comentarios: number | null;
  jaCurtiu: boolean;
  lista: Comentario[];
};

/** Identifica o navegador (sem login) para limitar a uma curtida por pessoa. */
function idDoNavegador() {
  try {
    let id = localStorage.getItem("serie-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("serie-id", id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Curtidas e comentários de um episódio. */
export function useInteracao(id: string) {
  const [estado, setEstado] = useState<Estado>({ curtidas: null, comentarios: null, jaCurtiu: false, lista: [] });

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/serie/estado?episodio=${encodeURIComponent(id)}&sessao=${idDoNavegador()}`);
      if (r.ok) setEstado(await r.json());
    } catch {
      // sem rede: o player funciona do mesmo jeito
    }
  }, [id]);

  useEffect(() => {
    // busca inicial do estado (curtidas e comentários) ao abrir o episódio
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  async function curtir() {
    const antes = estado;
    setEstado({ ...estado, jaCurtiu: !estado.jaCurtiu });
    try {
      const r = await fetch("/api/serie/curtir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodio: id, sessao: idDoNavegador() }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEstado((e) => ({ ...e, jaCurtiu: d.curtiu, curtidas: d.curtidas }));
    } catch {
      setEstado(antes);
    }
  }

  /** Envia o comentário; devolve a mensagem para mostrar. */
  async function comentar(nome: string, texto: string, isca: string): Promise<{ ok: boolean; texto: string }> {
    try {
      const r = await fetch("/api/serie/comentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodio: id, nome, texto, site: isca }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || "Não foi possível enviar.");
      return { ok: true, texto: "Obrigado! Seu comentário aparece aqui depois de aprovado." };
    } catch (err) {
      return { ok: false, texto: err instanceof Error ? err.message : "Não foi possível enviar." };
    }
  }

  return { estado, curtir, comentar };
}
