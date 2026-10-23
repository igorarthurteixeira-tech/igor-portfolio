import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados o site de Igor Arthur coleta, para que servem e como pedir a remoção.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <section className="min-h-[60vh] bg-page px-6 pb-20 pt-28">
      <article className="mx-auto max-w-3xl space-y-6 text-slate-700">
        <header>
          <p className="eyebrow">Legal</p>
          <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">Política de privacidade</h1>
          <p className="mt-2 text-sm text-muted">Atualizada em 23 de outubro de 2026.</p>
        </header>

        <p>
          Este site é o portfólio profissional de Igor Arthur. Aqui você vê como os dados que passam por ele são
          tratados. Não há venda nem compartilhamento de dados com terceiros para publicidade.
        </p>

        <h2 className="text-xl font-semibold text-fg">O que é coletado</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Formulário de contato:</strong> nome, e-mail e mensagem, enviados por você, usados apenas para
            responder ao seu contato.
          </li>
          <li>
            <strong>Série Vida de Dono:</strong> curtidas (ligadas a um identificador anônimo guardado no seu
            navegador) e, se você comentar, o nome e o texto digitados. Comentários passam por moderação antes de
            aparecer.
          </li>
          <li>
            <strong>Métricas de visita:</strong> página visitada, cliques em botões, página de origem e um
            identificador anônimo de sessão. Servem só para saber quais partes do site são úteis. Não há
            identificação pessoal nem cookies de publicidade.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-fg">Painel de publicações e redes sociais</h2>
        <p>
          O administrador do site usa um painel privado para agendar e publicar os próprios vídeos no Instagram e no
          YouTube. Quando o administrador conecta uma conta do Google, o acesso concedido serve exclusivamente para
          enviar vídeos ao canal dele. O site não lê, não guarda e não exibe dados de outros usuários do YouTube, e
          o acesso pode ser revogado a qualquer momento em myaccount.google.com/permissions. O uso das informações
          recebidas das APIs do Google segue a{" "}
          <a
            className="font-medium text-accent-strong underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Dados do Usuário dos Serviços de API do Google
          </a>
          , incluindo os requisitos de Uso Limitado.
        </p>

        <h2 className="text-xl font-semibold text-fg">Armazenamento e seus direitos</h2>
        <p>
          Os dados ficam em serviços de hospedagem e banco de dados (Vercel e Supabase). Você pode pedir acesso,
          correção ou exclusão dos seus dados, como seu nome e comentários, escrevendo para{" "}
          <a className="font-medium text-accent-strong underline" href={`mailto:${site.contato.email}`}>
            {site.contato.email}
          </a>
          .
        </p>
      </article>
    </section>
  );
}
