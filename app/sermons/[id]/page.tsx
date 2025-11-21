"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getVerseText } from "@/lib/bible-verses";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, BookOpen, Clock, FileText, Search, X, Check, ChevronUp, ChevronDown, Printer, Copy, Tag, Lightbulb, StickyNote, ArrowUp, ArrowDown } from "lucide-react";

interface SermonPoint {
  title: string;
  content: string;
  verses?: string;
  verseText?: string; // Texto do versículo buscado
  illustration?: string;
}

interface SermonContent {
  introduction: string;
  points: SermonPoint[];
  conclusion: string;
  application: string;
  notes?: string; // Notas pessoais
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

export default function EditSermonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sermonId = params.id as string;
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [content, setContent] = useState<SermonContent>({
    introduction: "",
    points: [],
    conclusion: "",
    application: "",
    notes: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [searchingVerse, setSearchingVerse] = useState<number | null>(null);
  const [verseSearchText, setVerseSearchText] = useState("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Calcular palavras e tempo estimado
  const wordCount = useMemo(() => {
    const allText = [
      content.introduction,
      ...content.points.map(p => `${p.title} ${p.content} ${p.illustration || ""}`),
      content.conclusion,
      content.application,
    ].join(" ");
    return allText.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, [content]);

  const estimatedTime = useMemo(() => {
    // ~120 palavras por minuto de pregação (velocidade mais realista)
    const minutes = Math.ceil(wordCount / 120);
    return minutes;
  }, [wordCount]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && sermonId) {
      loadSermon();
    }
  }, [user, authLoading, sermonId, router]);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    if (!sermon || !user) return;

    const contentString = JSON.stringify({ content, tags });
    if (contentString === lastSavedContentRef.current) {
      return; // Nada mudou
    }

    // Limpar timer anterior
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setSaveStatus("unsaved");

    // Novo timer
    autoSaveTimerRef.current = setTimeout(async () => {
      await autoSave();
    }, 30000); // 30 segundos

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, tags, sermon, user]);

  const loadSermon = async () => {
    if (!user) return;

    try {
      const sermonDoc = await getDoc(doc(db, "sermons", sermonId));
      if (!sermonDoc.exists()) {
        router.push("/sermons");
        return;
      }

      const sermonData = { id: sermonDoc.id, ...sermonDoc.data() } as Sermon;
      setSermon(sermonData);
      setContent(sermonData.content || {
        introduction: "",
        points: [],
        conclusion: "",
        application: "",
        notes: "",
      });
      setTags(sermonData.tags || []);
      lastSavedContentRef.current = JSON.stringify({ 
        content: sermonData.content || {}, 
        tags: sermonData.tags || [] 
      });
    } catch (error) {
      console.error("Error loading sermon:", error);
    } finally {
      setLoading(false);
    }
  };

