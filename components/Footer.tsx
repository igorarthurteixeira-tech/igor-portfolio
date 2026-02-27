export default function Footer() {
  return (
    <footer
      id="contato"
      className="bg-black border-t border-white/10 pt-16 pb-12 px-6"
    >
      <div className="max-w-6xl mx-auto">

        <div className="grid md:grid-cols-3 gap-12">

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Igor Arthur
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Programador & Projetista especializado em desenvolvimento web,
              arquitetura de sistemas e automação.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">
              Contato
            </h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li>
                <a
                  href="mailto:igorarthurtr@outlook.com"
                  className="hover:text-white transition break-all"
                >
                  E-mail
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/553183313504"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/igor-arthur/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">
              Navegação
            </h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li>
                <a href="/#sobre" className="hover:text-white transition">
                  Sobre
                </a>
              </li>
              <li>
                <a href="/#projetos" className="hover:text-white transition">
                  Projetos
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-16 border-t border-white/10 pt-6 text-center text-gray-500 text-xs">
          © {new Date().getFullYear()} Igor Arthur. Todos os direitos reservados.
        </div>

      </div>
    </footer>
  );
}