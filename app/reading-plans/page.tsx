"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { ArrowLeft, BookOpen, Wrench } from "lucide-react";

export default function ReadingPlansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
  }, [user, authLoading, router]);

  if (authLoading) {
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Planos de Leitura</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16 card-premium">
          <Wrench className="w-20 h-20 mx-auto mb-6" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Módulo em Reformulação</h3>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Os planos de leitura estão sendo reformulados e estarão disponíveis em breve.
          </p>
        </div>
      </main>
    </div>
  );
}
