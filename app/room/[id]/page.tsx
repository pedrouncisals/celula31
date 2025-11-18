"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Room } from "@/types";
import { calculateCurrentChapter, isChapterUnlocked } from "@/lib/utils";
import Link from "next/link";
import { BookOpen, ArrowLeft, Lock, Trash2, Share2, Copy, Check } from "lucide-react";

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
    } catch (error) {
      console.error("Error loading room:", error);
    } finally {
      setLoading(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!room || !user) {
    return null;
  }

  const currentChapter = calculateCurrentChapter(room.startDate);
  const chapters = Array.from({ length: room.totalChapters }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{room.title}</h1>
              <p className="text-gray-600">{room.book}</p>
            </div>
            <div className="flex items-center gap-2">
              {isMember && room.adminId === user.id && (
                <>
                      {room.visibility === "private" && (
                        <button
                          onClick={() => setShowInviteModal(true)}
                          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all button-press hover-lift shadow-md hover:shadow-lg"
                        >
                          <Share2 className="w-4 h-4" />
                          Compartilhar
                        </button>
                      )}
                      <button
                        onClick={handleDeleteRoom}
                        disabled={deleting}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all button-press hover-lift shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md disabled:hover:scale-100"
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
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {inviteError}
          </div>
        )}
        {!isMember ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Você precisa entrar na sala para ver os capítulos</p>
            {room.visibility === "private" && (
              <p className="text-sm text-gray-500 mb-4">Esta é uma sala privada. Você precisa de um código de convite.</p>
            )}
                  <button
                    onClick={handleJoinRoom}
                    disabled={joining || room.visibility === "private"}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all button-press hover-lift shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:hover:scale-100"
                  >
                    {joining ? "Entrando..." : room.visibility === "private" ? "Use o link de convite" : "Entrar na Sala"}
                  </button>
          </div>
        ) : (
          <>
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Capítulos do Livro</h2>
              <p className="text-gray-700">
                Estamos no <span className="font-bold text-blue-600 text-lg">Capítulo {currentChapter}</span> de {room.totalChapters}
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {chapters.map((chapterNum) => {
                const unlocked = isChapterUnlocked(room.startDate, chapterNum);
                const isToday = chapterNum === currentChapter;
                return (
                  <Link
                    key={chapterNum}
                    href={unlocked ? `/room/${roomId}/chapter/${chapterNum}` : "#"}
                    className={`relative p-4 rounded-xl border-2 transition-all text-center smooth-transition ${
                      unlocked
                        ? isToday
                          ? "bg-blue-50 border-blue-400 hover:border-blue-500 hover:shadow-lg cursor-pointer ring-2 ring-blue-200 hover-lift hover-glow"
                          : "bg-white border-blue-200 hover:border-blue-400 hover:shadow-md cursor-pointer hover-lift"
                        : "bg-gray-50 border-gray-200 cursor-not-allowed opacity-50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {unlocked ? (
                        <BookOpen className={`w-5 h-5 ${isToday ? "text-blue-600" : "text-gray-600"}`} />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                      )}
                      <span className={`font-bold text-lg ${isToday ? "text-blue-700" : "text-gray-900"}`}>
                        {chapterNum}
                      </span>
                    </div>
                    {isToday && (
                      <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold shadow-md">
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 animate-bounce-in shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Compartilhar Sala</h3>
            <p className="text-gray-600 mb-4">
              Compartilhe este link para convidar pessoas para a sala:
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/room/${roomId}?invite=${room.inviteCode}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
                  <button
                    onClick={handleCopyInviteLink}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all button-press hover-lift shadow-md hover:shadow-lg"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Código de convite: <span className="font-mono font-bold">{room.inviteCode}</span>
            </p>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all button-press"
                >
                  Fechar
                </button>
          </div>
        </div>
      )}
    </div>
  );
}

