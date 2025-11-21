"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDefaultPlans, startReadingPlan, getUserActivePlans, getUserReadingProgress, type ReadingPlan, type UserReadingProgress } from "@/lib/reading-plans";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, CheckCircle, Circle, Trophy, Target, Clock, TrendingUp } from "lucide-react";

export default function ReadingPlansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [availablePlans, setAvailablePlans] = useState<ReadingPlan[]>([]);
  const [activePlans, setActivePlans] = useState<UserReadingProgress[]>([]);
  const [startedPlanIds, setStartedPlanIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadPlans();
    }
  }, [user, authLoading, router]);

  const loadPlans = async () => {
    if (!user) return;

    try {
      // Carregar planos disponíveis do Firestore
      const plansSnapshot = await getDocs(collection(db, "readingPlans"));
      const plansMap = new Map<string, ReadingPlan>();

      // Usar Map para evitar duplicatas por nome
      plansSnapshot.forEach((docSnap) => {
        const planData = {
          id: docSnap.id,
          ...docSnap.data(),
        } as ReadingPlan;
        
        // Se já existe um plano com o mesmo nome, manter apenas o primeiro (mais antigo)
        if (!plansMap.has(planData.name)) {
          plansMap.set(planData.name, planData);
        } else {
          // Se já existe, manter o que tem createdAt mais antigo
          const existing = plansMap.get(planData.name)!;
          if (planData.createdAt && existing.createdAt) {
            if (new Date(planData.createdAt) < new Date(existing.createdAt)) {
              plansMap.set(planData.name, planData);
            }
          }
        }
      });

      const plansList = Array.from(plansMap.values());

      // Se não houver planos, criar os padrões
      if (plansList.length === 0) {
        const defaultPlans = await getDefaultPlans();
        for (const planData of defaultPlans) {
          // Verificar se já existe um plano com o mesmo nome antes de criar
          const existingPlan = plansList.find(p => p.name === planData.name);
          if (!existingPlan) {
            const planRef = doc(collection(db, "readingPlans"));
            await setDoc(planRef, {
              ...planData,
              createdAt: new Date().toISOString(),
            });
            plansList.push({
              id: planRef.id,
              ...planData,
              createdAt: new Date().toISOString(),
            } as ReadingPlan);
          }
        }
      }

      setAvailablePlans(plansList);

      // Carregar planos ativos do usuário
      const userPlans = await getUserActivePlans(user.id);
      setActivePlans(userPlans);

      // Verificar quais planos foram iniciados (mesmo que completados)
      const startedIds = new Set<string>();
      for (const plan of plansList) {
        const progress = await getUserReadingProgress(user.id, plan.id);
        if (progress) {
          startedIds.add(plan.id);
        }
      }
      setStartedPlanIds(startedIds);
    } catch (error) {
      console.error("Error loading plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPlan = async (planId: string) => {
    if (!user) return;

    try {
      await startReadingPlan(user.id, planId);
      // Redirecionar para a página de detalhes do plano
      router.push(`/reading-plans/${planId}`);
    } catch (error) {
      console.error("Error starting plan:", error);
      alert("Erro ao iniciar plano. Tente novamente.");
    }
  };

  const getPlanProgress = (planId: string): number => {
    const activePlan = activePlans.find(p => p.planId === planId);
    if (!activePlan) return 0;
    
    const plan = availablePlans.find(p => p.id === planId);
    if (!plan) return 0;
    
    const totalChapters = plan.chapters.length;
    const completed = activePlan.completedChapters.length;
    return totalChapters > 0 ? Math.round((completed / totalChapters) * 100) : 0;
  };

  const isPlanActive = (planId: string): boolean => {
    return activePlans.some(p => p.planId === planId);
  };

  const isPlanStarted = (planId: string): boolean => {
    return startedPlanIds.has(planId);
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
            className="inline-flex items-center gap-2 mb-4 hover-lift"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Planos de Leitura</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Complete desafios e ganhe badges</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Planos Ativos */}
        {activePlans.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-emerald)' }} />
              Meus Planos Ativos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePlans.map((activePlan) => {
                const plan = availablePlans.find(p => p.id === activePlan.planId);
                if (!plan) return null;
                const progress = getPlanProgress(activePlan.planId);
                
                return (
                  <Link
                    key={activePlan.planId}
                    href={`/reading-plans/${activePlan.planId}`}
                    className="card-premium p-6 hover-lift block"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>
                        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Dia {activePlan.currentDay} de {plan.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>{activePlan.completedChapters.length} concluídos</span>
                          </div>
                        </div>
                      </div>
                      {plan.badgeId && (
                        <div className="p-3 rounded-lg" style={{ background: 'var(--gradient-gold)' }}>
                          <Trophy className="w-6 h-6" style={{ color: 'var(--bg-primary)' }} />
                        </div>
                      )}
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>Progresso</span>
                        <span className="font-semibold" style={{ color: 'var(--accent-emerald)' }}>{progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                        <div 
                          className="h-full transition-all duration-300 rounded-full"
                          style={{ 
                            width: `${progress}%`,
                            background: 'var(--gradient-emerald)'
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Planos Disponíveis */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Target className="w-5 h-5" style={{ color: 'var(--accent-violet)' }} />
            Planos Disponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availablePlans.map((plan) => {
              const isActive = isPlanActive(plan.id);
              const isStarted = isPlanStarted(plan.id);
              const progress = isActive ? getPlanProgress(plan.id) : 0;
              
              return (
                <div key={plan.id} className="card-premium p-6 hover-lift hover-glow-violet animate-fade-in">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>
                      <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{plan.duration} dias</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{plan.chapters.length} capítulos</span>
                        </div>
                      </div>
                    </div>
                    {plan.badgeId && (
                      <div className="p-2 rounded-lg" style={{ background: 'rgba(232, 194, 122, 0.2)' }}>
                        <Trophy className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>Progresso</span>
                        <span className="font-semibold" style={{ color: 'var(--accent-emerald)' }}>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                        <div 
                          className="h-full transition-all duration-300 rounded-full"
                          style={{ 
                            width: `${progress}%`,
                            background: 'var(--gradient-emerald)'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {isStarted ? (
                    <Link
                      href={`/reading-plans/${plan.id}`}
                      className="w-full btn-gold hover-lift inline-flex items-center justify-center"
                    >
                      <BookOpen className="w-4 h-4 inline mr-2" />
                      Ver Progresso
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleStartPlan(plan.id)}
                      className="w-full btn-violet hover-lift"
                    >
                      <Target className="w-4 h-4 inline mr-2" />
                      Iniciar Plano
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

