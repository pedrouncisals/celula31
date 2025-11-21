"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { BookOpen, FileText, Heart, ArrowRight, Users, Sparkles, Book, Target, Lightbulb, Construction, User, Sparkle, Star, Flame } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--accent-violet)' }}></div>
          <div style={{ color: 'var(--text-secondary)' }}>Carregando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Background Effects - Reduzido no mobile para performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-10 sm:opacity-20" style={{ background: 'var(--accent-violet)' }}></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-10 sm:opacity-20" style={{ background: 'var(--accent-emerald)' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] rounded-full blur-3xl opacity-5 sm:opacity-10" style={{ background: 'var(--accent-gold)' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12 lg:py-16">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 lg:mb-16 lg:mb-20 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12">
            <div className="flex-1 space-y-3 sm:space-y-4 lg:space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4" style={{ background: 'rgba(169, 139, 255, 0.1)', border: '1px solid rgba(169, 139, 255, 0.2)' }}>
                <Sparkle className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--accent-violet)' }} />
                <span className="text-[10px] sm:text-xs lg:text-sm font-medium" style={{ color: 'var(--accent-violet)' }}>Plataforma de Estudo Bíblico</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                <span className="block mb-1 sm:mb-2" style={{ color: 'var(--text-primary)' }}>Célula</span>
                <span className="block gradient-text-violet text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">31</span>
              </h1>
              
              <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl max-w-2xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Transforme sua jornada espiritual com estudo bíblico profundo, reflexões inspiradoras e crescimento em comunidade.
              </p>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 pt-1 sm:pt-2">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg touch-target" style={{ background: 'var(--bg-secondary)' }}>
                  <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--accent-gold)' }} />
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user.streak || 0}</span>
                  <span className="text-[10px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>dias</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg touch-target" style={{ background: 'var(--bg-secondary)' }}>
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--accent-violet)' }} />
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Estudo</span>
                  <span className="text-[10px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>ativo</span>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <Link
              href="/profile"
              className="group flex items-center gap-2.5 sm:gap-3 lg:gap-4 card-premium p-3 sm:p-4 lg:p-5 hover-lift hover-glow-violet transition-all touch-target w-full lg:w-auto lg:min-w-[280px]"
            >
              <div className="relative">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full object-cover border-2 flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ borderColor: 'var(--accent-violet)' }}
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: 'var(--gradient-violet)' }}>
                    <User className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" style={{ color: 'var(--bg-primary)' }} />
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center" style={{ background: 'var(--bg-primary)', borderColor: 'var(--accent-emerald)' }}>
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ background: 'var(--accent-emerald)' }}></div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs sm:text-sm lg:text-base truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                <p className="text-[10px] sm:text-xs lg:text-sm truncate" style={{ color: 'var(--text-secondary)' }}>Ver perfil completo</p>
              </div>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--accent-violet)' }} />
            </Link>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--border-subtle))' }}></div>
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold px-3 sm:px-4" style={{ color: 'var(--text-primary)' }}>Módulos</h2>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, var(--border-subtle))' }}></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
            {/* Estudo Bíblico */}
            <Link
              href="/home"
              className="group card-premium hover-lift hover-glow-emerald animate-fade-in relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-4 sm:p-5 lg:p-6 xl:p-7 lg:p-8 relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-5 lg:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 touch-target" style={{ background: 'var(--gradient-emerald)' }}>
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9" style={{ color: 'var(--bg-primary)' }} />
                  </div>
                  <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg" style={{ background: 'rgba(138, 230, 191, 0.1)' }}>
                    <span className="text-[10px] sm:text-xs font-semibold" style={{ color: 'var(--accent-emerald)' }}>Popular</span>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 group-hover:gradient-text-emerald transition-all" style={{ color: 'var(--text-primary)' }}>
                  Estudo Bíblico
                </h3>
                <p className="mb-4 sm:mb-5 lg:mb-6 leading-relaxed text-xs sm:text-sm lg:text-base" style={{ color: 'var(--text-secondary)' }}>
                  Estude a Bíblia capítulo por capítulo em comunidade. Crie salas, escreva resumos e participe de discussões.
                </p>
                <div className="flex items-center font-semibold text-xs sm:text-sm lg:text-base group-hover:translate-x-2 transition-transform touch-target" style={{ color: 'var(--accent-emerald)' }}>
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1.5 sm:ml-2" />
                </div>
              </div>
            </Link>

            {/* Criador de Sermões */}
            <Link
              href="/sermons"
              className="group card-premium hover-lift hover-glow-violet animate-fade-in relative overflow-hidden"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-4 sm:p-5 lg:p-6 xl:p-7 lg:p-8 relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-5 lg:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 touch-target" style={{ background: 'var(--gradient-violet)' }}>
                    <FileText className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 text-white" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 group-hover:gradient-text-violet transition-all" style={{ color: 'var(--text-primary)' }}>
                  Criador de Sermões
                </h3>
                <p className="mb-4 sm:mb-5 lg:mb-6 leading-relaxed text-xs sm:text-sm lg:text-base" style={{ color: 'var(--text-secondary)' }}>
                  Crie e organize seus sermões com facilidade. Estruture suas mensagens com versículos, pontos principais e aplicações.
                </p>
                <div className="flex items-center font-semibold text-xs sm:text-sm lg:text-base group-hover:translate-x-2 transition-transform touch-target" style={{ color: 'var(--accent-violet)' }}>
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1.5 sm:ml-2" />
                </div>
              </div>
            </Link>

            {/* Consultar Bíblia */}
            <Link
              href="/bible"
              className="group card-premium hover-lift hover-glow-gold animate-fade-in relative overflow-hidden"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-4 sm:p-5 lg:p-6 xl:p-7 lg:p-8 relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-5 lg:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 touch-target" style={{ background: 'var(--gradient-gold)' }}>
                    <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9" style={{ color: 'var(--bg-primary)' }} />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 group-hover:gradient-text-gold transition-all" style={{ color: 'var(--text-primary)' }}>
                  Consultar Bíblia
                </h3>
                <p className="mb-4 sm:mb-5 lg:mb-6 leading-relaxed text-xs sm:text-sm lg:text-base" style={{ color: 'var(--text-secondary)' }}>
                  Acesse qualquer capítulo da Bíblia completa. Ideal para estudo e consulta rápida com destaque de versículos.
                </p>
                <div className="flex items-center font-semibold text-xs sm:text-sm lg:text-base group-hover:translate-x-2 transition-transform touch-target" style={{ color: 'var(--accent-gold)' }}>
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1.5 sm:ml-2" />
                </div>
              </div>
            </Link>

            {/* Planos de Leitura */}
            <Link
              href="/reading-plans"
              className="group card-premium hover-lift hover-glow-gold animate-fade-in relative overflow-hidden"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-4 sm:p-5 lg:p-6 xl:p-7 lg:p-8 relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-5 lg:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 touch-target" style={{ background: 'var(--gradient-gold)' }}>
                    <Target className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9" style={{ color: 'var(--bg-primary)' }} />
                  </div>
                  <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg" style={{ background: 'rgba(232, 194, 122, 0.1)' }}>
                    <span className="text-[10px] sm:text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>Novo</span>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 group-hover:gradient-text-gold transition-all" style={{ color: 'var(--text-primary)' }}>
                  Planos de Leitura
                </h3>
                <p className="mb-4 sm:mb-5 lg:mb-6 leading-relaxed text-xs sm:text-sm lg:text-base" style={{ color: 'var(--text-secondary)' }}>
                  Complete desafios de leitura bíblica e ganhe badges. Leia a Bíblia em 1 ano, Novo Testamento em 90 dias e muito mais.
                </p>
                <div className="flex items-center font-semibold text-xs sm:text-sm lg:text-base group-hover:translate-x-2 transition-transform touch-target" style={{ color: 'var(--accent-gold)' }}>
                  <span>Ver Planos</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1.5 sm:ml-2" />
                </div>
              </div>
            </Link>

            {/* Reflexões */}
            <Link
              href="/reflections"
              className="group card-premium hover-lift hover-glow-violet animate-fade-in relative overflow-hidden"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-4 sm:p-5 lg:p-6 xl:p-7 lg:p-8 relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-5 lg:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 touch-target" style={{ background: 'var(--gradient-violet)' }}>
                    <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 text-white" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 group-hover:gradient-text-violet transition-all" style={{ color: 'var(--text-primary)' }}>
                  Reflexões
                </h3>
                <p className="mb-4 sm:mb-5 lg:mb-6 leading-relaxed text-xs sm:text-sm lg:text-base" style={{ color: 'var(--text-secondary)' }}>
                  Compartilhe suas experiências, insights e reflexões sobre a Palavra de Deus. Leia e inspire-se com a comunidade.
                </p>
                <div className="flex items-center font-semibold text-xs sm:text-sm lg:text-base group-hover:translate-x-2 transition-transform touch-target" style={{ color: 'var(--accent-violet)' }}>
                  <span>Ver Reflexões</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1.5 sm:ml-2" />
                </div>
              </div>
            </Link>

            {/* Devocionais */}
            <div className="group card-premium opacity-60 relative overflow-hidden" style={{ animationDelay: "0.5s", cursor: "not-allowed" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
              <div className="p-4 sm:p-5 lg:p-6 xl:p-7 lg:p-8 relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-5 lg:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-xl sm:rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                    <Heart className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg" style={{ background: 'rgba(166, 166, 191, 0.1)' }}>
                    <Construction className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[10px] sm:text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Em breve</span>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3" style={{ color: 'var(--text-primary)' }}>
                  Devocionais
                </h3>
                <p className="mb-4 sm:mb-5 lg:mb-6 leading-relaxed text-xs sm:text-sm lg:text-base" style={{ color: 'var(--text-secondary)' }}>
                  Acesse devocionais diários e mensagens inspiradoras para fortalecer sua fé. Em breve você terá acesso a devocionais exclusivos.
                </p>
                <div className="flex items-center font-semibold text-xs sm:text-sm lg:text-base" style={{ color: 'var(--text-muted)' }}>
                  <span>Em Construção</span>
                  <Construction className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ml-1.5 sm:ml-2" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 sm:pt-8 lg:pt-12 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs sm:text-sm lg:text-base mb-1.5 sm:mb-2" style={{ color: 'var(--text-secondary)' }}>
            Transformando vidas através do estudo da Palavra
          </p>
          <p className="text-[10px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
            Célula31 - Plataforma de Estudo Bíblico
          </p>
        </div>
      </div>
    </div>
  );
}
