import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Room } from "@/types";

export async function getRoom(roomId: string): Promise<Room | null> {
  try {
    const roomDoc = await getDoc(doc(db, "rooms", roomId));
    if (roomDoc.exists()) {
      return { id: roomDoc.id, ...roomDoc.data() } as Room;
    }
    return null;
  } catch (error) {
    console.error("Error fetching room:", error);
    return null;
  }
}

export async function checkRoomMembership(roomId: string, userId: string): Promise<boolean> {
  try {
    const membersRef = collection(db, "rooms", roomId, "members");
    const q = query(membersRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking membership:", error);
    return false;
  }
}

