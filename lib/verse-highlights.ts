import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface VerseHighlight {
  id: string;
  userId: string;
  roomId: string;
  book: string;
  chapter: number;
  verse: number;
  color: "yellow" | "green" | "blue" | "pink" | "purple";
  createdAt: string;
}

/**
 * Salva um highlight de versículo
 */
export async function saveVerseHighlight(
  userId: string,
  roomId: string,
  book: string,
  chapter: number,
  verse: number,
  color: VerseHighlight["color"] = "yellow"
): Promise<void> {
  try {
    const highlightId = `${userId}_${roomId}_${book}_${chapter}_${verse}`;
    const highlightRef = doc(db, "verseHighlights", highlightId);
    
    await setDoc(highlightRef, {
      userId,
      roomId,
      book,
      chapter,
      verse,
      color,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving verse highlight:", error);
    throw error;
  }
}

/**
 * Remove um highlight de versículo
 */
export async function removeVerseHighlight(
  userId: string,
  roomId: string,
  book: string,
  chapter: number,
  verse: number
): Promise<void> {
  try {
    const highlightId = `${userId}_${roomId}_${book}_${chapter}_${verse}`;
    const highlightRef = doc(db, "verseHighlights", highlightId);
    await deleteDoc(highlightRef);
  } catch (error) {
    console.error("Error removing verse highlight:", error);
    throw error;
  }
}

/**
 * Busca todos os highlights de um capítulo para um usuário
 */
export async function getChapterHighlights(
  userId: string,
  roomId: string,
  book: string,
  chapter: number
): Promise<Map<number, VerseHighlight["color"]>> {
  try {
    const highlightsQuery = query(
      collection(db, "verseHighlights"),
      where("userId", "==", userId),
      where("roomId", "==", roomId),
      where("book", "==", book),
      where("chapter", "==", chapter)
    );

    const snapshot = await getDocs(highlightsQuery);
    const highlightsMap = new Map<number, VerseHighlight["color"]>();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      highlightsMap.set(data.verse, data.color);
    });

    return highlightsMap;
  } catch (error) {
    console.error("Error getting chapter highlights:", error);
    return new Map();
  }
}

