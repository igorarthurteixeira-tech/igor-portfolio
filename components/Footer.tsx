import Link from "next/link";

export default function Footer() {
  return (
    <footer
      id="contato"
      className="border-t border-white/10 bg-black px-6 pb-12 pt-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">
              Igor Arthur
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Programador e projetista especializado em desenvolvimento web,
              arquitetura de sistemas e automação.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-medium text-white">Contato</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <a
                  href="mailto:igorarthurtr@outlook.com"
                  className="break-all transition hover:text-white"
                >
                  E-mail
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/553183313504"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/igor-arthur/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-medium text-white">Navegação</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <Link href="/#sobre" className="transition hover:text-white">
                  Sobre
                </Link>
              </li>
              <li>
                <Link href="/#projetos" className="transition hover:text-white">
                  Projetos
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Igor Arthur. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
