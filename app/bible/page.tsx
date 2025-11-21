"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAvailableBooks, getBibleChapter } from "@/lib/bible";
import { getChapterHighlights as getVerseHighlights, saveVerseHighlight, removeVerseHighlight } from "@/lib/verse-highlights";
import type { VerseHighlight } from "@/lib/verse-highlights";
import { autoMarkChapterAsRead } from "@/lib/reading-plans";
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
      
      // Marcar automaticamente em planos de leitura ativos
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
        bg: "rgba(234, 179, 8, 0.15)", 
        border: "rgba(234, 179, 8, 0.5)",
        text: "rgba(234, 179, 8, 0.9)"
      },
      green: { 
        bg: "rgba(34, 197, 94, 0.15)", 
        border: "rgba(34, 197, 94, 0.5)",
        text: "rgba(34, 197, 94, 0.9)"
      },
      blue: { 
        bg: "rgba(59, 130, 246, 0.15)", 
        border: "rgba(59, 130, 246, 0.5)",
        text: "rgba(59, 130, 246, 0.9)"
      },
      pink: { 
        bg: "rgba(236, 72, 153, 0.15)", 
        border: "rgba(236, 72, 153, 0.5)",
        text: "rgba(236, 72, 153, 0.9)"
      },
      purple: { 
        bg: "rgba(168, 85, 247, 0.15)", 
        border: "rgba(168, 85, 247, 0.5)",
        text: "rgba(168, 85, 247, 0.9)"
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-3 sm:mb-4 hover-lift touch-target px-2 -ml-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
            <span className="sm:hidden">Início</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Consultar Bíblia</h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {selectedBook && selectedChapter ? `${selectedBook} - Cap. ${selectedChapter}` : "Acesse qualquer capítulo da Bíblia"}
              </p>
            </div>
            {selectedBook && selectedChapter && (
              <div className="flex items-center gap-2">
                {getPrevChapter() && (
                  <button
                    onClick={() => loadChapter(selectedBook, getPrevChapter()!)}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg hover-lift transition-all touch-target"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>
                )}
                {getNextChapter() && (
                  <button
                    onClick={() => loadChapter(selectedBook, getNextChapter()!)}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg btn-violet hover-lift touch-target"
                  >
                    <span className="hidden sm:inline">Próximo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8">
        {!selectedBook ? (
          <>
            {/* Busca e Filtros */}
            <div className="card-premium p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 animate-fade-in">
              <div className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar livro..."
                    className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border transition-all text-sm sm:text-base touch-target"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  <button
                    onClick={() => setTestament("all")}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all hover-lift touch-target text-xs sm:text-sm ${
                      testament === "all" ? "btn-gold" : ""
                    }`}
                    style={testament !== "all" ? {
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)'
                    } : {}}
                  >
                    Toda a Bíblia
                  </button>
                  <button
                    onClick={() => setTestament("old")}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all hover-lift touch-target text-xs sm:text-sm ${
                      testament === "old" ? "btn-gold" : ""
                    }`}
                    style={testament !== "old" ? {
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)'
                    } : {}}
                  >
                    Antigo Testamento
                  </button>
                  <button
                    onClick={() => setTestament("new")}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all hover-lift touch-target text-xs sm:text-sm ${
                      testament === "new" ? "btn-gold" : ""
                    }`}
                    style={testament !== "new" ? {
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)'
                    } : {}}
                  >
                    Novo Testamento
                  </button>
                </div>

                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {filteredBooks.length} livro{filteredBooks.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Lista de Livros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredBooks.map((book) => (
                <button
                  key={book.name}
                  onClick={() => setSelectedBook(book.name)}
                  className="card-premium p-3 sm:p-4 md:p-6 hover-lift hover-glow-gold animate-fade-in text-left touch-target"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: 'var(--gradient-gold)' }}>
                        <BookOpen className="w-6 h-6" style={{ color: 'var(--bg-primary)' }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>{book.name}</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{book.chapters} capítulos</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : !selectedChapter ? (
          <>
            {/* Seleção de Capítulo */}
            <div className="card-premium p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedBook}</h2>
                <button
                  onClick={() => setSelectedBook(null)}
                  className="font-medium hover-lift btn-gold touch-target px-3 py-2 text-xs sm:text-sm self-start sm:self-auto"
                >
                  Voltar aos livros
                </button>
              </div>
              <p className="mb-3 sm:mb-4 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Selecione um capítulo:</p>
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-2 md:gap-3">
                {Array.from({ length: books.find(b => b.name === selectedBook)?.chapters || 0 }, (_, i) => i + 1).map((chapter) => (
                  <button
                    key={chapter}
                    onClick={() => loadChapter(selectedBook, chapter)}
                    className="font-semibold p-2 sm:p-3 md:p-4 rounded-lg transition-all button-press hover-lift touch-target text-xs sm:text-sm md:text-base"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--accent-gold)',
                      border: '1px solid var(--border-subtle)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--gradient-gold)';
                      e.currentTarget.style.color = 'var(--bg-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--accent-gold)';
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
            {/* Texto do Capítulo */}
            <div className="card-premium p-3 sm:p-4 md:p-8 animate-fade-in">
              <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3 sm:gap-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedBook} - Cap. {selectedChapter}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedChapter(null)}
                    className="font-medium text-sm md:text-base hover-lift btn-gold"
                  >
                    Outros capítulos
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBook(null);
                      setSelectedChapter(null);
                    }}
                    className="font-medium text-sm md:text-base hover-lift"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Voltar aos livros
                  </button>
                </div>
              </div>

              {loadingChapter ? (
                <div className="text-center py-12">
                  <div style={{ color: 'var(--text-secondary)' }}>Carregando capítulo...</div>
                </div>
              ) : chapterText ? (
                <div className="space-y-3 md:space-y-4">
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    Toque e segure um versículo para destacar
                  </p>
                  {Object.entries(chapterText).map(([verse, text]) => {
                    const verseNum = parseInt(verse);
                    const highlight = getHighlightColor(verseNum);
                    const isHighlighted = !!highlight;
                    return (
                      <div
                        key={verse}
                        className="mb-1.5 sm:mb-2 leading-relaxed relative group"
                      >
                        <p 
                          className="text-sm sm:text-base md:text-lg verse-text touch-target transition-all rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 relative"
                          onClick={() => handleVerseClick(verseNum)}
                          onTouchStart={() => handleTouchStart(verseNum)}
                          onTouchEnd={() => handleTouchEnd(verseNum)}
                          style={{ 
                            color: highlight?.text || 'var(--text-secondary)',
                            backgroundColor: highlight?.bg || 'transparent',
                            borderLeft: highlight ? `3px solid ${highlight.border}` : 'none',
                            border: highlight ? `1px solid ${highlight.border}` : 'none',
                            minHeight: '36px',
                            paddingLeft: highlight ? '12px' : '8px',
                            paddingRight: '8px',
                            lineHeight: '1.6'
                          }}
                        >
                          <span 
                            className="verse-number font-semibold mr-2 sm:mr-3 inline-block align-top" 
                            style={{ 
                              color: highlight?.text || 'var(--accent-gold)', 
                              minWidth: '36px',
                              fontWeight: '600'
                            }}
                          >
                            {verse}
                          </span>
                          <span className="inline-block flex-1">{text}</span>
                        </p>
                        {/* Botão de highlight - apenas quando não está destacado */}
                        {!isHighlighted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerseLongPress(verseNum);
                            }}
                            className="absolute right-2 top-2 sm:right-3 sm:top-3 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity p-2 rounded-lg hover-lift touch-target"
                            style={{ 
                              background: 'var(--bg-tertiary)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              zIndex: 10
                            }}
                            title="Destacar versículo"
                          >
                            <Highlighter className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--accent-gold)' }} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p style={{ color: 'var(--text-secondary)' }}>Capítulo não disponível</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Notificação de Plano Atualizado */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
          <div className="card-premium p-4 max-w-sm shadow-2xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-green)' }} />
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {notification.message}
                </p>
                {notification.plans.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {notification.plans.map((planName, idx) => (
                      <li key={idx} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        • {planName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setNotification(null)}
                className="hover-lift ml-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu de Highlight */}
      {showHighlightMenu && selectedVerse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowHighlightMenu(false)}>
          <div className="card-premium p-4 animate-bounce-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Destacar Versículo {selectedVerse}</h3>
              <button
                onClick={() => setShowHighlightMenu(false)}
                className="hover-lift"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["yellow", "green", "blue", "pink", "purple"] as VerseHighlight["color"][]).map((color) => {
                const isActive = verseHighlights.get(selectedVerse) === color;
                const colorClasses = {
                  yellow: "bg-yellow-500",
                  green: "bg-green-500",
                  blue: "bg-blue-500",
                  pink: "bg-pink-500",
                  purple: "bg-purple-500",
                };
                return (
                  <button
                    key={color}
                    onClick={() => handleHighlightVerse(selectedVerse, color)}
                    className={`w-12 h-12 rounded-lg transition-all hover:scale-110 ${colorClasses[color]} ${isActive ? "ring-2 ring-white" : ""}`}
                    title={isActive ? "Remover destaque" : `Destacar em ${color}`}
                  />
                );
              })}
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              {verseHighlights.has(selectedVerse) ? "Clique na cor para remover" : "Escolha uma cor para destacar"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
