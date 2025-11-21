"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Room, Summary } from "@/types";
import { calculateCurrentChapter, isChapterUnlocked } from "@/lib/utils";
import Link from "next/link";
import { BookOpen, ArrowLeft, Lock, Trash2, Share2, Copy, Check, CheckCircle } from "lucide-react";

export default function RoomPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && roomId) {
      loadRoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, roomId, router, searchParams]);

  // Recarregar capítulos lidos quando a página receber foco (usuário voltou de um capítulo)
  useEffect(() => {
    const handleFocus = () => {
      if (room && isMember && user) {
        loadReadChapters(room);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [room, isMember, user]);

  const loadRoom = async () => {
    if (!user) return;

    try {
      const roomDoc = await getDoc(doc(db, "rooms", roomId));
      if (!roomDoc.exists()) {
        router.push("/home");
        return;
      }

      const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
      setRoom(roomData);

      // Verificar se é membro
      const memberDoc = await getDoc(doc(db, "rooms", roomId, "members", user.id));
      const memberExists = memberDoc.exists();
      setIsMember(memberExists);

      // Verificar código de convite na URL
      const inviteCode = searchParams.get("invite");
      if (inviteCode && !memberExists && roomData.visibility === "private") {
        await handleInviteJoin(inviteCode, roomData);
      }

      // Carregar capítulos lidos (verificar resumos do usuário)
      if (memberExists) {
        await loadReadChapters(roomData);
      }
    } catch (error) {
      console.error("Error loading room:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReadChapters = async (roomData: Room) => {
    if (!user) return;

    try {
      const readSet = new Set<number>();
      
      // Para cada capítulo, verificar se o usuário tem resumo
      for (let chapterNum = 1; chapterNum <= roomData.totalChapters; chapterNum++) {
        if (!isChapterUnlocked(roomData.startDate, chapterNum)) continue;
        
        const summariesQuery = query(
          collection(db, "rooms", roomId, "summaries"),
          where("chapter", "==", chapterNum),
          where("authorId", "==", user.id)
        );
        const summariesSnapshot = await getDocs(summariesQuery);
        
        if (!summariesSnapshot.empty) {
          readSet.add(chapterNum);
        }
      }
      
      setReadChapters(readSet);
    } catch (error) {
      console.error("Error loading read chapters:", error);
    }
  };

  const handleInviteJoin = async (inviteCode: string, roomData: Room) => {
    if (!user) return;

    if (roomData.inviteCode !== inviteCode) {
      setInviteError("Código de convite inválido");
      return;
    }

    setJoining(true);
    setInviteError("");
    try {
      await setDoc(doc(db, "rooms", roomId, "members", user.id), {
        userId: user.id,
        joinedAt: new Date().toISOString(),
      });
      setIsMember(true);
      // Limpar parâmetro da URL
      router.replace(`/room/${roomId}`);
    } catch (error) {
      console.error("Error joining room via invite:", error);
      setInviteError("Erro ao entrar na sala");
    } finally {
      setJoining(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user) return;

    setJoining(true);
    try {
      await setDoc(doc(db, "rooms", roomId, "members", user.id), {
        userId: user.id,
        joinedAt: new Date().toISOString(),
      });
      setIsMember(true);
    } catch (error) {
      console.error("Error joining room:", error);
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!user || !room) return;
    
    if (room.adminId !== user.id) {
      alert("Apenas o administrador pode excluir a sala");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir esta sala? Esta ação não pode ser desfeita.")) {
      return;
    }

    setDeleting(true);
    try {
      // Excluir sala (Firestore vai excluir subcoleções automaticamente se configurado)
      await deleteDoc(doc(db, "rooms", roomId));
      router.push("/home");
    } catch (error) {
      console.error("Error deleting room:", error);
      alert("Erro ao excluir sala");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!room?.inviteCode) return;
    const inviteLink = `${window.location.origin}/room/${roomId}?invite=${room.inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Carregando...</div>
      </div>
    );
  }

  if (!room || !user) {
    return null;
  }

  const currentChapter = calculateCurrentChapter(room.startDate);
  const chapters = Array.from({ length: room.totalChapters }, (_, i) => i + 1);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 mb-4 hover-lift"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{room.title}</h1>
              <p style={{ color: 'var(--text-secondary)' }}>{room.book}</p>
            </div>
            <div className="flex items-center gap-2">
              {isMember && room.adminId === user.id && (
                <>
                      {room.visibility === "private" && (
                        <button
                          onClick={() => setShowInviteModal(true)}
                          className="flex items-center gap-2 btn-emerald hover-lift"
                        >
                          <Share2 className="w-4 h-4" />
                          Compartilhar
                        </button>
                      )}
                      <button
                        onClick={handleDeleteRoom}
                        disabled={deleting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all button-press hover-lift disabled:opacity-50"
                        style={{ background: '#ef4444', color: 'white' }}
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting ? "Excluindo..." : "Excluir Sala"}
                      </button>
                </>
              )}
              {!isMember && (
                <button
                  onClick={handleJoinRoom}
                  disabled={joining}
                  className="btn-violet transition-colors disabled:opacity-50"
                >
                  {joining ? "Entrando..." : "Entrar na Sala"}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {inviteError && (
          <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {inviteError}
          </div>
        )}
        {!isMember ? (
          <div className="text-center py-12">
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Você precisa entrar na sala para ver os capítulos</p>
            {room.visibility === "private" && (
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Esta é uma sala privada. Você precisa de um código de convite.</p>
            )}
                  <button
                    onClick={handleJoinRoom}
                    disabled={joining || room.visibility === "private"}
                    className="btn-violet hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining ? "Entrando..." : room.visibility === "private" ? "Use o link de convite" : "Entrar na Sala"}
                  </button>
          </div>
        ) : (
          <>
            <div className="mb-8 card-premium p-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Capítulos do Livro</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Estamos no <span className="font-bold text-lg" style={{ color: 'var(--accent-violet)' }}>Capítulo {currentChapter}</span> de {room.totalChapters}
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {chapters.map((chapterNum) => {
                const unlocked = isChapterUnlocked(room.startDate, chapterNum);
                const isToday = chapterNum === currentChapter;
                const isRead = readChapters.has(chapterNum);
                return (
                  <Link
                    key={chapterNum}
                    href={unlocked ? `/room/${roomId}/chapter/${chapterNum}` : "#"}
                    className={`relative p-4 rounded-xl border-2 transition-all text-center smooth-transition ${
                      unlocked
                        ? isToday
                          ? "hover-lift hover-glow cursor-pointer"
                          : "hover-lift cursor-pointer"
                        : "cursor-not-allowed opacity-50"
                    }`}
                    style={
                      unlocked
                        ? isToday
                          ? {
                              background: 'var(--bg-secondary)',
                              borderColor: 'var(--accent-violet)',
                              boxShadow: '0 0 0 2px rgba(169, 139, 255, 0.2)'
                            }
                          : isRead
                          ? {
                              background: 'var(--bg-secondary)',
                              borderColor: 'var(--accent-emerald)'
                            }
                          : {
                              background: 'var(--bg-card)',
                              borderColor: 'var(--border-medium)'
                            }
                        : {
                            background: 'var(--bg-tertiary)',
                            borderColor: 'var(--border-subtle)'
                          }
                    }
                  >
                    <div className="flex flex-col items-center gap-1">
                      {unlocked ? (
                        isRead ? (
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full" style={{ background: 'var(--accent-emerald)', opacity: 0.2 }} />
                            <CheckCircle className="w-5 h-5 relative z-10" style={{ color: 'var(--accent-emerald)' }} />
                          </div>
                        ) : (
                          <BookOpen className="w-5 h-5" style={{ color: isToday ? 'var(--accent-violet)' : 'var(--text-secondary)' }} />
                        )
                      ) : (
                        <Lock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                      )}
                      <span className="font-bold text-lg" style={{ color: isToday ? 'var(--accent-violet)' : isRead ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                        {chapterNum}
                      </span>
                    </div>
                    {isToday && (
                      <div className="absolute -top-1.5 -right-1.5 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold shadow-md" style={{ background: 'var(--accent-violet)' }}>
                        Hoje
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

          {/* Modal de Convite */}
          {showInviteModal && room?.inviteCode && (
            <div className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
              <div className="card-premium p-6 max-w-md w-full mx-4 animate-bounce-in shadow-2xl">
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Compartilhar Sala</h3>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Compartilhe este link para convidar pessoas para a sala:
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/room/${roomId}?invite=${room.inviteCode}`}
                className="flex-1 px-4 py-2 rounded-lg border"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
                  <button
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-2 btn-violet hover-lift"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Código de convite: <span className="font-mono font-bold" style={{ color: 'var(--accent-violet)' }}>{room.inviteCode}</span>
            </p>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full px-4 py-2 rounded-lg transition-all button-press hover-lift"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Fechar
                </button>
          </div>
        </div>
      )}
    </div>
  );
}

