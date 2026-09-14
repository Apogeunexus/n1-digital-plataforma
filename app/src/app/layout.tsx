import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Interface font plus a monospaced face for identifiers (Identificador legível
 * de Tarefas e de Negócios — Glossário).
 */
const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "N1 Digital",
  description:
    "Plataforma de trabalho, CRM e IA — protótipo navegável construído sobre a ontologia v1.0.",
};

/**
 * The explicit prop type is written by hand on purpose: `LayoutProps<'/'>` only
 * exists after `next typegen`, and the root layout must typecheck on a clean
 * checkout, before any build has run.
 */
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--cor-superficie-2)] text-[var(--cor-tinta)]">{children}</body>
    </html>
  );
}
