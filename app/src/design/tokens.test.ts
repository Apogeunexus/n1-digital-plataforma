/**
 * Contrast is arithmetic, and arithmetic is testable.
 *
 * The reason this file exists: `--cor-papel` was `#fafaf9` when the ratios were
 * first computed, a later revision changed it to `#f5f5f4`, and the numbers in
 * the comments and in the docs kept saying the old result. Nothing caught it —
 * a whole token silently dropped below AA and the documentation claimed the
 * opposite.
 *
 * So the tokens are parsed from the real `tokens.css`, not retyped here: a value
 * that changes in the stylesheet fails here, which is the entire point.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const AA_TEXT = 4.5;
const AA_LARGE_AND_NON_TEXT = 3;

type Theme = "claro" | "escuro";

function channelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  if (r === undefined || g === undefined || b === undefined) {
    throw new Error(`cor inválida: ${hex}`);
  }
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  if (high === undefined || low === undefined) throw new Error("par inválido");
  return (high + 0.05) / (low + 0.05);
}

/** Reads `--name: light-dark(#aaa, #bbb);` straight out of the stylesheet. */
function readTokens(): Record<Theme, Record<string, string>> {
  const css = readFileSync(join(import.meta.dirname, "tokens.css"), "utf8");
  const claro: Record<string, string> = {};
  const escuro: Record<string, string> = {};
  const pattern = /(--[\w-]+):\s*light-dark\(\s*(#[0-9a-fA-F]{6})\s*,\s*(#[0-9a-fA-F]{6})\s*\)/g;
  for (const match of css.matchAll(pattern)) {
    const [, name, light, dark] = match;
    if (name && light && dark) {
      claro[name] = light;
      escuro[name] = dark;
    }
  }
  return { claro, escuro };
}

const tokens = readTokens();
const themes: readonly Theme[] = ["claro", "escuro"];

/** The backgrounds a piece of text can land on. */
const SURFACES = ["--cor-papel", "--cor-superficie", "--cor-superficie-2"] as const;

describe("fórmula de contraste", () => {
  it("bate com as referências conhecidas da WCAG", () => {
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
    expect(contrast("#595959", "#ffffff")).toBeCloseTo(7.0, 1);
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
});

describe("tokens de texto atingem AA nos dois temas", () => {
  for (const theme of themes) {
    const t = tokens[theme];

    for (const text of ["--cor-tinta", "--cor-tinta-fraca"] as const) {
      for (const surface of SURFACES) {
        it(`${theme}: ${text} sobre ${surface}`, () => {
          const fg = t[text];
          const bg = t[surface];
          expect(fg, `${text} ausente`).toBeDefined();
          expect(bg, `${surface} ausente`).toBeDefined();
          expect(contrast(fg as string, bg as string)).toBeGreaterThanOrEqual(AA_TEXT);
        });
      }
    }

    it(`${theme}: tinta do botão primário sobre o acento`, () => {
      expect(contrast(t["--cor-acento-texto"] as string, t["--cor-acento"] as string)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(t["--cor-acento-texto"] as string, t["--cor-acento-forte"] as string)).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
    });

    it(`${theme}: tinta dos gradientes sobre as duas pontas de cada gradiente`, () => {
      const ink = t["--cor-gradiente-texto"] as string;
      // As pontas dos gradientes são literais no CSS; o teste as repete de
      // propósito, para quebrar se alguém mudar o gradiente sem olhar a tinta.
      for (const ponta of ["#7c3aed", "#9601c5", "#2c0263"]) {
        expect(contrast(ink, ponta), `gradiente ${ponta}`).toBeGreaterThanOrEqual(AA_TEXT);
      }
    });

    it(`${theme}: tinta do botão perigoso sobre o vermelho, inclusive no hover`, () => {
      const ink = t["--cor-perigo-texto-contraste"] as string;
      expect(contrast(ink, t["--cor-perigo"] as string)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(ink, t["--cor-perigo-forte"] as string)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it(`${theme}: iniciais do Avatar sobre todo tipo de Ator`, () => {
      const ink = t["--cor-ator-texto"] as string;
      for (const kind of ["membro", "agente", "automacao", "integracao"] as const) {
        const fill = t[`--cor-ator-${kind}`] as string;
        expect(contrast(ink, fill), `ator ${kind}`).toBeGreaterThanOrEqual(AA_TEXT);
      }
      // The System fill is dark in both themes, so its ink does not invert.
      expect(
        contrast(t["--cor-ator-sistema-texto"] as string, t["--cor-ator-sistema"] as string),
        "ator sistema",
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it(`${theme}: texto do selo sobre o próprio fundo`, () => {
      for (const seal of ["arquivado", "lixeira", "mesclado", "rascunho", "pausado", "pendente"] as const) {
        const fg = t[`--cor-selo-${seal}`] as string;
        const bg = t[`--cor-selo-${seal}-fundo`] as string;
        expect(contrast(fg, bg), `selo ${seal}`).toBeGreaterThanOrEqual(AA_TEXT);
      }
    });

    it(`${theme}: o fundo do selo se distingue da superfície onde ele vive`, () => {
      for (const seal of ["arquivado", "lixeira", "mesclado", "rascunho", "pausado", "pendente"] as const) {
        const bg = t[`--cor-selo-${seal}-fundo`] as string;
        expect(bg, `selo ${seal}`).not.toBe(t["--cor-superficie"]);
        expect(bg, `selo ${seal}`).not.toBe(t["--cor-papel"]);
      }
    });

    it(`${theme}: o texto de aviso atinge AA sobre o fundo do aviso`, () => {
      for (const tone of ["sucesso", "perigo", "atencao", "info"] as const) {
        const fg = t[`--cor-${tone}-texto`] as string;
        const bg = t[`--cor-${tone}-fraco`] as string;
        expect(contrast(fg, bg), `aviso ${tone}`).toBeGreaterThanOrEqual(AA_TEXT);
      }
    });

    it(`${theme}: --cor-tinta-tenue serve para marca, não para texto`, () => {
      // Declared as non-text: it must clear 3:1 for a graphical mark, and no
      // component may use it as readable text (asserted in components below).
      const fg = t["--cor-tinta-tenue"] as string;
      for (const surface of SURFACES) {
        expect(contrast(fg, t[surface] as string)).toBeGreaterThanOrEqual(AA_LARGE_AND_NON_TEXT);
      }
    });
  }
});

describe("os componentes leem token, nunca cor literal", () => {
  const source = readFileSync(join(import.meta.dirname, "components.tsx"), "utf8");

  it("não escreve hex, rgb() nem cor nomeada do Tailwind", () => {
    const literals = source.match(/#[0-9a-fA-F]{3,8}\b|rgb\(|bg-white|bg-black|text-white|text-black/g) ?? [];
    expect(literals).toEqual([]);
  });

  it("não usa --cor-tinta-tenue como texto legível", () => {
    // It survives only as a placeholder-free decorative token; any `text-[...]`
    // binding would put unreadable text on screen.
    expect(source).not.toContain("text-[var(--cor-tinta-tenue)]");
  });

  it("todo diálogo modal gerencia o foco", () => {
    // Only the JSX attribute counts — the hook's own doc comment mentions it.
    const modals = source.match(/^\s+aria-modal="true"$/gm) ?? [];
    const calls = source.match(/^\s+useModal\(/gm) ?? [];
    expect(modals.length).toBeGreaterThan(0);
    expect(calls.length).toBe(modals.length);
  });
});
