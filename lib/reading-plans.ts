import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getAvailableBooks } from "./bible";

export interface ReadingPlan {
  id: string;
  name: string;
  description: string;
  type: "daily" | "weekly" | "custom";
  duration: number; // dias
  chapters: Array<{ book: string; chapter: number; day: number }>;
  badgeId?: string; // ID do badge que será desbloqueado ao completar
  createdAt: string;
}

export interface UserReadingProgress {
  planId: string;
  userId: string;
  currentDay: number;
  completedChapters: string[]; // Array de "book-chapter" (ex: "Gênesis-1")
  startedAt: string;
  completedAt?: string;
}

/**
 * Gera capítulos para um plano de leitura
 */
async function generatePlanChapters(planType: string): Promise<Array<{ book: string; chapter: number; day: number }>> {
  const books = await getAvailableBooks();
  const chapters: Array<{ book: string; chapter: number; day: number }> = [];
  let day = 1;

  if (planType === "bible-year") {
    // Bíblia completa em 365 dias
    for (const book of books) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        chapters.push({ book: book.name, chapter, day });
        day++;
      }
    }
  } else if (planType === "new-testament-90") {
    // Novo Testamento (livros 40-66)
    const newTestament = books.slice(39);
    const totalChapters = newTestament.reduce((sum, book) => sum + book.chapters, 0);
    const chaptersPerDay = Math.ceil(totalChapters / 90);
    let currentDay = 1;
    let chaptersToday = 0;

    for (const book of newTestament) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        chapters.push({ book: book.name, chapter, day: currentDay });
        chaptersToday++;
        if (chaptersToday >= chaptersPerDay) {
          currentDay++;
          chaptersToday = 0;
        }
      }
    }
  } else if (planType === "psalms-proverbs") {
    // Salmos e Provérbios - 1 Salmo + 1 Provérbio por dia
    const psalms = books.find(b => b.name === "Salmos");
    const proverbs = books.find(b => b.name === "Provérbios");
    
    if (psalms && proverbs) {
      const maxChapters = Math.max(psalms.chapters, proverbs.chapters);
      for (let i = 1; i <= 31; i++) {
        const psalmChapter = ((i - 1) % psalms.chapters) + 1;
        const proverbChapter = ((i - 1) % proverbs.chapters) + 1;
        chapters.push({ book: "Salmos", chapter: psalmChapter, day: i });
        chapters.push({ book: "Provérbios", chapter: proverbChapter, day: i });
      }
    }
  } else if (planType === "gospels-30") {
    // Evangelhos: Mateus, Marcos, Lucas, João
    const gospels = books.filter(b => 
      ["Mateus", "Marcos", "Lucas", "João"].includes(b.name)
    );
    const totalChapters = gospels.reduce((sum, book) => sum + book.chapters, 0);
    const chaptersPerDay = Math.ceil(totalChapters / 30);
    let currentDay = 1;
    let chaptersToday = 0;

    for (const book of gospels) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        chapters.push({ book: book.name, chapter, day: currentDay });
        chaptersToday++;
        if (chaptersToday >= chaptersPerDay && currentDay < 30) {
          currentDay++;
          chaptersToday = 0;
        }
      }
    }
  }

  return chapters;
}

/**
 * Planos de leitura pré-definidos
 */
export async function getDefaultPlans(): Promise<Omit<ReadingPlan, "id" | "createdAt">[]> {
  const bibleYearChapters = await generatePlanChapters("bible-year");
  const newTestamentChapters = await generatePlanChapters("new-testament-90");
  const psalmsProverbsChapters = await generatePlanChapters("psalms-proverbs");
  const gospelsChapters = await generatePlanChapters("gospels-30");

  return [
    {
      name: "Bíblia em 1 Ano",
      description: "Leia a Bíblia completa em 365 dias",
      type: "daily",
      duration: 365,
      chapters: bibleYearChapters,
      badgeId: "bible-year",
    },
    {
      name: "Novo Testamento em 90 Dias",
      description: "Leia todo o Novo Testamento em 3 meses",
      type: "daily",
      duration: 90,
      chapters: newTestamentChapters,
      badgeId: "new-testament-90",
    },
    {
      name: "Salmos e Provérbios",
      description: "Leia um Salmo e um Provérbio por dia por 1 mês",
      type: "daily",
      duration: 31,
      chapters: psalmsProverbsChapters,
      badgeId: "psalms-proverbs",
    },
    {
      name: "Evangelhos em 30 Dias",
      description: "Leia os 4 evangelhos em um mês",
      type: "daily",
      duration: 30,
      chapters: gospelsChapters,
      badgeId: "gospels-30",
    },
  ];
}

/**
 * Inicia um plano de leitura para o usuário
 * Se o plano já foi iniciado, não reseta o progresso existente
 */
