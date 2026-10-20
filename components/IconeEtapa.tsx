const caminhos: Record<string, string> = {
  conversa: "M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z",
  pedido: "M9 3h6v3H9zM6 5h12v16H6zM9 11h6M9 15h6",
  projeto: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  teste: "M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M8 15h8",
  aprovacao: "M12 21a9 9 0 100-18 9 9 0 000 18zM8 12l3 3 5-6",
  pagamento: "M3 6h18v12H3zM3 10h18M7 15h3",
  entrega: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
  check: "M5 12l4 4 10-10",
};

export default function IconeEtapa({
  nome,
  className = "h-6 w-6",
}: {
  nome: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={caminhos[nome] ?? caminhos.check} />
    </svg>
  );
}
