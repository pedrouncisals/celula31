"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function CreateSermonPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("Você precisa estar logado");
      return;
    }

    if (!title.trim()) {
      setError("O título é obrigatório");
      return;
    }

    if (!passage.trim()) {
      setError("A passagem bíblica é obrigatória");
      return;
    }

    if (!date) {
      setError("A data é obrigatória");
      return;
    }

    setLoading(true);

    try {
      const sermonRef = await addDoc(collection(db, "sermons"), {
        title: title.trim(),
        passage: passage.trim(),
        date: new Date(date).toISOString(),
        authorId: user.id,
        createdAt: new Date().toISOString(),
        content: {
          introduction: "",
          points: [],
          conclusion: "",
          application: "",
          notes: "",
        },
        tags: [],
      });

      router.push(`/sermons/${sermonRef.id}`);
    } catch (err: any) {
      setError(err.message || "Erro ao criar sermão");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/sermons"
            className="inline-flex items-center gap-2 mb-4 hover-lift"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Criar Novo Sermão</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="card-premium p-6 space-y-6 animate-fade-in">
          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Título do Sermão
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
              placeholder="Ex: O Amor de Deus"
            />
          </div>

          <div>
            <label htmlFor="passage" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Passagem Bíblica
            </label>
            <input
              id="passage"
              type="text"
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
              placeholder="Ex: João 3:16 ou João 3:16-21"
            />
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Digite a referência bíblica (livro, capítulo e versículos)
            </p>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Data do Sermão
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border transition-all"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            />
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Data em que o sermão será ou foi pregado
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-violet hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? "Criando..." : "Criar Sermão"}
          </button>
        </form>
      </main>
    </div>
  );
}