export async function startReadingPlan(
  userId: string,
  planId: string
): Promise<void> {
  try {
    const progressRef = doc(db, "users", userId, "readingPlans", planId);
    const existingProgress = await getDoc(progressRef);
    
    // Se já existe progresso, não reseta
    if (existingProgress.exists()) {
      return; // Plano já iniciado, mantém o progresso
    }
    
    // Se não existe, cria novo progresso
    await setDoc(progressRef, {
      planId,
      userId,
      currentDay: 1,
      completedChapters: [],
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error starting reading plan:", error);
    throw error;
  }
}

/**
 * Marca um capítulo como lido
 */
export async function markChapterAsRead(
  userId: string,
  planId: string,
  book: string,
  chapter: number
): Promise<void> {
  try {
    const progressRef = doc(db, "users", userId, "readingPlans", planId);
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      throw new Error("Reading plan not found");
    }

    const progress = progressDoc.data() as UserReadingProgress;
    const chapterKey = `${book}-${chapter}`;
    
    if (progress.completedChapters.includes(chapterKey)) {
      return; // Já está marcado como lido
    }

    const updatedChapters = [...progress.completedChapters, chapterKey];
    
    // Verificar se completou o plano
    const planDoc = await getDoc(doc(db, "readingPlans", planId));
    const plan = planDoc.data() as ReadingPlan;
    const totalChapters = plan.chapters.length;
    const isCompleted = updatedChapters.length >= totalChapters;

    // Calcular o dia atual baseado no capítulo marcado
    const chapterItem = plan.chapters.find(c => c.book === book && c.chapter === chapter);
    const newCurrentDay = chapterItem ? Math.max(progress.currentDay, chapterItem.day) : progress.currentDay;

    await updateDoc(progressRef, {
      completedChapters: updatedChapters,
      currentDay: newCurrentDay,
      ...(isCompleted && { completedAt: new Date().toISOString() }),
    });
  } catch (error) {
    console.error("Error marking chapter as read:", error);
    throw error;
  }
}

/**
 * Busca o progresso do usuário em um plano
 */
export async function getUserReadingProgress(
  userId: string,
  planId: string
): Promise<UserReadingProgress | null> {
  try {
    const progressDoc = await getDoc(doc(db, "users", userId, "readingPlans", planId));
    if (!progressDoc.exists()) {
      return null;
    }
    const data = progressDoc.data();
    return {
      id: progressDoc.id,
      planId: data.planId || planId,
      userId: data.userId || userId,
      currentDay: data.currentDay || 1,
      completedChapters: data.completedChapters || [],
      startedAt: data.startedAt || new Date().toISOString(),
      completedAt: data.completedAt,
    } as UserReadingProgress;
  } catch (error) {
    console.error("Error getting reading progress:", error);
    return null;
  }
}

/**
 * Busca todos os planos de leitura ativos do usuário
 */
export async function getUserActivePlans(userId: string): Promise<UserReadingProgress[]> {
  try {
    const plansQuery = query(
      collection(db, "users", userId, "readingPlans"),
      where("completedAt", "==", null)
    );
    const snapshot = await getDocs(plansQuery);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        planId: data.planId || docSnap.id,
        userId: data.userId || userId,
        currentDay: data.currentDay || 1,
        completedChapters: data.completedChapters || [],
        startedAt: data.startedAt || new Date().toISOString(),
        completedAt: data.completedAt,
      } as UserReadingProgress;
    });
  } catch (error) {
    console.error("Error getting active plans:", error);
    return [];
  }
}

/**
 * Busca todos os planos de leitura completados do usuário
 */
export async function getUserCompletedPlans(userId: string): Promise<UserReadingProgress[]> {
  try {
    const plansQuery = query(
      collection(db, "users", userId, "readingPlans"),
      where("completedAt", "!=", null)
    );
    const snapshot = await getDocs(plansQuery);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        planId: data.planId || docSnap.id,
        userId: data.userId || userId,
        currentDay: data.currentDay || 1,
        completedChapters: data.completedChapters || [],
        startedAt: data.startedAt || new Date().toISOString(),
        completedAt: data.completedAt,
      } as UserReadingProgress;
    });
  } catch (error) {
    console.error("Error getting completed plans:", error);
    return [];
  }
}

/**
 * Busca todos os planos de leitura disponíveis
 */
export async function getAllReadingPlans(): Promise<ReadingPlan[]> {
  try {
    const snapshot = await getDocs(collection(db, "readingPlans"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadingPlan));
  } catch (error) {
    console.error("Error getting all reading plans:", error);
    return [];
  }
}

/**
 * Marca automaticamente um capítulo como lido em todos os planos ativos que o contêm
 * Retorna os nomes dos planos que foram atualizados
 */
export async function autoMarkChapterAsRead(
  userId: string,
  book: string,
  chapter: number
): Promise<string[]> {
  try {
    const activePlans = await getUserActivePlans(userId);
    const updatedPlanNames: string[] = [];

    for (const userProgress of activePlans) {
      // Buscar o plano completo para verificar se contém este capítulo
      const planDoc = await getDoc(doc(db, "readingPlans", userProgress.planId));
      if (!planDoc.exists()) continue;

      const plan = planDoc.data() as ReadingPlan;
      const chapterKey = `${book}-${chapter}`;
      
      // Verificar se o capítulo está no plano
      const isInPlan = plan.chapters.some(
        c => c.book === book && c.chapter === chapter
      );

      if (!isInPlan) continue;

      // Verificar se já está marcado como lido
      if (userProgress.completedChapters.includes(chapterKey)) continue;

      // Marcar como lido
      try {
        await markChapterAsRead(userId, userProgress.planId, book, chapter);
        updatedPlanNames.push(plan.name);
      } catch (error) {
        console.error(`Error marking chapter in plan ${plan.name}:`, error);
      }
    }

    return updatedPlanNames;
  } catch (error) {
    console.error("Error auto-marking chapter as read:", error);
    return [];
  }
}

