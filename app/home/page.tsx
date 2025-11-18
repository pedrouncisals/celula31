"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Room } from "@/types";
import Link from "next/link";
import { BookOpen, Plus, Users, Calendar } from "lucide-react";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadRooms();
    }
  }, [user, authLoading, router]);

  const loadRooms = async () => {
    if (!user) return;

    try {
      const roomsList: Room[] = [];

      // 1. Buscar salas públicas
      const publicRoomsQuery = query(
        collection(db, "rooms"),
        where("visibility", "==", "public")
      );
      const publicSnapshot = await getDocs(publicRoomsQuery);
      publicSnapshot.forEach((doc) => {
        roomsList.push({ id: doc.id, ...doc.data() } as Room);
      });

      // 2. Buscar salas privadas onde o usuário é membro
      const allRoomsQuery = query(collection(db, "rooms"));
      const allRoomsSnapshot = await getDocs(allRoomsQuery);
      
      for (const roomDoc of allRoomsSnapshot.docs) {
        const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
        
        // Se for privada, verificar se o usuário é membro
        if (roomData.visibility === "private") {
          const memberDoc = await getDoc(doc(db, "rooms", roomDoc.id, "members", user.id));
          if (memberDoc.exists()) {
            // Evitar duplicatas
            if (!roomsList.find((r) => r.id === roomDoc.id)) {
              roomsList.push(roomData);
            }
          }
        }
      }

      // Ordenar localmente por data (mais recente primeiro)
      roomsList.sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateB - dateA;
      });

      setRooms(roomsList);
    } catch (error) {
      console.error("Error loading rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            ← Voltar aos Módulos
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Estudo Bíblico - Célula</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                {user.photoUrl && (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Minhas Salas</h2>
            <p className="text-gray-600 text-sm">Salas públicas e privadas que você participa</p>
          </div>
          <Link
            href="/create-room"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Criar Sala
          </Link>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma sala encontrada</h3>
            <p className="text-gray-600 mb-6">Crie sua primeira sala de estudo ou entre em uma sala privada</p>
            <Link
              href="/create-room"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Criar Primeira Sala
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
                  <Link
                    key={room.id}
                    href={`/room/${room.id}`}
                    className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 hover-lift animate-fade-in"
                  >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex-1 pr-2">
                    {room.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {room.visibility === "private" && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                        Privada
                      </span>
                    )}
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-gray-700 font-medium mb-4">{room.book}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{new Date(room.startDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{room.totalChapters} cap.</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

