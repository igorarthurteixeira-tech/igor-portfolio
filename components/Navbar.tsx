"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Detect scroll shrink
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close when clicking outside
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

  return (
    <>
      {/* NAVBAR */}
      <nav
        className={`fixed top-0 left-0 w-full bg-black border-b border-white/10 z-50 transition-all duration-300 ${
          scrolled ? "py-3" : "py-6"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex justify-between items-center">

          {/* Logo */}
          <Link href="/">
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

          {/* Desktop Links */}
          <div className="hidden sm:flex gap-6 text-gray-400 text-sm">
            {pathname !== "/" && (
              <Link href="/" className="hover:text-white transition">
                Início
              </Link>
            )}

            {pathname === "/" && (
              <>
                <a href="#sobre" className="hover:text-white transition">
                  Sobre
                </a>
                <a href="#projetos" className="hover:text-white transition">
                  Projetos
                </a>
              </>
            )}

            <a href="#contato" className="hover:text-white transition">
              Contato
            </a>
          </div>

          {/* Mobile Button */}
          <button
            ref={buttonRef}
            className="sm:hidden relative w-8 h-8 flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
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

      {/* MOBILE MENU (fixed, calculado abaixo da navbar) */}
      <div
        ref={menuRef}
        className={`sm:hidden fixed left-0 w-full bg-black border-t border-white/10 z-50
          transition-all duration-300 ease-in-out
          ${
            menuOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
        style={{
          top: scrolled ? "56px" : "80px"
        }}
      >
        <div className="px-6 py-6 flex flex-col gap-5 text-gray-400 text-base">

          {pathname !== "/" && (
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="block hover:text-white transition"
            >
              Início
            </Link>
          )}

          {pathname === "/" && (
            <>
              <a
                href="#sobre"
                onClick={() => setMenuOpen(false)}
                className="block hover:text-white transition"
              >
                Sobre
              </a>

              <a
                href="#projetos"
                onClick={() => setMenuOpen(false)}
                className="block hover:text-white transition"
              >
                Projetos
              </a>
            </>
          )}

          <a
            href="#contato"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-white transition"
          >
            Contato
          </a>

        </div>
      </div>

      {/* Overlay Blur */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}