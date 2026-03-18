"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav
        className={`fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black transition-all duration-300 ${
          scrolled ? "py-3" : "py-6"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" onClick={closeMenu}>
            <Image
              src="/logo.png"
              alt="Igor Arthur Logo"
              width={400}
              height={80}
              className={`w-auto transition-all duration-300 ${
                scrolled ? "h-8 sm:h-10" : "h-12 sm:h-16"
              }`}
              priority
            />
          </Link>

          <div className="hidden gap-6 text-sm text-gray-400 sm:flex">
            {pathname !== "/" && (
              <Link href="/" className="transition hover:text-white">
                Início
              </Link>
            )}

            {pathname === "/" && (
              <>
                <a href="#sobre" className="transition hover:text-white">
                  Sobre
                </a>
                <a href="#projetos" className="transition hover:text-white">
                  Projetos
                </a>
              </>
            )}

            <a href="#contato" className="transition hover:text-white">
              Contato
            </a>
          </div>

          <button
            ref={buttonRef}
            className="relative flex h-8 w-8 items-center justify-center sm:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-label="Abrir menu"
          >
            <span
              className={`absolute h-0.5 w-6 bg-white transition-all duration-300 ${
                menuOpen ? "rotate-45" : "-translate-y-2"
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-white transition-all duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-white transition-all duration-300 ${
                menuOpen ? "-rotate-45" : "translate-y-2"
              }`}
            />
          </button>
        </div>
      </nav>

      <div
        ref={menuRef}
        className={`fixed left-0 z-50 w-full border-t border-white/10 bg-black transition-all duration-300 ease-in-out sm:hidden ${
          menuOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        style={{ top: scrolled ? "56px" : "80px" }}
      >
        <div className="flex flex-col gap-5 px-6 py-6 text-base text-gray-400">
          {pathname !== "/" && (
            <Link
              href="/"
              onClick={closeMenu}
              className="block transition hover:text-white"
            >
              Início
            </Link>
          )}

          {pathname === "/" && (
            <>
              <a
                href="#sobre"
                onClick={closeMenu}
                className="block transition hover:text-white"
              >
                Sobre
              </a>
              <a
                href="#projetos"
                onClick={closeMenu}
                className="block transition hover:text-white"
              >
                Projetos
              </a>
            </>
          )}

          <a
            href="#contato"
            onClick={closeMenu}
            className="block transition hover:text-white"
          >
            Contato
          </a>
        </div>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
          onClick={closeMenu}
        />
      )}
    </>
  );
}