  const autoSave = async () => {
    if (!user || !sermon) return;

    setSaveStatus("saving");
    try {
      await updateDoc(doc(db, "sermons", sermonId), {
        content,
        tags,
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus("saved");
      lastSavedContentRef.current = JSON.stringify({ content, tags });
    } catch (error) {
      console.error("Error auto-saving sermon:", error);
      setSaveStatus("unsaved");
    }
  };

  const handleSave = async () => {
    await autoSave();
  };

  const handleSearchVerse = async (pointIndex: number) => {
    if (!verseSearchText.trim()) return;

    setSearchingVerse(pointIndex);
    try {
      const verseData = await getVerseText(verseSearchText.trim(), "nvi");
      if (verseData) {
        const newPoints = [...content.points];
        newPoints[pointIndex] = {
          ...newPoints[pointIndex],
          verses: verseSearchText.trim(),
          verseText: verseData.text,
        };
        setContent({ ...content, points: newPoints });
        setVerseSearchText("");
      } else {
        alert("Versículo não encontrado. Verifique a referência (ex: João 3:16)");
      }
    } catch (error) {
      console.error("Error searching verse:", error);
      alert("Erro ao buscar versículo");
    } finally {
      setSearchingVerse(null);
    }
  };

  const addPoint = () => {
    setContent({
      ...content,
      points: [...content.points, { title: "", content: "" }],
    });
  };

  const removePoint = (index: number) => {
    setContent({
      ...content,
      points: content.points.filter((_, i) => i !== index),
    });
  };

  const movePoint = (index: number, direction: "up" | "down") => {
    const newPoints = [...content.points];
    if (direction === "up" && index > 0) {
      [newPoints[index - 1], newPoints[index]] = [newPoints[index], newPoints[index - 1]];
    } else if (direction === "down" && index < newPoints.length - 1) {
      [newPoints[index], newPoints[index + 1]] = [newPoints[index + 1], newPoints[index]];
    }
    setContent({ ...content, points: newPoints });
  };

  const updatePoint = (index: number, field: keyof SermonPoint, value: string) => {
    const newPoints = [...content.points];
    newPoints[index] = { ...newPoints[index], [field]: value };
    setContent({ ...content, points: newPoints });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleExport = () => {
    const text = `
${sermon?.title || "Sermão"}
${sermon?.passage || ""}
${new Date(sermon?.date || "").toLocaleDateString("pt-BR")}

${tags.length > 0 ? `Tags: ${tags.join(", ")}\n` : ""}

INTRODUÇÃO
${content.introduction}

${content.points.map((point, i) => `
PONTO ${i + 1}: ${point.title}
${point.verses ? `${point.verses}\n${point.verseText || ""}\n` : ""}
${point.content}
${point.illustration ? `\nIlustração: ${point.illustration}` : ""}
`).join("\n")}

CONCLUSÃO
${content.conclusion}

APLICAÇÃO PRÁTICA
${content.application}
`.trim();

    navigator.clipboard.writeText(text);
    alert("Sermão copiado para a área de transferência!");
  };

  const handlePrint = () => {
    window.print();
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
      <header className="sticky top-0 z-10 print:hidden" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/sermons"
            className="inline-flex items-center gap-2 mb-4 hover-lift"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{sermon.title}</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{sermon.passage}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Estatísticas */}
              <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{wordCount} palavras</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>~{estimatedTime} min</span>
                </div>
              </div>
              {/* Status de salvamento */}
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === "saving" && (
                  <span style={{ color: 'var(--accent-blue)' }}>Salvando...</span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1" style={{ color: 'var(--accent-emerald)' }}>
                    <Check className="w-4 h-4" />
                    Salvo
                  </span>
                )}
                {saveStatus === "unsaved" && (
                  <span style={{ color: 'var(--accent-gold)' }}>Não salvo</span>
                )}
              </div>
              {/* Botões de ação */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all button-press hover-lift text-sm"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  title="Copiar texto formatado"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all button-press hover-lift text-sm"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  title="Imprimir"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saveStatus === "saving"}
                  className="flex items-center gap-2 btn-violet hover-lift disabled:opacity-50 text-sm"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 print:hidden">
        {/* Tags */}
        <div className="card-premium p-6 animate-fade-in print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-5 h-5" style={{ color: 'var(--accent-violet)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Tags</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                style={{ background: 'rgba(169, 139, 255, 0.2)', color: 'var(--accent-violet)' }}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="hover-lift"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTag()}
              placeholder="Adicionar tag (ex: Amor, Fé, Salvação)"
              className="flex-1 px-4 py-2 rounded-xl border transition-all text-sm"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            />
            <button
              onClick={addTag}
              className="btn-violet transition-all button-press text-sm"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Introdução */}
        <div className="card-premium p-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Introdução</h2>
          <textarea
            value={content.introduction}
            onChange={(e) => setContent({ ...content, introduction: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border transition-all"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
            placeholder="Escreva a introdução do sermão..."
          />
        </div>

        {/* Pontos Principais */}
        <div className="card-premium p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Pontos Principais</h2>
            <button
              onClick={addPoint}
              className="flex items-center gap-2 btn-violet hover-lift text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Ponto
            </button>
          </div>

          {content.points.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Adicione pontos principais ao seu sermão</p>
          ) : (
            <div className="space-y-4">
              {content.points.map((point, index) => (
                <div key={index} className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-violet)' }}>Ponto {index + 1}</span>
                      {content.points.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => movePoint(index, "up")}
                            disabled={index === 0}
                            className="hover-lift disabled:opacity-30"
                            style={{ color: 'var(--text-muted)' }}
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => movePoint(index, "down")}
                            disabled={index === content.points.length - 1}
                            className="hover-lift disabled:opacity-30"
                            style={{ color: 'var(--text-muted)' }}
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removePoint(index)}
                      className="transition-colors hover-lift"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={point.title}
                    onChange={(e) => updatePoint(index, "title", e.target.value)}
                    placeholder="Título do ponto"
                    className="w-full px-4 py-2 rounded-lg border transition-all font-semibold"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  
                  {/* Busca de Versículos */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={point.verses || ""}
                        onChange={(e) => updatePoint(index, "verses", e.target.value)}
                        placeholder="Versículos (ex: João 3:16 ou João 3:16-18)"
                        className="flex-1 px-4 py-2 rounded-lg border transition-all text-sm"
                        style={{
                          background: 'var(--bg-tertiary)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <button
                        onClick={() => handleSearchVerse(index)}
                        disabled={searchingVerse === index || !point.verses?.trim()}
                        className="flex items-center gap-2 btn-emerald transition-all button-press disabled:opacity-50 text-sm hover-lift"
                        title="Buscar texto do versículo"
                      >
                        {searchingVerse === index ? (
                          "Buscando..."
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            Buscar
                          </>
                        )}
                      </button>
                    </div>
                    {point.verseText && (
                      <div className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)', borderLeft: '4px solid var(--accent-blue)' }}>
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--accent-blue)' }}>
                            <BookOpen className="w-3 h-3" />
                            {point.verses}
                          </span>
                          <button
                            onClick={() => updatePoint(index, "verseText", "")}
                            className="hover-lift"
                            style={{ color: 'var(--accent-blue)' }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{point.verseText}</p>
                      </div>
                    )}
                  </div>

                  <textarea
                    value={point.content}
                    onChange={(e) => updatePoint(index, "content", e.target.value)}
                    rows={4}
                    placeholder="Conteúdo do ponto"
                    className="w-full px-4 py-2 rounded-lg border transition-all"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />

                  {/* Ilustração */}
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                      <Lightbulb className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                      Ilustração/Exemplo (opcional)
                    </label>
                    <textarea
                      value={point.illustration || ""}
                      onChange={(e) => updatePoint(index, "illustration", e.target.value)}
                      rows={2}
                      placeholder="História, exemplo ou ilustração para este ponto..."
                      className="w-full px-4 py-2 rounded-lg border transition-all text-sm"
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conclusão */}
        <div className="card-premium p-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Conclusão</h2>
          <textarea
            value={content.conclusion}
            onChange={(e) => setContent({ ...content, conclusion: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border transition-all"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
            placeholder="Escreva a conclusão do sermão..."
          />
        </div>

        {/* Aplicação Prática */}
        <div className="card-premium p-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Aplicação Prática</h2>
          <textarea
            value={content.application}
            onChange={(e) => setContent({ ...content, application: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border transition-all"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
            placeholder="Como aplicar esta mensagem na vida prática?"
          />
        </div>

        {/* Notas Pessoais */}
        <div className="card-premium p-6 animate-fade-in print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Notas Pessoais</h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(não aparece na impressão)</span>
          </div>
          <textarea
            value={content.notes || ""}
            onChange={(e) => setContent({ ...content, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border transition-all"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
            placeholder="Anotações pessoais, lembretes, etc..."
          />
        </div>
      </main>

      {/* Visualização de Impressão */}
      <div className="hidden print:block max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{sermon.title}</h1>
            <p className="text-lg text-gray-700 mb-2">{sermon.passage}</p>
            <p className="text-sm text-gray-600">{new Date(sermon.date).toLocaleDateString("pt-BR", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}</p>
          </div>

          {content.introduction && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Introdução</h2>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{content.introduction}</p>
            </div>
          )}

          {content.points.map((point, index) => (
            <div key={index} className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {index + 1}. {point.title}
              </h2>
              {point.verseText && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-3">
                  <p className="font-semibold text-blue-900 mb-1">{point.verses}</p>
                  <p className="text-blue-800 leading-relaxed">{point.verseText}</p>
                </div>
              )}
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-3">{point.content}</p>
              {point.illustration && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 italic">
                  <p className="text-amber-900 leading-relaxed">{point.illustration}</p>
                </div>
              )}
            </div>
          ))}

          {content.conclusion && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Conclusão</h2>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{content.conclusion}</p>
            </div>
          )}

          {content.application && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Aplicação Prática</h2>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{content.application}</p>
            </div>
          )}
        </div>
      </div>

      {/* Estilo para impressão */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
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
        }
      `}</style>
    </div>
  );
}
