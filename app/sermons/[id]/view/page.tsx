"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, Printer, Copy, Eye, EyeOff } from "lucide-react";

interface SermonPoint {
  title: string;
  content: string;
  verses?: string;
  verseText?: string;
  illustration?: string;
}

interface SermonContent {
  introduction: string;
  points: SermonPoint[];
  conclusion: string;
  application: string;
  notes?: string;
}

interface Sermon {
  id: string;
  title: string;
  passage: string;
  date: string;
  authorId: string;
  content: SermonContent;
  tags?: string[];
}

export default function ViewSermonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sermonId = params.id as string;
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && sermonId) {
      loadSermon();
    }
  }, [user, authLoading, sermonId, router]);

  const loadSermon = async () => {
    if (!user) return;

    try {
      const sermonDoc = await getDoc(doc(db, "sermons", sermonId));
      if (!sermonDoc.exists()) {
        router.push("/sermons");
        return;
      }

      const sermonData = { id: sermonDoc.id, ...sermonDoc.data() } as Sermon;
      
      // Verificar se o usuário é o autor
      if (sermonData.authorId !== user.id) {
        router.push("/sermons");
        return;
      }

      setSermon(sermonData);
    } catch (error) {
      console.error("Error loading sermon:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!sermon) return;

    const text = `
${sermon.title}
${sermon.passage}
${new Date(sermon.date).toLocaleDateString("pt-BR")}

${sermon.tags && sermon.tags.length > 0 ? `Tags: ${sermon.tags.join(", ")}\n` : ""}

INTRODUÇÃO
${sermon.content.introduction}

${sermon.content.points.map((point, i) => `
PONTO ${i + 1}: ${point.title}
${point.verses ? `${point.verses}\n${point.verseText || ""}\n` : ""}
${point.content}
${point.illustration ? `\nIlustração: ${point.illustration}` : ""}
`).join("\n")}

CONCLUSÃO
${sermon.content.conclusion}

APLICAÇÃO PRÁTICA
${sermon.content.application}
`.trim();

    navigator.clipboard.writeText(text);
    alert("Sermão copiado para a área de transferência!");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Carregando...</div>
      </div>
    );
  }

  if (!sermon || !user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header fixo com controles */}
      <header className="sticky top-0 z-50 print:hidden" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Link
              href="/sermons"
              className="inline-flex items-center gap-2 hover-lift"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all button-press hover-lift text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                title="Mostrar/Ocultar Notas Pessoais"
              >
                {showNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showNotes ? "Ocultar Notas" : "Mostrar Notas"}
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all button-press hover-lift text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                title="Copiar texto formatado"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 btn-violet hover-lift text-sm"
                title="Imprimir"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo do sermão */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card-premium p-8 md:p-12 space-y-8 animate-fade-in">
          {/* Cabeçalho */}
          <div className="text-center pb-8" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text-violet">
              {sermon.title}
            </h1>
            <div className="flex items-center justify-center gap-4 text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: 'var(--accent-violet)' }} />
                <span className="font-semibold">{sermon.passage}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <span>{new Date(sermon.date).toLocaleDateString("pt-BR", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}</span>
              </div>
            </div>
            {sermon.tags && sermon.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {sermon.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                    style={{ background: 'rgba(169, 139, 255, 0.2)', color: 'var(--accent-violet)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Introdução */}
          {sermon.content.introduction && (
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold pl-4" style={{ color: 'var(--text-primary)', borderLeft: '4px solid var(--accent-violet)' }}>
                Introdução
              </h2>
              <div className="text-lg leading-relaxed whitespace-pre-wrap p-6 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {sermon.content.introduction}
              </div>
            </div>
          )}

          {/* Pontos Principais */}
          {sermon.content.points.length > 0 && (
            <div className="space-y-8">
              <h2 className="text-2xl md:text-3xl font-bold pl-4" style={{ color: 'var(--text-primary)', borderLeft: '4px solid var(--accent-violet)' }}>
                Pontos Principais
              </h2>
              {sermon.content.points.map((point, index) => (
                <div key={index} className="rounded-lg p-6 md:p-8 hover-lift card-premium">
                  <h3 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                    <span className="rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold" style={{ background: 'var(--gradient-violet)', color: 'white' }}>
                      {index + 1}
                    </span>
                    {point.title}
                  </h3>
                  
                  {/* Versículo */}
                  {point.verseText && (
                    <div className="p-4 md:p-6 mb-4 rounded-r-lg" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-blue)' }}>
                      <p className="font-semibold mb-2 text-lg" style={{ color: 'var(--accent-blue)' }}>
                        {point.verses}
                      </p>
                      <p className="leading-relaxed text-base md:text-lg italic" style={{ color: 'var(--text-secondary)' }}>
                        {point.verseText}
                      </p>
                    </div>
                  )}

                  {/* Conteúdo do ponto */}
                  {point.content && (
                    <div className="leading-relaxed whitespace-pre-wrap mb-4 text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                      {point.content}
                    </div>
                  )}

                  {/* Ilustração */}
                  {point.illustration && (
                    <div className="p-4 md:p-6 rounded-r-lg" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-gold)' }}>
                      <p className="text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--accent-gold)' }}>
                        Ilustração / Exemplo
                      </p>
                      <p className="leading-relaxed italic text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                        {point.illustration}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Conclusão */}
          {sermon.content.conclusion && (
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold pl-4" style={{ color: 'var(--text-primary)', borderLeft: '4px solid var(--accent-violet)' }}>
                Conclusão
              </h2>
              <div className="text-lg leading-relaxed whitespace-pre-wrap p-6 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {sermon.content.conclusion}
              </div>
            </div>
          )}

          {/* Aplicação Prática */}
          {sermon.content.application && (
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold pl-4" style={{ color: 'var(--text-primary)', borderLeft: '4px solid var(--accent-emerald)' }}>
                Aplicação Prática
              </h2>
              <div className="text-lg leading-relaxed whitespace-pre-wrap p-6 rounded-lg" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-emerald)', color: 'var(--text-secondary)' }}>
                {sermon.content.application}
              </div>
            </div>
          )}

          {/* Notas Pessoais (opcional) */}
          {showNotes && sermon.content.notes && (
            <div className="space-y-4 pt-8 mt-8" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--accent-gold)' }}>📝</span>
                Notas Pessoais
              </h2>
              <div className="leading-relaxed whitespace-pre-wrap p-6 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                {sermon.content.notes}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Estilo para impressão */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white;
          }
          .bg-gray-50 {
            background: white;
          }
          .bg-white {
            background: white;
            box-shadow: none;
            border: 1px solid #e5e7eb;
          }
          .bg-gray-50,
          .bg-blue-50,
          .bg-amber-50,
          .bg-green-50 {
            background: white !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>
    </div>
  );
}

