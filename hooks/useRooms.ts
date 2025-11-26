import useSWR from 'swr';
import { collection, query, where, getDocs, collectionGroup, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Room } from '@/types';

async function fetchRooms(userId: string): Promise<Room[]> {
  const roomsList: Room[] = [];
  const roomIdsSet = new Set<string>();

  try {
    // 1. Buscar salas públicas (com paginação)
    // Precisa de índice composto: visibility (ASC) + startDate (DESC)
    const publicRoomsQuery = query(
      collection(db, "rooms"),
      where("visibility", "==", "public"),
      orderBy("startDate", "desc"),
      limit(50)
    );
    const publicSnapshot = await getDocs(publicRoomsQuery);
    publicSnapshot.forEach((doc) => {
      const room = { id: doc.id, ...doc.data() } as Room;
      roomsList.push(room);
      roomIdsSet.add(room.id);
    });
  } catch (error) {
    console.error("Error fetching public rooms:", error);
    // Continuar mesmo se houver erro nas públicas
  }

  try {
    // 2. Buscar salas privadas onde o usuário é membro usando collectionGroup
    const membersQuery = query(
      collectionGroup(db, "members"),
      where("userId", "==", userId)
    );
    const membersSnapshot = await getDocs(membersQuery);
    
    // Extrair roomIds dos paths dos documentos de forma mais robusta
    const privateRoomIds: string[] = [];
    membersSnapshot.forEach((memberDoc) => {
      const pathParts = memberDoc.ref.path.split("/");
      const roomsIndex = pathParts.indexOf("rooms");
      if (roomsIndex >= 0 && roomsIndex + 1 < pathParts.length) {
        const roomId = pathParts[roomsIndex + 1];
        if (roomId && !privateRoomIds.includes(roomId)) {
          privateRoomIds.push(roomId);
        }
      }
    });

    // 3. Buscar dados das salas privadas em paralelo
    if (privateRoomIds.length > 0) {
      const privateRoomPromises = privateRoomIds.map((roomId) =>
        getDoc(doc(db, "rooms", roomId)).catch((error) => {
          console.warn(`Room ${roomId} not found:`, error);
          return null;
        })
      );
      const privateRoomSnapshots = await Promise.all(privateRoomPromises);
      
      privateRoomSnapshots.forEach((roomDoc) => {
        if (roomDoc?.exists()) {
          const room = { id: roomDoc.id, ...roomDoc.data() } as Room;
          if (room.visibility === "private" && !roomIdsSet.has(room.id)) {
            roomsList.push(room);
            roomIdsSet.add(room.id);
          }
        }
      });
    }
  } catch (error) {
    console.error("Error fetching private rooms:", error);
    // Continuar mesmo se houver erro nas privadas
  }

  // Ordenar localmente por data (mais recente primeiro)
  roomsList.sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return dateB - dateA;
  });

  // Log para debug (pode remover depois)
  console.log(`[useRooms] Total de salas encontradas: ${roomsList.length}`, {
    publicas: roomsList.filter(r => r.visibility === 'public').length,
    privadas: roomsList.filter(r => r.visibility === 'private').length,
  });

  return roomsList;
}

export function useRooms(userId: string | null) {
  const { data, error, mutate, isLoading } = useSWR<Room[]>(
    userId ? `rooms-${userId}` : null,
    () => fetchRooms(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 segundos
      revalidateIfStale: true,
    }
  );

  return {
    rooms: data || [],
    loading: isLoading,
    error,
    mutate,
  };
}

