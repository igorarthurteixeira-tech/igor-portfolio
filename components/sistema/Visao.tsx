"use client";

import { useState, type ReactNode } from "react";
import css from "./sistema.module.css";

// Em telas estreitas a página abre no mapa; um botão alterna para o organograma compacto.
// Em telas largas o botão e a lista não aparecem (o CSS decide), e o mapa é sempre o que se vê.
export default function Visao({ mapa, lista }: { mapa: ReactNode; lista: ReactNode }) {
  const [verMapa, setVerMapa] = useState(true);
  return (
    <div className={verMapa ? css.modoMapa : css.modoLista}>
      <button type="button" className={css.alternar} onClick={() => setVerMapa(!verMapa)}>
        {verMapa ? "Ver organograma" : "Ver mapa"}
      </button>
      {lista}
      {mapa}
    </div>
  );
}
