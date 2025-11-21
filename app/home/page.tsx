"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Room } from "@/types";
import Link from "next/link";
import { BookOpen, Plus, Users, Calendar, ArrowLeft } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-4 text-sm hover-lift"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Módulos
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Estudo Bíblico - Célula</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="flex items-center gap-2 hover-lift"
                style={{ color: 'var(--text-secondary)' }}
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
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Minhas Salas</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Salas públicas e privadas que você participa</p>
          </div>
          <Link
            href="/create-room"
            className="btn-emerald flex items-center gap-2 hover-lift"
          >
            <Plus className="w-5 h-5" />
            Criar Sala
          </Link>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-16 card-premium">
            <BookOpen className="w-20 h-20 mx-auto mb-6" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Nenhuma sala encontrada</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Crie sua primeira sala de estudo ou entre em uma sala privada</p>
            <Link
              href="/create-room"
              className="inline-flex items-center gap-2 btn-emerald hover-lift"
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
                className="group card-premium p-6 hover-lift hover-glow-emerald animate-fade-in"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold flex-1 pr-2 group-hover:gradient-text-emerald transition-all" style={{ color: 'var(--text-primary)' }}>
                    {room.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {room.visibility === "private" && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(232, 194, 122, 0.2)', color: 'var(--accent-gold)' }}>
                        Privada
                      </span>
                    )}
                    <div className="p-2 rounded-lg" style={{ background: 'var(--gradient-emerald)' }}>
                      <BookOpen className="w-4 h-4" style={{ color: 'var(--bg-primary)' }} />
                    </div>
                  </div>
                </div>
                <p className="font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>{room.book}</p>
                <div className="flex items-center gap-4 text-sm pt-4" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(room.startDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
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
