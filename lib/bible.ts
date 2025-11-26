// Estrutura dos JSONs da Bíblia: array de objetos com { name, abbrev, chapters }
// chapters é um array de arrays, onde cada sub-array é um capítulo com versos (strings)

interface BibleBookData {
  name: string;
  abbrev: string;
  chapters: string[][]; // Array de capítulos, cada capítulo é um array de versos
}

type BibleData = BibleBookData[];

// Função auxiliar para normalizar nomes de livros (remove acentos e converte para minúsculas)
function normalizeBookName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, ""); // Remove caracteres especiais
}

// Mapeamento de nomes de livros para abreviações
const bookAbbrevMap: { [key: string]: string } = {
  // Antigo Testamento
  "Gênesis": "gn",
  "Êxodo": "ex",
  "Levítico": "lv",
  "Números": "nm",
  "Deuteronômio": "dt",
  "Josué": "js",
  "Juízes": "jz",
  "Rute": "rt",
  "1 Samuel": "1sm",
  "2 Samuel": "2sm",
  "1 Reis": "1rs",
  "2 Reis": "2rs",
  "1 Crônicas": "1cr",
  "2 Crônicas": "2cr",
  "Esdras": "ed",
  "Neemias": "ne",
  "Ester": "et",
  "Jó": "job",
  "Salmos": "sl",
  "Provérbios": "pv",
  "proverbios": "pv",
  "Eclesiastes": "ec",
  "Cantares": "ct",
  "Isaías": "is",
  "Jeremias": "jr",
  "Lamentações": "lm",
  "Ezequiel": "ez",
  "Daniel": "dn",
  "Oséias": "os",
  "Joel": "jl",
  "Amós": "am",
  "Obadias": "ob",
  "Jonas": "jn",
  "Miqueias": "mq",
  "Naum": "na",
  "Habacuque": "hc",
  "Sofonias": "sf",
  "Ageu": "ag",
  "Zacarias": "zc",
  "Malaquias": "ml",
  // Novo Testamento
  "Mateus": "mt",
  "Marcos": "mc",
  "Lucas": "lc",
  "João": "jo",
  "Atos": "at",
  "Romanos": "rm",
  "1 Coríntios": "1co",
  "2 Coríntios": "2co",
  "Gálatas": "gl",
  "Efésios": "ef",
  "Filipenses": "fp",
  "Colossenses": "cl",
  "1 Tessalonicenses": "1ts",
  "2 Tessalonicenses": "2ts",
  "1 Timóteo": "1tm",
  "2 Timóteo": "2tm",
  "Tito": "tt",
  "Filemom": "fm",
  "Hebreus": "hb",
  "Tiago": "tg",
  "1 Pedro": "1pe",
  "2 Pedro": "2pe",
  "1 João": "1jo",
  "2 João": "2jo",
  "3 João": "3jo",
  "Judas": "jd",
  "Apocalipse": "ap",
};

