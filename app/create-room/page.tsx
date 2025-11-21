"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

const BIBLE_BOOKS = [
  // ANTIGO TESTAMENTO (39 livros)
  { name: "Gênesis", chapters: 50 },
  { name: "Êxodo", chapters: 40 },
  { name: "Levítico", chapters: 27 },
  { name: "Números", chapters: 36 },
  { name: "Deuteronômio", chapters: 34 },
  { name: "Josué", chapters: 24 },
  { name: "Juízes", chapters: 21 },
  { name: "Rute", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Reis", chapters: 22 },
  { name: "2 Reis", chapters: 25 },
  { name: "1 Crônicas", chapters: 29 },
  { name: "2 Crônicas", chapters: 36 },
  { name: "Esdras", chapters: 10 },
  { name: "Neemias", chapters: 13 },
  { name: "Ester", chapters: 10 },
  { name: "Jó", chapters: 42 },
  { name: "Salmos", chapters: 150 },
  { name: "Provérbios", chapters: 31 },
  { name: "Eclesiastes", chapters: 12 },
  { name: "Cantares", chapters: 8 },
  { name: "Isaías", chapters: 66 },
  { name: "Jeremias", chapters: 52 },
  { name: "Lamentações", chapters: 5 },
  { name: "Ezequiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Oséias", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amós", chapters: 9 },
  { name: "Obadias", chapters: 1 },
  { name: "Jonas", chapters: 4 },
  { name: "Miqueias", chapters: 7 },
  { name: "Naum", chapters: 3 },
  { name: "Habacuque", chapters: 3 },
  { name: "Sofonias", chapters: 3 },
  { name: "Ageu", chapters: 2 },
  { name: "Zacarias", chapters: 14 },
  { name: "Malaquias", chapters: 4 },
  
  // NOVO TESTAMENTO (27 livros)
  { name: "Mateus", chapters: 28 },
  { name: "Marcos", chapters: 16 },
  { name: "Lucas", chapters: 24 },
  { name: "João", chapters: 21 },
  { name: "Atos", chapters: 28 },
  { name: "Romanos", chapters: 16 },
  { name: "1 Coríntios", chapters: 16 },
  { name: "2 Coríntios", chapters: 13 },
  { name: "Gálatas", chapters: 6 },
  { name: "Efésios", chapters: 6 },
  { name: "Filipenses", chapters: 4 },
  { name: "Colossenses", chapters: 4 },
  { name: "1 Tessalonicenses", chapters: 5 },
  { name: "2 Tessalonicenses", chapters: 3 },
  { name: "1 Timóteo", chapters: 6 },
  { name: "2 Timóteo", chapters: 4 },
  { name: "Tito", chapters: 3 },
  { name: "Filemom", chapters: 1 },
  { name: "Hebreus", chapters: 13 },
  { name: "Tiago", chapters: 5 },
  { name: "1 Pedro", chapters: 5 },
  { name: "2 Pedro", chapters: 3 },
  { name: "1 João", chapters: 5 },
  { name: "2 João", chapters: 1 },
  { name: "3 João", chapters: 1 },
  { name: "Judas", chapters: 1 },
  { name: "Apocalipse", chapters: 22 },
];

export default function CreateRoomPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [book, setBook] = useState("Provérbios");
  const [startDate, setStartDate] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBook = BIBLE_BOOKS.find((b) => b.name === book);

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

    if (!startDate) {
      setError("A data de início é obrigatória");
      return;
    }

    setLoading(true);

    try {
      // Criar objeto de dados da sala
      const roomData: any = {
        title: title.trim(),
        book,
        totalChapters: selectedBook?.chapters || 31,
        startDate: new Date(startDate).toISOString(),
        visibility,
        adminId: user.id,
      };

      // Adicionar código de convite apenas para salas privadas
      if (visibility === "private") {
        roomData.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      // Criar sala
      const roomRef = await addDoc(collection(db, "rooms"), roomData);

      // Adicionar admin como membro
      await setDoc(doc(db, "rooms", roomRef.id, "members", user.id), {
        userId: user.id,
        joinedAt: new Date().toISOString(),
      });

      router.push(`/room/${roomRef.id}`);
    } catch (err: any) {
      setError(err.message || "Erro ao criar sala");
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
            href="/home"
            className="inline-flex items-center gap-2 mb-4 hover-lift"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Criar Nova Sala</h1>
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
              Nome da Sala
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
              placeholder="Ex: Estudo de Provérbios - Grupo 1"
            />
          </div>

          <div>
            <label htmlFor="book" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Livro da Bíblia
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <select
                id="book"
                value={book}
                onChange={(e) => setBook(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
              >
                {BIBLE_BOOKS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} ({b.chapters} capítulos)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Data de Início
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              min={today}
              className="w-full px-4 py-3 rounded-xl border transition-all"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            />
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              O primeiro capítulo será desbloqueado nesta data
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Visibilidade
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-3 rounded-lg cursor-pointer hover-lift" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <input
                  type="radio"
                  value="public"
                  checked={visibility === "public"}
                  onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                  className="mr-3"
                  style={{ accentColor: 'var(--accent-emerald)' }}
                />
                <span style={{ color: 'var(--text-primary)' }}>Pública - Qualquer pessoa pode entrar</span>
              </label>
              <label className="flex items-center p-3 rounded-lg cursor-pointer hover-lift" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <input
                  type="radio"
                  value="private"
                  checked={visibility === "private"}
                  onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                  className="mr-3"
                  style={{ accentColor: 'var(--accent-violet)' }}
                />
                <span style={{ color: 'var(--text-primary)' }}>Privada - Apenas com link de convite</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-emerald hover-lift disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar Sala"}
          </button>
        </form>
      </main>
    </div>
  );
}
