import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { startOfDay, differenceInDays, isSameDay } from "date-fns";

/**
 * Atualiza o streak do usuário baseado na última data de leitura
 * O streak aumenta se o usuário ler em dias consecutivos
 */
export async function updateUserStreak(userId: string): Promise<number> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error("User not found");
      return 0;
    }

    const userData = userDoc.data();
    const today = startOfDay(new Date());
    const lastReadDate = userData.lastReadDate 
      ? startOfDay(new Date(userData.lastReadDate))
      : null;
    const currentStreak = userData.streak || 0;

    let newStreak = currentStreak;

    if (!lastReadDate) {
      // Primeira leitura - inicia streak em 1
      newStreak = 1;
    } else {
      const daysDiff = differenceInDays(today, lastReadDate);
      
      if (isSameDay(today, lastReadDate)) {
        // Já leu hoje - mantém o streak
        newStreak = currentStreak;
      } else if (daysDiff === 1) {
        // Leu ontem - continua a sequência
        newStreak = currentStreak + 1;
      } else if (daysDiff > 1) {
        // Perdeu a sequência - reinicia em 1
        newStreak = 1;
      }
    }

    // Atualizar no Firestore
    await updateDoc(userRef, {
      streak: newStreak,
      lastReadDate: today.toISOString(),
    });

    return newStreak;
  } catch (error) {
    console.error("Error updating streak:", error);
    return 0;
  }
}

