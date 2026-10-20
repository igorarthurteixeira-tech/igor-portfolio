import Link from "next/link";
import type { Carro } from "@/lib/carros";
import { brl, kmTxt } from "@/lib/showroom-store";
import SemFoto from "./SemFoto";

export default function CarroCard({ carro }: { carro: Carro }) {
  const nome = `${carro.marca} ${carro.modelo}`;
  return (
    <Link
      href={`/showroom/${carro.id}`}
      className={`card card-hover group relative flex h-full flex-col overflow-hidden ${
        carro.vendido ? "opacity-80" : ""
      }`}
    >
      <div className="relative overflow-hidden bg-slate-200">
        {carro.fotos?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={carro.fotos[0]} alt={nome} className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <SemFoto className="aspect-[16/10] w-full" />
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {carro.destaque && !carro.vendido && (
            <span className="rounded-full bg-accent-strong px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              Destaque
            </span>
          )}
          {carro.vendido && (
            <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              Vendido
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">{carro.marca}</p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-fg">{carro.modelo}</h3>
        <p className="text-sm text-muted">{carro.versao}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">{carro.ano}</span>
          <span className="chip">{kmTxt(carro.km)}</span>
          <span className="chip">{carro.cambio}</span>
          <span className="chip">{carro.combustivel}</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-5">
          <p className="text-2xl font-bold tracking-tight text-fg">{brl(carro.preco)}</p>
          <span className="text-sm font-semibold text-accent-strong group-hover:underline">Ver detalhes</span>
        </div>
      </div>
    </Link>
  );
}
