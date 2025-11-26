/**
 * Função para parsear referências bíblicas
 * Exemplos: "João 3:16", "João 3:16-18", "1 Coríntios 13:1-3"
 */

export interface ParsedVerse {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
}

export function parseVerseReference(reference: string): ParsedVerse | null {
  // Remover espaços extras
  const cleaned = reference.trim();
  
  // Padrão: Livro Capítulo:Versículo ou Livro Capítulo:Versículo-Versículo
  // Exemplos: "João 3:16", "João 3:16-18", "1 Coríntios 13:1-3"
  const pattern = /^(\d*\s*[A-Za-zÀ-ÿ\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$/;
  const match = cleaned.match(pattern);
  
  if (!match) {
    return null;
  }
  
  const book = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : undefined;
  
  return {
    book,
    chapter,
    startVerse,
    endVerse,
  };
}

export function formatVerseReference(parsed: ParsedVerse): string {
  if (parsed.endVerse && parsed.endVerse !== parsed.startVerse) {
    return `${parsed.book} ${parsed.chapter}:${parsed.startVerse}-${parsed.endVerse}`;
  }
  return `${parsed.book} ${parsed.chapter}:${parsed.startVerse}`;
}

