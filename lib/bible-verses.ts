import { getBibleChapter } from "./bible";
import { parseVerseReference, ParsedVerse } from "./bible-verse-parser";

export interface VerseText {
  reference: string;
  text: string;
  verses: Array<{ number: number; text: string }>;
}

/**
 * Busca o texto de uma referência bíblica
 * Exemplo: "João 3:16" ou "João 3:16-18"
 */
export async function getVerseText(
  reference: string,
  version: "nvi" | "acf" | "aa" = "nvi"
): Promise<VerseText | null> {
  try {
    const parsed = parseVerseReference(reference);
    if (!parsed) {
      return null;
    }

    // Buscar o capítulo
    const chapter = await getBibleChapter(parsed.book, parsed.chapter, version);
    
    if (!chapter || Object.keys(chapter).length === 0) {
      return null;
    }

    // Extrair os versículos solicitados
    const verses: Array<{ number: number; text: string }> = [];
    const endVerse = parsed.endVerse || parsed.startVerse;
    
    for (let v = parsed.startVerse; v <= endVerse; v++) {
      const verseText = chapter[v.toString()];
      if (verseText) {
        verses.push({ number: v, text: verseText });
      }
    }

    if (verses.length === 0) {
      return null;
    }

    // Formatar texto completo
    const text = verses.map(v => `${v.number} ${v.text}`).join(" ");

    return {
      reference,
      text,
      verses,
    };
  } catch (error) {
    console.error("Error getting verse text:", error);
    return null;
  }
}

