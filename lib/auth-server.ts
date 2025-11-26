import { cookies } from "next/headers";
import { auth } from "./firebase";
import { verifyIdToken } from "./firebase-admin";

export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    
    if (!token) {
      return null;
    }

    const decodedToken = await verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };
  } catch (error) {
    return null;
  }
}

