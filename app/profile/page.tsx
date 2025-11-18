"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Summary, Room } from "@/types";
import Link from "next/link";
import { ArrowLeft, Edit2, Save, X, Award, Trophy, Star, Flame, BookOpen, Heart, Zap, Target, Crown } from "lucide-react";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [topSummaries, setTopSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chaptersCompleted, setChaptersCompleted] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalSummaries, setTotalSummaries] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      setName(user.name);
      setBio(user.bio || "");
      loadUserStats();
    }
  }, [user, authLoading, router]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Buscar todas as salas
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const allSummaries: Summary[] = [];
      const chaptersSet = new Set<string>();
      let totalLikesCount = 0;

      // Para cada sala, buscar resumos do usuário
      for (const roomDoc of roomsSnapshot.docs) {
        const roomData = roomDoc.data() as Room;
        
        // Verificar se é membro
        const memberDoc = await getDoc(doc(db, "rooms", roomDoc.id, "members", user.id));
        if (!memberDoc.exists()) continue;

        // Buscar resumos do usuário nesta sala
        const summariesQuery = query(
          collection(db, "rooms", roomDoc.id, "summaries"),
          where("authorId", "==", user.id)
        );
        const summariesSnapshot = await getDocs(summariesQuery);

        summariesSnapshot.forEach((summaryDoc) => {
          const summaryData = summaryDoc.data();
          const summary: Summary = {
            id: summaryDoc.id,
            ...summaryData,
            verseBlock: summaryData.verseBlock || 1,
            startVerse: summaryData.startVerse || 1,
            endVerse: summaryData.endVerse || 10,
          } as Summary;

          allSummaries.push(summary);
          
          // Contar capítulos únicos
          chaptersSet.add(`${roomDoc.id}-${summary.chapter}`);
          
          // Somar curtidas
          totalLikesCount += summary.likes || 0;
        });
      }

      // Ordenar por likes e pegar top 5
      allSummaries.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      setTopSummaries(allSummaries.slice(0, 5));
      setChaptersCompleted(chaptersSet.size);
      setTotalLikes(totalLikesCount);
      setTotalSummaries(allSummaries.length);
    } catch (error) {
      console.error("Error loading user stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        name: name.trim(),
        bio: bio.trim(),
      });
      await refreshUser();
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-all button-press hover:scale-105"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all button-press hover-lift shadow-md hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md disabled:hover:scale-100"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setName(user.name);
                    setBio(user.bio || "");
                  }}
                  className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all button-press"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 animate-fade-in">
          <div className="flex items-start gap-6 mb-6">
            {user.photoUrl && (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              {editing ? (
                <>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-2xl font-bold text-gray-900 mb-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="text-gray-600 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Escreva uma breve biografia..."
                  />
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{user.name}</h2>
                  <p className="text-gray-600">{user.bio || "Nenhuma biografia ainda."}</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
              <Flame className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-orange-600">{user.streak}</p>
              <p className="text-sm text-gray-700 font-medium">Dias de Sequência</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 transform transition-all hover:scale-105 hover:shadow-lg">
              <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-pulse" />
              <p className="text-3xl font-bold text-blue-600">{chaptersCompleted}</p>
              <p className="text-sm text-gray-700 font-medium">Capítulos Concluídos</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200 transform transition-all hover:scale-105 hover:shadow-lg">
              <Heart className="w-8 h-8 text-pink-600 mx-auto mb-2 animate-pulse" />
              <p className="text-3xl font-bold text-pink-600">{totalLikes}</p>
              <p className="text-sm text-gray-700 font-medium">Total de Curtidas</p>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              Conquistas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {user.streak >= 1 && (
                <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border-2 border-green-300 transform transition-all hover:scale-110 hover:shadow-md animate-fade-in">
                  <Flame className="w-6 h-6 text-green-600 mb-1" />
                  <span className="text-xs font-semibold text-green-800">Iniciante</span>
                </div>
              )}
              {user.streak >= 7 && (
                <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-300 transform transition-all hover:scale-110 hover:shadow-md animate-fade-in">
                  <Trophy className="w-8 h-8 text-yellow-600 mb-1" />
                  <span className="text-xs font-semibold text-yellow-800">Semana Fiel</span>
                </div>
              )}
              {user.streak >= 30 && (
                <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-300 transform transition-all hover:scale-110 hover:shadow-md animate-fade-in">
                  <Star className="w-8 h-8 text-purple-600 mb-1" />
                  <span className="text-xs font-semibold text-purple-800">Mês Consistente</span>
                </div>
              )}
              {totalSummaries >= 10 && (
                <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-300 transform transition-all hover:scale-110 hover:shadow-md animate-fade-in">
                  <Zap className="w-8 h-8 text-blue-600 mb-1" />
                  <span className="text-xs font-semibold text-blue-800">10 Resumos</span>
                </div>
              )}
              {totalSummaries >= 50 && (
                <div className="flex flex-col items-center p-3 bg-indigo-50 rounded-lg border-2 border-indigo-300 transform transition-all hover:scale-110 hover:shadow-md animate-fade-in">
                  <Target className="w-8 h-8 text-indigo-600 mb-1" />
                  <span className="text-xs font-semibold text-indigo-800">50 Resumos</span>
                </div>
              )}
              {totalLikes >= 100 && (
                <div className="flex flex-col items-center p-3 bg-rose-50 rounded-lg border-2 border-rose-300 transform transition-all hover:scale-110 hover:shadow-md animate-fade-in">
                  <Crown className="w-8 h-8 text-rose-600 mb-1" />
                  <span className="text-xs font-semibold text-rose-800">100 Curtidas</span>
                </div>
              )}
              {chaptersCompleted >= 10 && (
                <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-lg border-2 border-emerald-300 transform transition-all hover:scale-110 hover:shadow-md animate-fade-in">
                  <BookOpen className="w-8 h-8 text-emerald-600 mb-1" />
                  <span className="text-xs font-semibold text-emerald-800">10 Capítulos</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-fade-in">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Resumos Mais Curtidos</h3>
          {topSummaries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Você ainda não tem resumos com curtidas.
            </p>
          ) : (
            <div className="space-y-4">
              {topSummaries.map((summary) => (
                <div key={summary.id} className="p-4 border border-gray-200 rounded-lg">
                  <p className="font-semibold text-gray-900 mb-2">{summary.title || "Sem título"}</p>
                  <p className="text-gray-700 mb-2">{summary.summary}</p>
                  <p className="text-sm text-gray-500">
                    {summary.likes} curtidas • Capítulo {summary.chapter}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

