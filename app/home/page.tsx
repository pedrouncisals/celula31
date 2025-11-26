"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/hooks/useRooms";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Room } from "@/types";
import Link from "next/link";
import { BookOpen, Plus, Users, Calendar, ArrowLeft, Search, Key } from "lucide-react";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { rooms, loading, error, mutate } = useRooms(user?.id || null);
  const [searchCode, setSearchCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundRoom, setFoundRoom] = useState<Room | null>(null);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    // SWR gerencia o carregamento e cache automaticamente
    // mutate() pode ser usado para recarregar quando necessário (ex: após criar sala)
  }, [user, authLoading, router]);

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

  // Mostrar erro se houver
  if (error) {
    console.error("Error loading rooms:", error);
    // Tentar recarregar
    mutate();
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

        {/* Busca por Código */}
        <div className="mb-6 card-premium p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Entrar em Sala Privada</h3>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Digite o código de convite para encontrar e entrar em uma sala privada
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => {
                setSearchCode(e.target.value.toUpperCase());
                setSearchError("");
                setFoundRoom(null);
              }}
              placeholder="Digite o código (ex: ABC123)"
              maxLength={6}
              className="flex-1 px-4 py-2 rounded-lg border font-mono text-center text-lg font-bold tracking-wider"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            />
            <button
              onClick={async () => {
                if (!searchCode || searchCode.length !== 6) {
                  setSearchError("O código deve ter 6 caracteres");
                  return;
                }
                setSearching(true);
                setSearchError("");
                try {
                  const roomsQuery = query(
                    collection(db, "rooms"),
                    where("inviteCode", "==", searchCode.toUpperCase()),
                    where("visibility", "==", "private")
                  );
                  const snapshot = await getDocs(roomsQuery);
                  if (snapshot.empty) {
                    setSearchError("Sala não encontrada. Verifique o código.");
                    setFoundRoom(null);
                  } else {
                    const roomData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Room;
                    setFoundRoom(roomData);
                  }
                } catch (error) {
                  console.error("Error searching room:", error);
                  setSearchError("Erro ao buscar sala");
                } finally {
                  setSearching(false);
                }
              }}
              disabled={searching || !searchCode || searchCode.length !== 6}
              className="btn-violet hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {searching ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {searchError && (
            <p className="text-sm mt-2" style={{ color: '#ef4444' }}>{searchError}</p>
          )}
          {foundRoom && (
            <div className="mt-4 p-4 rounded-lg border-2" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent-gold)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{foundRoom.title}</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{foundRoom.book}</p>
                </div>
                <Link
                  href={`/room/${foundRoom.id}?invite=${foundRoom.inviteCode}`}
                  className="btn-emerald hover-lift"
                >
                  Entrar
                </Link>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p className="text-sm" style={{ color: '#ef4444' }}>
              Erro ao carregar salas. <button onClick={() => mutate()} className="underline font-medium">Tentar novamente</button>
            </p>
          </div>
        )}

        {rooms.length === 0 && !loading ? (
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
