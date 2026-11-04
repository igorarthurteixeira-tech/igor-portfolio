import type { ArquivoEnviado } from "@/lib/etm";

/** Como o arquivo vai ser enviado: direto ao Storage do Supabase ou, com o Drive conectado, em pedaços pelo servidor. */
export type Preparo =
  | { ok: true; modo: "storage"; path: string; token: string; bucket: string }
  | { ok: true; modo: "drive"; path: string; sessao: string }
  | { ok: false; erro: string };

export type ProgressoEnvio = { nome: string; indice: number; total: number; feito: number; bytes: number };

// 4 MiB: múltiplo de 256 KiB (exigência do Drive) e abaixo do limite de 4,5 MB por requisição da Vercel
const PEDACO = 4 * 1024 * 1024;

function enviarPedacoDrive(sessao: string, corpo: Blob, inicio: number, total: number, aoProgredir: (bytes: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/etm/drive/enviar?sessao=${encodeURIComponent(sessao)}`);
    xhr.setRequestHeader("x-inicio", String(inicio));
    xhr.setRequestHeader("x-total", String(total));
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let erro = "Falha ao enviar o arquivo.";
      try {
        erro = JSON.parse(xhr.responseText).erro ?? erro;
      } catch {
        // resposta sem corpo legível
      }
      reject(new Error(erro));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão ao enviar o arquivo."));
    xhr.send(corpo);
  });
}

/** Envia em pedaços de 4 MiB, tentando de novo até 3 vezes cada pedaço (a internet falha no meio de arquivo grande). */
async function enviarParaDrive(arquivo: File, sessao: string, aoProgredir: (feito: number) => void) {
  for (let inicio = 0; inicio < arquivo.size; inicio += PEDACO) {
    const fim = Math.min(inicio + PEDACO, arquivo.size);
    const corpo = arquivo.slice(inicio, fim);
    for (let tentativa = 1; ; tentativa++) {
      try {
        await enviarPedacoDrive(sessao, corpo, inicio, arquivo.size, (b) => aoProgredir(inicio + b));
        break;
      } catch (e) {
        if (tentativa >= 3) throw e;
        await new Promise((r) => setTimeout(r, 800 * tentativa));
      }
    }
    aoProgredir(fim);
  }
}

/** Envia cada arquivo (XHR informa o andamento) e devolve os caminhos para registrar no pedido. */
export async function enviarArquivos(
  arquivos: File[],
  preparar: (nome: string, tamanho: number) => Promise<Preparo>,
  aoProgredir: (p: ProgressoEnvio) => void,
): Promise<ArquivoEnviado[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const enviados: ArquivoEnviado[] = [];
  for (let i = 0; i < arquivos.length; i++) {
    const arquivo = arquivos[i];
    const pre = await preparar(arquivo.name, arquivo.size);
    if (!pre.ok) throw new Error(pre.erro);

    const base = { nome: arquivo.name, indice: i + 1, total: arquivos.length, bytes: arquivo.size };
    aoProgredir({ ...base, feito: 0 });

    if (pre.modo === "drive") {
      await enviarParaDrive(arquivo, pre.sessao, (feito) => aoProgredir({ ...base, feito: Math.min(feito, arquivo.size) }));
    } else {
      if (!url || !chave) throw new Error("Supabase não configurado.");
      const corpo = new FormData();
      corpo.append("cacheControl", "3600");
      corpo.append("", arquivo);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", `${url}/storage/v1/object/upload/sign/${pre.bucket}/${pre.path}?token=${pre.token}`);
        xhr.setRequestHeader("apikey", chave);
        xhr.setRequestHeader("authorization", `Bearer ${chave}`);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) aoProgredir({ ...base, feito: Math.min(e.loaded, arquivo.size) });
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Falha ao enviar "${arquivo.name}".`));
        xhr.onerror = () => reject(new Error(`Falha de conexão ao enviar "${arquivo.name}".`));
        xhr.send(corpo);
      });
    }
    enviados.push({ path: pre.path, nome: arquivo.name, tamanho: arquivo.size });
  }
  return enviados;
}
