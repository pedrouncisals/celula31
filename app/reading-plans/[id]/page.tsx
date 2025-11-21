"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUserReadingProgress, markChapterAsRead, type ReadingPlan, type UserReadingProgress } from "@/lib/reading-plans";
import { getBibleChapter } from "@/lib/bible";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle, Circle, Calendar, Trophy, Target, ChevronRight, ChevronLeft } from "lucide-react";

export default function ReadingPlanDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [progress, setProgress] = useState<UserReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(1);
  const [markingChapter, setMarkingChapter] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && planId) {
      loadPlan();
    }
  }, [user, authLoading, planId, router]);

  const loadPlan = async () => {
    if (!user) return;

    try {
      // Carregar plano
      const planDoc = await getDoc(doc(db, "readingPlans", planId));
      if (!planDoc.exists()) {
        router.push("/reading-plans");
        return;
      }

      const planData = { id: planDoc.id, ...planDoc.data() } as ReadingPlan;
      setPlan(planData);

      // Carregar progresso
      const userProgress = await getUserReadingProgress(user.id, planId);
      if (userProgress) {
        setProgress(userProgress);
        setCurrentDay(userProgress.currentDay);
      } else {
        router.push("/reading-plans");
      }
    } catch (error) {
      console.error("Error loading plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const getChaptersForDay = (day: number) => {
    if (!plan) return [];
    return plan.chapters.filter(c => c.day === day);
  };

  const isChapterCompleted = (book: string, chapter: number): boolean => {
    if (!progress) return false;
    const chapterKey = `${book}-${chapter}`;
    return progress.completedChapters.includes(chapterKey);
  };

  const handleMarkAsRead = async (book: string, chapter: number) => {
    if (!user || !plan) return;

    const chapterKey = `${book}-${chapter}`;
    setMarkingChapter(chapterKey);

    try {
      await markChapterAsRead(user.id, planId, book, chapter);
      await loadPlan(); // Recarregar progresso
    } catch (error) {
      console.error("Error marking chapter as read:", error);
      alert("Erro ao marcar capítulo como lido. Tente novamente.");
    } finally {
      setMarkingChapter(null);
    }
  };

  const getProgressPercentage = (): number => {
    if (!plan || !progress) return 0;
    const total = plan.chapters.length;
    const completed = progress.completedChapters.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getTotalDays = (): number => {
    if (!plan) return 0;
    return Math.max(...plan.chapters.map(c => c.day), 0);
  };

  const goToDay = (day: number) => {
    const maxDay = getTotalDays();
    if (day >= 1 && day <= maxDay) {
      setCurrentDay(day);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Carregando...</div>
      </div>
    );
  }

  if (!plan || !progress || !user) {
    return null;
  }

  const todayChapters = getChaptersForDay(currentDay);
  const progressPercent = getProgressPercentage();
  const totalDays = getTotalDays();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/reading-plans"
            className="inline-flex items-center gap-2 mb-4 hover-lift"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar aos Planos
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{plan.name}</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>
            </div>
            {plan.badgeId && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--gradient-gold)' }}>
                <Trophy className="w-6 h-6" style={{ color: 'var(--bg-primary)' }} />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progresso Geral */}
        <div className="card-premium p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Progresso Geral</h2>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-emerald)' }}>{progressPercent}%</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden mb-4" style={{ background: 'var(--bg-tertiary)' }}>
            <div 
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${progressPercent}%`,
                background: 'var(--gradient-emerald)'
              }}
            />
          </div>
          <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span>{progress.completedChapters.length} de {plan.chapters.length} capítulos concluídos</span>
            <span>Dia {progress.currentDay} de {totalDays}</span>
          </div>
        </div>

        {/* Navegação de Dias */}
        <div className="card-premium p-4 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Dia {currentDay}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToDay(currentDay - 1)}
                disabled={currentDay <= 1}
                className="p-2 rounded-lg hover-lift touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <input
                type="number"
                min={1}
                max={totalDays}
                value={currentDay}
                onChange={(e) => goToDay(parseInt(e.target.value) || 1)}
                className="w-16 sm:w-20 px-2 sm:px-3 py-2 rounded-lg text-center border text-sm sm:text-base touch-target"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
              <span className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>de {totalDays}</span>
              <button
                onClick={() => goToDay(currentDay + 1)}
                disabled={currentDay >= totalDays}
                className="p-2 rounded-lg hover-lift touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>
          
          {/* Lista de Dias com Checks */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Todos os Dias</h4>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-48 overflow-y-auto">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const dayChapters = plan.chapters.filter(c => c.day === day);
                const allCompleted = dayChapters.every(c => 
                  isChapterCompleted(c.book, c.chapter)
                );
                const someCompleted = dayChapters.some(c => 
                  isChapterCompleted(c.book, c.chapter)
                );
                
                return (
                  <button
                    key={day}
                    onClick={() => goToDay(day)}
                    className={`p-2 sm:p-3 rounded-lg transition-all hover-lift touch-target text-xs sm:text-sm font-medium relative ${
                      currentDay === day ? 'ring-2' : ''
                    }`}
                    style={{
                      background: allCompleted 
                        ? 'var(--bg-secondary)' 
                        : someCompleted 
                        ? 'var(--bg-tertiary)' 
                        : 'var(--bg-tertiary)',
                      border: `2px solid ${
                        currentDay === day 
                          ? 'var(--accent-violet)' 
                          : allCompleted 
                          ? 'var(--accent-emerald)' 
                          : 'var(--border-subtle)'
                      }`,
                      color: currentDay === day 
                        ? 'var(--accent-violet)' 
                        : allCompleted 
                        ? 'var(--accent-emerald)' 
                        : 'var(--text-secondary)',
                      boxShadow: currentDay === day ? '0 0 0 2px rgba(169, 139, 255, 0.2)' : 'none'
                    }}
                    title={`Dia ${day}${allCompleted ? ' - Concluído' : someCompleted ? ' - Em progresso' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {allCompleted ? (
                        <div className="relative flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full" style={{ background: 'var(--accent-emerald)', opacity: 0.2 }} />
                          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" style={{ color: 'var(--accent-emerald)' }} />
                        </div>
                      ) : someCompleted ? (
                        <Circle className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--accent-gold)' }} />
                      ) : day <= progress.currentDay ? (
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-secondary)' }} />
                      ) : (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2" style={{ borderColor: 'var(--text-muted)', opacity: 0.4 }} />
                        </div>
                      )}
                      <span className="font-semibold">{day}</span>
                    </div>
                    {currentDay === day && (
                      <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent-violet)', color: 'white' }}>
                        Hoje
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Capítulos do Dia */}
        <div className="card-premium p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Calendar className="w-5 h-5" style={{ color: 'var(--accent-violet)' }} />
            Capítulos para hoje
          </h3>

          {todayChapters.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Nenhum capítulo para este dia
            </p>
          ) : (
            <div className="space-y-3">
              {todayChapters.map((chapterItem, index) => {
                const isCompleted = isChapterCompleted(chapterItem.book, chapterItem.chapter);
                const chapterKey = `${chapterItem.book}-${chapterItem.chapter}`;
                const isMarking = markingChapter === chapterKey;

                return (
                  <div
                    key={index}
                    className="p-4 rounded-lg hover-lift transition-all"
                    style={{
                      background: isCompleted ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      border: `1px solid ${isCompleted ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                      borderLeft: isCompleted ? '4px solid var(--accent-emerald)' : 'none'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                        ) : (
                          <Circle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {chapterItem.book} - Capítulo {chapterItem.chapter}
                          </h4>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Dia {chapterItem.day} do plano
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/bible?book=${encodeURIComponent(chapterItem.book)}&chapter=${chapterItem.chapter}`}
                          className="btn-violet hover-lift text-xs sm:text-sm px-3 sm:px-4 touch-target"
                        >
                          <BookOpen className="w-4 h-4 inline mr-1" />
                          <span className="hidden sm:inline">Ler</span>
                        </Link>
                        <button
                          onClick={() => handleMarkAsRead(chapterItem.book, chapterItem.chapter)}
                          disabled={isMarking || isCompleted}
                          className={`hover-lift text-xs sm:text-sm px-3 sm:px-4 touch-target disabled:opacity-50 ${
                            isCompleted ? 'btn-emerald' : 'btn-emerald'
                          }`}
                          style={isCompleted ? {} : {}}
                        >
                          {isMarking ? (
                            "Marcando..."
                          ) : isCompleted ? (
                            <>
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              <span className="hidden sm:inline">Concluído</span>
                              <span className="sm:hidden">✓</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4 inline mr-1" />
                              <span className="hidden sm:inline">Marcar</span>
                              <span className="sm:hidden">Marcar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="card-premium p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-emerald)' }}>
              {progress.completedChapters.length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Capítulos Lidos</div>
          </div>
          <div className="card-premium p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-violet)' }}>
              {plan.chapters.length - progress.completedChapters.length}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Capítulos Restantes</div>
          </div>
          <div className="card-premium p-4 text-center">
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>
              {totalDays - progress.currentDay}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dias Restantes</div>
          </div>
        </div>
      </main>
    </div>
  );
}

