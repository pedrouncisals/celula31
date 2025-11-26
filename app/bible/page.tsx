"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAvailableBooks, getBibleChapter } from "@/lib/bible";
import { getChapterHighlights as getVerseHighlights, saveVerseHighlight, removeVerseHighlight } from "@/lib/verse-highlights";
import type { VerseHighlight } from "@/lib/verse-highlights";
import { autoMarkChapterAsRead } from "@/lib/reading-plans";
import { updateUserStreak } from "@/lib/streak";
import Link from "next/link";
import { ArrowLeft, BookOpen, Search, ChevronRight, ChevronLeft, Highlighter, X, CheckCircle2 } from "lucide-react";

interface Book {
  name: string;
  chapters: number;
}

export default function BiblePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterText, setChapterText] = useState<{ [verse: string]: string } | null>(null);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [testament, setTestament] = useState<"all" | "old" | "new">("all");
  const [verseHighlights, setVerseHighlights] = useState<Map<number, VerseHighlight["color"]>>(new Map());
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [touchStart, setTouchStart] = useState<{ verse: number; time: number } | null>(null);
  const [notification, setNotification] = useState<{ message: string; plans: string[] } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadBooks();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (selectedBook && selectedChapter && user) {
      loadHighlights();
    }
  }, [selectedBook, selectedChapter, user]);

  const loadBooks = async () => {
    try {
      const availableBooks = await getAvailableBooks();
      setBooks(availableBooks);
    } catch (error) {
      console.error("Error loading books:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadChapter = async (book: string, chapter: number) => {
    setLoadingChapter(true);
    try {
      const text = await getBibleChapter(book, chapter, "nvi");
      setChapterText(text);
      setSelectedBook(book);
      setSelectedChapter(chapter);
      
      // Marcar automaticamente em planos de leitura ativos e atualizar streak
      if (user) {
        const updatedPlans = await autoMarkChapterAsRead(user.id, book, chapter);
        if (updatedPlans.length > 0) {
          setNotification({
            message: `Capítulo marcado como lido em ${updatedPlans.length} plano${updatedPlans.length > 1 ? "s" : ""}!`,
            plans: updatedPlans
          });
          // Remover notificação após 5 segundos
          setTimeout(() => setNotification(null), 5000);
        }
        // Atualizar streak do usuário
        await updateUserStreak(user.id);
      }
    } catch (error) {
      console.error("Error loading chapter:", error);
      alert("Erro ao carregar capítulo");
    } finally {
      setLoadingChapter(false);
    }
  };

  const loadHighlights = async () => {
    if (!user || !selectedBook || !selectedChapter) return;
    try {
      const highlights = await getVerseHighlights(user.id, "bible-consultation", selectedBook, selectedChapter);
      setVerseHighlights(highlights);
    } catch (error) {
      console.error("Error loading highlights:", error);
    }
  };

  const handleVerseLongPress = (verseNum: number) => {
    if (!user) return;
    setSelectedVerse(verseNum);
    setShowHighlightMenu(true);
  };

  const handleVerseClick = (verseNum: number) => {
    if (verseHighlights.has(verseNum)) {
      handleVerseLongPress(verseNum);
    }
  };

  const handleTouchStart = (verseNum: number) => {
    setTouchStart({ verse: verseNum, time: Date.now() });
  };

  const handleTouchEnd = (verseNum: number) => {
    if (!touchStart || touchStart.verse !== verseNum) return;
    const pressDuration = Date.now() - touchStart.time;
    if (pressDuration > 500) {
      handleVerseLongPress(verseNum);
    }
    setTouchStart(null);
  };

  const handleHighlightVerse = async (verseNum: number, color: VerseHighlight["color"]) => {
    if (!user || !selectedBook || !selectedChapter) return;

    try {
      const isHighlighted = verseHighlights.has(verseNum);
      const currentColor = verseHighlights.get(verseNum);
      
      if (isHighlighted && currentColor === color) {
        await removeVerseHighlight(user.id, "bible-consultation", selectedBook, selectedChapter, verseNum);
        const newMap = new Map(verseHighlights);
        newMap.delete(verseNum);
        setVerseHighlights(newMap);
      } else {
        await saveVerseHighlight(user.id, "bible-consultation", selectedBook, selectedChapter, verseNum, color);
        const newMap = new Map(verseHighlights);
        newMap.set(verseNum, color);
        setVerseHighlights(newMap);
      }
    } catch (error) {
      console.error("Error highlighting verse:", error);
      alert("Erro ao destacar versículo. Tente novamente.");
    } finally {
      setShowHighlightMenu(false);
      setSelectedVerse(null);
    }
  };

  const getHighlightColor = (verseNum: number): { bg: string; border: string; text: string } | null => {
    const color = verseHighlights.get(verseNum);
    if (!color) return null;
    
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      yellow: { 
        bg: "rgba(234, 179, 8, 0.12)", 
        border: "rgba(234, 179, 8, 0.4)",
        text: "rgba(234, 179, 8, 0.95)"
      },
      green: { 
        bg: "rgba(34, 197, 94, 0.12)", 
        border: "rgba(34, 197, 94, 0.4)",
        text: "rgba(34, 197, 94, 0.95)"
      },
      blue: { 
        bg: "rgba(59, 130, 246, 0.12)", 
        border: "rgba(59, 130, 246, 0.4)",
        text: "rgba(59, 130, 246, 0.95)"
      },
      pink: { 
        bg: "rgba(236, 72, 153, 0.12)", 
        border: "rgba(236, 72, 153, 0.4)",
        text: "rgba(236, 72, 153, 0.95)"
      },
      purple: { 
        bg: "rgba(168, 85, 247, 0.12)", 
        border: "rgba(168, 85, 247, 0.4)",
        text: "rgba(168, 85, 247, 0.95)"
      },
    };
    return colors[color] || null;
  };

  const getNextChapter = () => {
    if (!selectedBook || !selectedChapter) return null;
    const book = books.find(b => b.name === selectedBook);
    if (!book) return null;
    if (selectedChapter >= book.chapters) return null;
    return selectedChapter + 1;
  };

  const getPrevChapter = () => {
    if (!selectedChapter) return null;
    if (selectedChapter <= 1) return null;
    return selectedChapter - 1;
  };

  const oldTestamentBooks = books.slice(0, 39);
  const newTestamentBooks = books.slice(39);

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTestament = 
      testament === "all" ? true :
      testament === "old" ? oldTestamentBooks.includes(book) :
      newTestamentBooks.includes(book);
    return matchesSearch && matchesTestament;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A12' }}>
        <div className="text-lg font-light tracking-wide" style={{ color: '#8B8BA3' }}>Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A12' }}>
      {/* Header mais minimalista e elegante */}
      <header className="sticky top-0 z-10 backdrop-blur-xl border-b" style={{ 
        background: 'rgba(10, 10, 18, 0.85)', 
        borderColor: 'rgba(255, 255, 255, 0.06)',
        boxShadow: '0 1px 0 rgba(255, 255, 255, 0.03) inset'
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-4 group transition-all"
            style={{ color: '#8B8BA3' }}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium hidden sm:inline">Voltar</span>
            <span className="text-sm font-medium sm:hidden">Início</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight" style={{ color: '#F5F5F7', letterSpacing: '-0.02em' }}>
                Consultar Bíblia
              </h1>
              <p className="text-sm mt-1.5 font-light" style={{ color: '#6B6B7F' }}>
                {selectedBook && selectedChapter ? `${selectedBook} ${selectedChapter}` : "Acesse qualquer capítulo da Bíblia"}
              </p>
            </div>
            {selectedBook && selectedChapter && (
              <div className="flex items-center gap-2">
                {getPrevChapter() && (
                  <button
                    onClick={() => loadChapter(selectedBook, getPrevChapter()!)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all touch-target"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      color: '#B8B8C8',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Anterior</span>
                  </button>
                )}
                {getNextChapter() && (
                  <button
                    onClick={() => loadChapter(selectedBook, getNextChapter()!)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all touch-target"
                    style={{ 
                      background: 'linear-gradient(135deg, #A98BFF 0%, #8B6FDB 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(169, 139, 255, 0.25)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(169, 139, 255, 0.35)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(169, 139, 255, 0.25)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span className="text-sm font-medium hidden sm:inline">Próximo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!selectedBook ? (
          <>
            {/* Busca e Filtros - Design mais limpo */}
            <div className="mb-6 sm:mb-8">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6B6B7F' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar livro..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border transition-all text-base font-light"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#F5F5F7'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(169, 139, 255, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  <button
                    onClick={() => setTestament("all")}
                    className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all touch-target text-sm ${
                      testament === "all" ? "" : ""
                    }`}
                    style={testament === "all" ? {
                      background: 'linear-gradient(135deg, #A98BFF 0%, #8B6FDB 100%)',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(169, 139, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#B8B8C8',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    Toda a Bíblia
                  </button>
                  <button
                    onClick={() => setTestament("old")}
                    className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all touch-target text-sm ${
                      testament === "old" ? "" : ""
                    }`}
                    style={testament === "old" ? {
                      background: 'linear-gradient(135deg, #A98BFF 0%, #8B6FDB 100%)',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(169, 139, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#B8B8C8',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    Antigo Testamento
                  </button>
                  <button
                    onClick={() => setTestament("new")}
                    className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all touch-target text-sm ${
                      testament === "new" ? "" : ""
                    }`}
                    style={testament === "new" ? {
                      background: 'linear-gradient(135deg, #A98BFF 0%, #8B6FDB 100%)',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(169, 139, 255, 0.2)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#B8B8C8',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    Novo Testamento
                  </button>
                </div>

                <p className="text-sm font-light" style={{ color: '#6B6B7F' }}>
                  {filteredBooks.length} livro{filteredBooks.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Lista de Livros - Cards mais elegantes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredBooks.map((book) => (
                <button
                  key={book.name}
                  onClick={() => setSelectedBook(book.name)}
                  className="p-4 sm:p-5 rounded-2xl transition-all text-left touch-target group"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(169, 139, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl" style={{ background: 'rgba(169, 139, 255, 0.15)' }}>
                        <BookOpen className="w-5 h-5" style={{ color: '#A98BFF' }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg mb-0.5" style={{ color: '#F5F5F7' }}>{book.name}</h3>
                        <p className="text-sm font-light" style={{ color: '#8B8BA3' }}>{book.chapters} capítulos</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: '#6B6B7F' }} />
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : !selectedChapter ? (
          <>
            {/* Seleção de Capítulo - Grid mais limpo */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-2xl sm:text-3xl font-light tracking-tight" style={{ color: '#F5F5F7', letterSpacing: '-0.02em' }}>{selectedBook}</h2>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="px-5 py-2.5 rounded-full font-medium transition-all touch-target text-sm self-start sm:self-auto"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#B8B8C8',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  Voltar aos livros
                </button>
              </div>
              <p className="mb-4 text-sm font-light" style={{ color: '#8B8BA3' }}>Selecione um capítulo:</p>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2.5">
                {Array.from({ length: books.find(b => b.name === selectedBook)?.chapters || 0 }, (_, i) => i + 1).map((chapter) => (
                  <button
                    key={chapter}
                    onClick={() => loadChapter(selectedBook, chapter)}
                    className="font-medium py-3 rounded-xl transition-all button-press touch-target text-sm sm:text-base"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#B8B8C8',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #A98BFF 0%, #8B6FDB 100%)';
                      e.currentTarget.style.color = '#FFFFFF';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(169, 139, 255, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#B8B8C8';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {chapter}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Texto do Capítulo - Foco total na leitura */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-1" style={{ color: '#F5F5F7', letterSpacing: '-0.02em' }}>
                    {selectedBook} {selectedChapter}
                  </h2>
                  <p className="text-sm font-light" style={{ color: '#6B6B7F' }}>Nova Versão Internacional</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedChapter(null)}
                    className="px-4 py-2 rounded-full font-medium text-sm transition-all touch-target"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#B8B8C8',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    Outros capítulos
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBook(null);
                      setSelectedChapter(null);
                    }}
                    className="px-4 py-2 rounded-full font-medium text-sm transition-all touch-target"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      color: '#8B8BA3'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                  >
                    Livros
                  </button>
                </div>
              </div>

              {loadingChapter ? (
                <div className="text-center py-16">
                  <div className="text-base font-light" style={{ color: '#8B8BA3' }}>Carregando capítulo...</div>
                </div>
              ) : chapterText ? (
                <div className="space-y-4 sm:space-y-5">
                  <p className="text-xs font-light mb-6 text-center" style={{ color: '#6B6B7F' }}>
                    Toque e segure um versículo para destacar
                  </p>
                  <div style={{ 
                    maxWidth: '680px', 
                    margin: '0 auto',
                    padding: '0 8px'
                  }}>
                    {Object.entries(chapterText).map(([verse, text]) => {
                      const verseNum = parseInt(verse);
                      const highlight = getHighlightColor(verseNum);
                      const isHighlighted = !!highlight;
                      return (
                        <div
                          key={verse}
                          className="mb-4 sm:mb-5 leading-relaxed relative group"
                          style={{ lineHeight: '1.75' }}
                        >
                          <p 
                            className="text-base sm:text-lg md:text-xl verse-text touch-target transition-all rounded-2xl px-4 sm:px-5 py-3 sm:py-4 relative"
                            onClick={() => handleVerseClick(verseNum)}
                            onTouchStart={() => handleTouchStart(verseNum)}
                            onTouchEnd={() => handleTouchEnd(verseNum)}
                            style={{ 
                              color: highlight?.text || '#E8E8ED',
                              backgroundColor: highlight?.bg || 'transparent',
                              borderLeft: highlight ? `4px solid ${highlight.border}` : 'none',
                              paddingLeft: highlight ? '20px' : '16px',
                              paddingRight: '16px',
                              lineHeight: '1.8',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
                              fontWeight: '400',
                              letterSpacing: '0.01em'
                            }}
                          >
                            <span 
                              className="verse-number font-semibold mr-3 sm:mr-4 inline-block align-top" 
                              style={{ 
                                color: highlight?.text || '#A98BFF', 
                                minWidth: '44px',
                                fontWeight: '600',
                                fontSize: '0.9em',
                                opacity: '0.85'
                              }}
                            >
                              {verse}
                            </span>
                            <span className="inline-block flex-1" style={{ wordSpacing: '0.05em' }}>{text}</span>
                          </p>
                          {/* Botão de highlight - apenas quando não está destacado */}
                          {!isHighlighted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerseLongPress(verseNum);
                              }}
                              className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity p-2.5 rounded-xl hover-lift touch-target"
                              style={{ 
                                background: 'rgba(10, 10, 18, 0.85)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                                zIndex: 10
                              }}
                              title="Destacar versículo"
                            >
                              <Highlighter className="w-4 h-4" style={{ color: '#A98BFF' }} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-base font-light" style={{ color: '#8B8BA3' }}>Capítulo não disponível</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Notificação de Plano Atualizado - Mais discreta */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in max-w-sm">
          <div className="p-4 rounded-2xl shadow-2xl" style={{
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#8AE6BF' }} />
              <div className="flex-1">
                <p className="font-medium text-sm mb-2" style={{ color: '#F5F5F7' }}>
                  {notification.message}
                </p>
                {notification.plans.length > 0 && (
                  <ul className="space-y-1">
                    {notification.plans.map((planName, idx) => (
                      <li key={idx} className="text-xs font-light" style={{ color: '#8B8BA3' }}>
                        • {planName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setNotification(null)}
                className="hover-lift ml-2 p-1 rounded-lg transition-all"
                style={{ color: '#6B6B7F' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu de Highlight - Mais elegante */}
      {showHighlightMenu && selectedVerse && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm" 
          onClick={() => setShowHighlightMenu(false)}
          style={{ background: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div 
            className="p-6 rounded-3xl max-w-sm w-full mx-4" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(20, 20, 30, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg" style={{ color: '#F5F5F7' }}>Destacar Versículo {selectedVerse}</h3>
              <button
                onClick={() => setShowHighlightMenu(false)}
                className="p-2 rounded-xl transition-all"
                style={{ 
                  color: '#8B8BA3',
                  background: 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {(["yellow", "green", "blue", "pink", "purple"] as VerseHighlight["color"][]).map((color) => {
                const isActive = verseHighlights.get(selectedVerse) === color;
                const colorStyles: Record<string, { bg: string; hover: string }> = {
                  yellow: { bg: '#FACC15', hover: '#FDE047' },
                  green: { bg: '#22C55E', hover: '#4ADE80' },
                  blue: { bg: '#3B82F6', hover: '#60A5FA' },
                  pink: { bg: '#EC4899', hover: '#F472B6' },
                  purple: { bg: '#A855F7', hover: '#C084FC' },
                };
                return (
                  <button
                    key={color}
                    onClick={() => handleHighlightVerse(selectedVerse, color)}
                    className="w-14 h-14 rounded-2xl transition-all touch-target"
                    style={{
                      background: colorStyles[color].bg,
                      boxShadow: isActive ? `0 0 0 3px rgba(255, 255, 255, 0.3), 0 4px 12px ${colorStyles[color].bg}40` : '0 2px 8px rgba(0, 0, 0, 0.3)',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = colorStyles[color].hover;
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = colorStyles[color].bg;
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                    title={isActive ? "Remover destaque" : `Destacar em ${color}`}
                  />
                );
              })}
            </div>
            <p className="text-xs font-light mt-5 text-center" style={{ color: '#8B8BA3' }}>
              {verseHighlights.has(selectedVerse) ? "Clique na cor para remover" : "Escolha uma cor para destacar"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}