export async function getBibleChapter(
  bookName: string,
  chapterNumber: number,
  version: "nvi" | "acf" | "aa" = "nvi"
): Promise<{ [verse: string]: string }> {
  try {
    // Carregar o arquivo JSON da versão
    // Usar fetch para arquivos grandes, fallback para import
    let bibleData: BibleData;
    
    // Carregar JSON usando fetch (arquivos estão em public/bible/json/)
    // Como a função é chamada de componentes "use client", sempre será no cliente
    const url = `/bible/json/${version}.json`;
    
    const response = await fetch(url, {
      cache: "force-cache", // Cache para melhor performance
    });
    if (!response.ok) {
      throw new Error(`Erro ao carregar arquivo: ${response.statusText} (${response.status})`);
    }
    const jsonData = await response.json();
    
    // Debug: verificar estrutura recebida
    console.log("JSON recebido - tipo:", typeof jsonData, "é array?", Array.isArray(jsonData));
    
    // Garantir que temos um array
    if (Array.isArray(jsonData)) {
      bibleData = jsonData;
    } else if (jsonData && typeof jsonData === "object") {
      // Tentar extrair array de diferentes estruturas possíveis
      if (Array.isArray(jsonData.default)) {
        bibleData = jsonData.default;
      } else if (Array.isArray(jsonData.data)) {
        bibleData = jsonData.data;
      } else {
        // Tentar pegar o primeiro valor que seja array
        const values = Object.values(jsonData);
        const arrayValue = values.find(v => Array.isArray(v));
        if (arrayValue) {
          bibleData = arrayValue as BibleData;
        } else {
          console.error("Estrutura do JSON:", Object.keys(jsonData), "Primeiros valores:", Object.values(jsonData).slice(0, 2));
          throw new Error("Formato de dados da Bíblia inválido - não foi possível encontrar array");
        }
      }
    } else {
      throw new Error("Formato de dados da Bíblia inválido - esperado array ou objeto com array");
    }
    
    // Verificação final
    if (!Array.isArray(bibleData)) {
      console.error("bibleData ainda não é array após processamento:", typeof bibleData, bibleData);
      throw new Error("Dados da Bíblia em formato inválido - não é um array");
    }
    
    if (bibleData.length === 0) {
      throw new Error("Dados da Bíblia vazios");
    }
    
    console.log("bibleData carregado com sucesso:", bibleData.length, "livros");
    
    // Encontrar o livro pelo nome ou abreviação (busca flexível)
    const normalizedSearchName = normalizeBookName(bookName);
    const abbrev = bookAbbrevMap[bookName] || bookName.toLowerCase();
    
    const book = bibleData.find((b) => {
      const normalizedBookName = normalizeBookName(b.name);
      return (
        normalizedBookName === normalizedSearchName ||
        b.name.toLowerCase() === bookName.toLowerCase() ||
        b.abbrev === abbrev ||
        b.abbrev === bookName.toLowerCase()
      );
    });

    if (!book) {
      // Log para debug
      console.log("Livros disponíveis:", bibleData.slice(0, 5).map(b => `${b.name} (${b.abbrev})`));
      throw new Error(`Livro "${bookName}" não encontrado. Abreviação tentada: "${abbrev}"`);
    }

    // Verificar se o capítulo existe (capítulos são indexados a partir de 0)
    if (chapterNumber < 1 || chapterNumber > book.chapters.length) {
      throw new Error(`Capítulo ${chapterNumber} não encontrado em ${book.name} (total: ${book.chapters.length})`);
    }

    // Obter o capítulo (índice é chapterNumber - 1)
    const chapter = book.chapters[chapterNumber - 1];
    
    // Verificar se o capítulo é um array
    if (!Array.isArray(chapter)) {
      throw new Error(`Formato de capítulo inválido`);
    }
    
    // Converter array de versos para objeto { "1": "verso 1", "2": "verso 2", ... }
    const verses: { [verse: string]: string } = {};
    chapter.forEach((verse, index) => {
      verses[(index + 1).toString()] = verse;
    });

    return verses;
  } catch (error: any) {
    console.error("Error loading bible chapter:", error);
    // Retornar um placeholder se o arquivo não existir
    return {
      "1": `Texto do capítulo ${chapterNumber} de ${bookName} não disponível. Erro: ${error?.message || error}`,
    };
  }
}

// Função auxiliar para obter lista de livros disponíveis
export async function getAvailableBooks(version: "nvi" | "acf" | "aa" = "nvi"): Promise<Array<{ name: string; abbrev: string; chapters: number }>> {
  try {
    const imported = await import(`@/bible/json/${version}.json`);
    const bibleData: BibleData = (imported.default || imported) as BibleData;
    
    if (!Array.isArray(bibleData)) {
      return [];
    }
    
    return bibleData.map((book) => ({
      name: book.name,
      abbrev: book.abbrev,
      chapters: book.chapters.length,
    }));
  } catch (error) {
    console.error("Error loading available books:", error);
    return [];
  }
}
