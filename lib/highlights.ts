import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { calculateCurrentChapter } from "./utils";

/**
 * Calcula e atualiza os destaques do capítulo anterior
 * Deve ser executado diariamente (via cron job ou Cloud Function)
 */
export async function updateHighlightsForPreviousChapter(roomId: string, roomStartDate: string) {
  try {
    const currentChapter = calculateCurrentChapter(roomStartDate);
    const previousChapter = currentChapter - 1;

    if (previousChapter < 1) {
      return; // Não há capítulo anterior
    }

    // Buscar resumos do capítulo anterior
    const summariesQuery = query(
      collection(db, "rooms", roomId, "summaries"),
      where("chapter", "==", previousChapter)
    );

    const snapshot = await getDocs(summariesQuery);
    const summariesList: Array<{ id: string; likes: number; createdAt: string }> = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      summariesList.push({
        id: docSnap.id,
        likes: data.likes || 0,
        createdAt: data.createdAt || "",
      });
    });

    // Ordenar localmente: primeiro por likes (desc), depois por createdAt (asc)
    summariesList.sort((a, b) => {
      if (b.likes !== a.likes) {
        return b.likes - a.likes; // Mais curtidas primeiro
      }
      // Em caso de empate, mais antigo primeiro
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Pegar os top 3
    const highlights = summariesList.slice(0, 3).map((s) => s.id);

    // Salvar os destaques no documento do capítulo
    const chapterDocRef = doc(db, "rooms", roomId, "chapters", previousChapter.toString());
    await setDoc(chapterDocRef, {
      unlockedAt: new Date(roomStartDate).toISOString(),
      highlights,
    }, { merge: true });

    return highlights;
  } catch (error) {
    console.error("Error updating highlights:", error);
    throw error;
  }
}

/**
 * Busca os destaques de um capítulo
 */
export async function getChapterHighlights(
  roomId: string,
  chapterNumber: number
): Promise<string[]> {
  try {
    const chapterDoc = await getDoc(doc(db, "rooms", roomId, "chapters", chapterNumber.toString()));
    if (chapterDoc.exists()) {
      return chapterDoc.data().highlights || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting highlights:", error);
    return [];
  }
}

