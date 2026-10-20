"use client";

import { useEffect, useRef, useState } from "react";

export default function AnimatedCard({
  children,
  delay = 0,
  className = "",
  id,
  rootMargin,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  id?: string;
  /** Encolhe a área de ativação (ex.: "0px 0px -30% 0px" só revela quando entra mais no meio da tela). */
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      id={id}
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`
        transition-all duration-700 ease-out ${className}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
      `}
    >
      {children}
    </div>
  );
}