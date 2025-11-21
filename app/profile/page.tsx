"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Summary, Room } from "@/types";
import { getUserCompletedPlans, getUserActivePlans, getAllReadingPlans, type ReadingPlan, type UserReadingProgress } from "@/lib/reading-plans";
import Link from "next/link";
import { ArrowLeft, Edit2, Save, X, Award, Trophy, Star, Flame, BookOpen, Heart, Zap, Target, Crown, LogOut, Church, CheckCircle2, Users, Calendar, TrendingUp, MessageCircle, FileText, BookMarked } from "lucide-react";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser, signOut } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [church, setChurch] = useState("");
  const [favoriteVerse, setFavoriteVerse] = useState("");
  const [topSummaries, setTopSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chaptersCompleted, setChaptersCompleted] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalSummaries, setTotalSummaries] = useState(0);
  const [completedPlans, setCompletedPlans] = useState<ReadingPlan[]>([]);
  const [activePlans, setActivePlans] = useState<UserReadingProgress[]>([]);
  const [activePlansWithDetails, setActivePlansWithDetails] = useState<Array<{ progress: UserReadingProgress; plan: ReadingPlan }>>([]);
  const [roomsCount, setRoomsCount] = useState(0);
  const [totalComments, setTotalComments] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      setName(user.name);
      setBio(user.bio || "");
      setChurch(user.church || "");
      setFavoriteVerse(user.favoriteVerse || "");
      loadUserStats();
      loadCompletedPlans();
      loadActivePlans();
    }
  }, [user, authLoading, router]);

  const loadCompletedPlans = async () => {
    if (!user) return;

    try {
      const allPlans = await getAllReadingPlans();
      const completedProgress = await getUserCompletedPlans(user.id);
      
      // Buscar planos completados
      const completedPlansList: ReadingPlan[] = [];
      for (const progress of completedProgress) {
        const plan = allPlans.find(p => p.id === progress.planId);
        if (plan && !completedPlansList.find(p => p.id === plan.id)) {
          completedPlansList.push(plan);
        }
      }

      setCompletedPlans(completedPlansList);
    } catch (error) {
      console.error("Error loading completed plans:", error);
    }
  };

  const loadActivePlans = async () => {
    if (!user) return;

    try {
      const activeProgress = await getUserActivePlans(user.id);
      setActivePlans(activeProgress);
      
      // Carregar detalhes dos planos
      const allPlans = await getAllReadingPlans();
      const plansWithDetails = activeProgress.map(progress => {
        const plan = allPlans.find(p => p.id === progress.planId);
        return plan ? { progress, plan } : null;
      }).filter((item): item is { progress: UserReadingProgress; plan: ReadingPlan } => item !== null);
      
      setActivePlansWithDetails(plansWithDetails);
    } catch (error) {
      console.error("Error loading active plans:", error);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Buscar todas as salas
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const allSummaries: Summary[] = [];
      const chaptersSet = new Set<string>();
      let totalLikesCount = 0;
      let roomsParticipating = 0;
      let commentsCount = 0;

      // Para cada sala, buscar resumos do usuário
      for (const roomDoc of roomsSnapshot.docs) {
        const roomData = roomDoc.data() as Room;
        
        // Verificar se é membro
        const memberDoc = await getDoc(doc(db, "rooms", roomDoc.id, "members", user.id));
        if (!memberDoc.exists()) continue;
        
        roomsParticipating++;
        
        // Contar comentários do usuário
        const commentsQuery = query(
          collection(db, "rooms", roomDoc.id, "comments"),
          where("authorId", "==", user.id)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentsCount += commentsSnapshot.size;

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
      setRoomsCount(roomsParticipating);
      setTotalComments(commentsCount);
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
        church: church.trim(),
        favoriteVerse: favoriteVerse.trim(),
      });
      await refreshUser();
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Erro ao fazer logout. Tente novamente.");
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
      <header className="sticky top-0 z-10 backdrop-blur-md" style={{ background: 'rgba(22, 22, 35, 0.95)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-3 sm:mb-4 hover-lift touch-target px-2 -ml-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
            <span className="sm:hidden">Início</span>
          </Link>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Meu Perfil</h1>
            <div className="flex items-center gap-2">
              {!editing ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 sm:gap-2 transition-all button-press hover:scale-105 hover-lift btn-violet touch-target px-2 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 sm:gap-2 transition-all button-press hover:scale-105 hover-lift touch-target px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 sm:gap-2 btn-emerald hover-lift disabled:opacity-50 touch-target px-2 sm:px-4 py-2 text-xs sm:text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">Salvar</span>
                  </button>
                  <button
                    onClick={() => {
                    setEditing(false);
                    setName(user.name);
                    setBio(user.bio || "");
                    setChurch(user.church || "");
                    setFavoriteVerse(user.favoriteVerse || "");
                    }}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all button-press hover-lift touch-target text-xs sm:text-sm"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Card Principal do Perfil */}
        <div className="card-premium p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
            {user.photoUrl && (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full object-cover border-4 shadow-lg flex-shrink-0 mx-auto sm:mx-0"
                style={{ borderColor: 'var(--accent-violet)' }}
              />
            )}
            <div className="flex-1 w-full">
              {editing ? (
                <>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 w-full px-3 sm:px-4 py-2 rounded-lg border transition-all text-sm sm:text-base"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="Seu nome"
                  />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 rounded-lg border mb-2 sm:mb-3 transition-all text-sm sm:text-base"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="Escreva uma breve biografia..."
                  />
                  <div className="relative mb-2 sm:mb-3">
                    <Church className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={church}
                      onChange={(e) => setChurch(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 rounded-lg border transition-all text-sm sm:text-base"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="Nome da sua igreja"
                    />
                  </div>
                  <div className="relative">
                    <BookMarked className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={favoriteVerse}
                      onChange={(e) => setFavoriteVerse(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 rounded-lg border transition-all text-sm sm:text-base"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="Ex: João 3:16"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 text-center sm:text-left" style={{ color: 'var(--text-primary)' }}>{user.name}</h2>
                  {user.church && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <Church className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                      <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{user.church}</span>
                    </div>
                  )}
                  {user.favoriteVerse && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 sm:mb-3 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                      <BookMarked className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-violet)' }} />
                      <span className="text-xs sm:text-sm font-medium italic text-center sm:text-left" style={{ color: 'var(--accent-violet)' }}>
                        &quot;{user.favoriteVerse}&quot;
                      </span>
                    </div>
                  )}
                  <p className="text-sm sm:text-base leading-relaxed text-center sm:text-left" style={{ color: 'var(--text-secondary)' }}>
                    {user.bio || "Nenhuma biografia ainda. Clique em 'Editar' para adicionar uma."}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 pt-4 sm:pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="text-center p-2 sm:p-4 rounded-lg hover-lift card-premium">
              <Flame className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" style={{ color: 'var(--accent-gold)' }} />
              <p className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{user.streak}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Dias de Sequência</p>
            </div>
            <div className="text-center p-2 sm:p-4 rounded-lg hover-lift card-premium">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 animate-pulse" style={{ color: 'var(--accent-violet)' }} />
              <p className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--accent-violet)' }}>{chaptersCompleted}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Capítulos Lidos</p>
            </div>
            <div className="text-center p-2 sm:p-4 rounded-lg hover-lift card-premium">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 animate-pulse" style={{ color: '#ef4444' }} />
              <p className="text-xl sm:text-3xl font-bold" style={{ color: '#ef4444' }}>{totalLikes}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Curtidas</p>
            </div>
            <div className="text-center p-2 sm:p-4 rounded-lg hover-lift card-premium">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" style={{ color: 'var(--accent-emerald)' }} />
              <p className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--accent-emerald)' }}>{roomsCount}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Salas</p>
            </div>
            <div className="text-center p-2 sm:p-4 rounded-lg hover-lift card-premium">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" style={{ color: 'var(--accent-blue)' }} />
              <p className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--accent-blue)' }}>{totalSummaries}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Resumos</p>
            </div>
            <div className="text-center p-2 sm:p-4 rounded-lg hover-lift card-premium">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" style={{ color: 'var(--accent-violet)' }} />
              <p className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--accent-violet)' }}>{totalComments}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Comentários</p>
            </div>
            <div className="text-center p-2 sm:p-4 rounded-lg hover-lift card-premium">
              <Target className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" style={{ color: 'var(--accent-gold)' }} />
              <p className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{activePlans.length}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Planos Ativos</p>
            </div>
            <div className="text-center p-2 sm:p-4 rounded-lg hover-lift card-premium">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2" style={{ color: 'var(--accent-gold)' }} />
              <p className="text-xl sm:text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{completedPlans.length}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Planos Completos</p>
            </div>
          </div>
        </div>

        {/* Planos de Leitura Ativos */}
        {activePlansWithDetails.length > 0 && (
          <div className="card-premium p-4 sm:p-6 mb-4 sm:mb-6 animate-fade-in">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--accent-emerald)' }} />
              Planos de Leitura Ativos
            </h3>
            <div className="space-y-3">
              {activePlansWithDetails.map(({ progress, plan }) => {
                const progressPercent = plan.chapters.length > 0 
                  ? Math.round((progress.completedChapters.length / plan.chapters.length) * 100)
                  : 0;
                
                return (
                  <Link
                    key={progress.planId}
                    href={`/reading-plans/${progress.planId}`}
                    className="block p-4 rounded-lg hover-lift card-premium"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.name}</h4>
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-emerald)' }}>
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-tertiary)' }}>
                      <div 
                        className="h-full transition-all duration-300 rounded-full"
                        style={{ 
                          width: `${progressPercent}%`,
                          background: 'var(--gradient-emerald)'
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Dia {progress.currentDay} de {plan.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{progress.completedChapters.length} de {plan.chapters.length} capítulos</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Badges e Conquistas */}
        <div className="card-premium p-6 mb-6 animate-fade-in">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Award className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
            Conquistas e Badges
          </h3>
          
          {/* Badges de Planos de Leitura */}
          {completedPlans.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Trophy className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                Planos de Leitura Completados
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {completedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col items-center p-4 rounded-lg transform transition-all hover:scale-110 hover-lift animate-fade-in card-premium"
                    style={{ border: '2px solid var(--accent-gold)' }}
                  >
                    <Trophy className="w-8 h-8 mb-2" style={{ color: 'var(--accent-gold)' }} />
                    <span className="text-xs font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
                      {plan.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Badges Gerais */}
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Star className="w-5 h-5" style={{ color: 'var(--accent-violet)' }} />
              Badges Gerais
            </h4>
            {(() => {
              const badges = [
                user.streak >= 1 && { icon: Flame, label: "Iniciante", color: "var(--accent-emerald)", size: "w-6 h-6" },
                user.streak >= 7 && { icon: Trophy, label: "Semana Fiel", color: "var(--accent-gold)", size: "w-8 h-8" },
                user.streak >= 30 && { icon: Star, label: "Mês Consistente", color: "var(--accent-violet)", size: "w-8 h-8" },
                totalSummaries >= 10 && { icon: Zap, label: "10 Resumos", color: "var(--accent-blue)", size: "w-8 h-8" },
                totalSummaries >= 50 && { icon: Target, label: "50 Resumos", color: "var(--accent-violet)", size: "w-8 h-8" },
                totalLikes >= 100 && { icon: Crown, label: "100 Curtidas", color: "var(--accent-gold)", size: "w-8 h-8" },
                chaptersCompleted >= 10 && { icon: BookOpen, label: "10 Capítulos", color: "var(--accent-emerald)", size: "w-8 h-8" },
                chaptersCompleted >= 50 && { icon: BookOpen, label: "50 Capítulos", color: "var(--accent-violet)", size: "w-8 h-8" },
                chaptersCompleted >= 100 && { icon: Crown, label: "100 Capítulos", color: "var(--accent-gold)", size: "w-8 h-8" },
              ].filter(Boolean) as Array<{ icon: any; label: string; color: string; size: string }>;
              
              if (badges.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Award className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Continue estudando para desbloquear badges!
                    </p>
                  </div>
                );
              }
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {badges.map((badge, index) => {
                    const Icon = badge.icon;
                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center p-4 rounded-lg transform transition-all hover:scale-110 hover-lift animate-fade-in card-premium"
                        style={{ border: `2px solid ${badge.color}` }}
                      >
                        <Icon className={`${badge.size} mb-2`} style={{ color: badge.color }} />
                        <span className="text-xs font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Resumos Mais Curtidos */}
        <div className="card-premium p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Heart className="w-5 h-5" style={{ color: '#ef4444' }} />
              Resumos Mais Curtidos
            </h3>
            {topSummaries.length > 0 && (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Top {topSummaries.length}
              </span>
            )}
          </div>
          {topSummaries.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="text-base mb-2" style={{ color: 'var(--text-secondary)' }}>
                Você ainda não tem resumos com curtidas.
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Compartilhe seus insights e ganhe curtidas da comunidade!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topSummaries.map((summary, index) => (
                <div 
                  key={summary.id} 
                  className="p-4 rounded-lg card-premium hover-lift relative overflow-hidden"
                >
                  {index === 0 && (
                    <div className="absolute top-2 right-2">
                      <Crown className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                    </div>
                  )}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ 
                        background: index === 0 ? 'var(--gradient-gold)' : 'var(--bg-tertiary)',
                        color: index === 0 ? 'var(--bg-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {summary.title || "Sem título"}
                      </p>
                      <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {summary.summary}
                      </p>
                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" style={{ color: '#ef4444' }} />
                          <span>{summary.likes} curtidas</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>Capítulo {summary.chapter}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
