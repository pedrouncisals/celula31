"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { ArrowLeft, Plus, FileText, Calendar, Trash2, Edit2, BookOpen, Search, X, Filter, Eye } from "lucide-react";

interface Sermon {
  id: string;
  title: string;
  passage: string; // Ex: "João 3:16"
  date: string; // ISO string
  createdAt: string;
  authorId: string;
  tags?: string[];
}

export default function SermonsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [filteredSermons, setFilteredSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "month" | "year">("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadSermons();
    }
  }, [user, authLoading, router]);

  const loadSermons = async () => {
    if (!user) return;

    try {
      const sermonsQuery = query(
        collection(db, "sermons"),
        where("authorId", "==", user.id)
      );
      const snapshot = await getDocs(sermonsQuery);

      const sermonsList: Sermon[] = [];
      snapshot.forEach((doc) => {
        sermonsList.push({ id: doc.id, ...doc.data() } as Sermon);
      });

      // Ordenar localmente por data (mais recente primeiro)
      sermonsList.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      setSermons(sermonsList);
      setFilteredSermons(sermonsList);
    } catch (error) {
      console.error("Error loading sermons:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar sermões
  useEffect(() => {
    let filtered = [...sermons];

    // Busca por título ou passagem
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.passage.toLowerCase().includes(query)
      );
    }

    // Filtro por tag
    if (selectedTag) {
      filtered = filtered.filter(
        (s) => s.tags && s.tags.includes(selectedTag)
      );
    }

    // Filtro por data
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((s) => {
        const sermonDate = new Date(s.date);
        if (dateFilter === "month") {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return sermonDate >= monthAgo;
        } else if (dateFilter === "year") {
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return sermonDate >= yearAgo;
        }
        return true;
      });
    }

    setFilteredSermons(filtered);
  }, [sermons, searchQuery, selectedTag, dateFilter]);

  // Obter todas as tags únicas
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    sermons.forEach((s) => {
      if (s.tags) {
        s.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [sermons]);

  const handleDeleteSermon = async (sermonId: string) => {
    if (!confirm("Tem certeza que deseja excluir este sermão?")) return;

    try {
      await deleteDoc(doc(db, "sermons", sermonId));
      await loadSermons();
    } catch (error) {
      console.error("Error deleting sermon:", error);
    }
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
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Criador de Sermões</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Organize e crie seus sermões</p>
            </div>
            <Link
              href="/sermons/create"
              className="btn-violet flex items-center gap-2 hover-lift"
            >
              <Plus className="w-5 h-5" />
              Novo Sermão
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Busca e Filtros */}
        {sermons.length > 0 && (
          <div className="card-premium p-6 mb-6 animate-fade-in">
            <div className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por título ou passagem bíblica..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover-lift"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Filtros:</span>
                </div>

                {/* Filtro por data */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as "all" | "month" | "year")}
                  className="px-3 py-1.5 rounded-lg border transition-all text-sm"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="all">Todas as datas</option>
                  <option value="month">Último mês</option>
                  <option value="year">Último ano</option>
                </select>

                {/* Filtro por tag */}
                {allTags.length > 0 && (
                  <select
                    value={selectedTag || ""}
                    onChange={(e) => setSelectedTag(e.target.value || null)}
                    className="px-3 py-1.5 rounded-lg border transition-all text-sm"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Todas as tags</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                )}

                {/* Limpar filtros */}
                {(searchQuery || selectedTag || dateFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedTag(null);
                      setDateFilter("all");
                    }}
                    className="flex items-center gap-1 text-sm hover-lift"
                    style={{ color: 'var(--accent-violet)' }}
                  >
                    <X className="w-4 h-4" />
                    Limpar filtros
                  </button>
                )}
              </div>

              {/* Resultados */}
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {filteredSermons.length === sermons.length ? (
                  <span>{sermons.length} sermão{sermons.length !== 1 ? "s" : ""}</span>
                ) : (
                  <span>
                    {filteredSermons.length} de {sermons.length} sermão{sermons.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {sermons.length === 0 ? (
          <div className="text-center py-16 card-premium">
            <FileText className="w-20 h-20 mx-auto mb-6" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Nenhum sermão ainda</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Crie seu primeiro sermão e comece a organizar suas mensagens</p>
            <Link
              href="/sermons/create"
              className="inline-flex items-center gap-2 btn-violet hover-lift"
            >
              <Plus className="w-5 h-5" />
              Criar Primeiro Sermão
            </Link>
          </div>
        ) : filteredSermons.length === 0 ? (
          <div className="text-center py-16 card-premium">
            <Search className="w-20 h-20 mx-auto mb-6" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Nenhum sermão encontrado</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Tente ajustar os filtros de busca</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedTag(null);
                setDateFilter("all");
              }}
              className="inline-flex items-center gap-2 btn-violet hover-lift"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSermons.map((sermon) => (
              <div
                key={sermon.id}
                className="card-premium p-6 hover-lift hover-glow-violet animate-fade-in"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {sermon.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                      <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-violet)' }} />
                      <span className="font-medium">{sermon.passage}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(sermon.date).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {sermon.tags && sermon.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sermon.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-0.5 rounded text-xs"
                            style={{ background: 'rgba(169, 139, 255, 0.2)', color: 'var(--accent-violet)' }}
                          >
                            {tag}
                          </span>
                        ))}
                        {sermon.tags.length > 3 && (
                          <span className="inline-block text-xs" style={{ color: 'var(--text-muted)' }}>
                            +{sermon.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <Link
                    href={`/sermons/${sermon.id}/view`}
                    className="flex-1 flex items-center justify-center gap-2 btn-emerald hover-lift text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </Link>
                  <Link
                    href={`/sermons/${sermon.id}`}
                    className="flex items-center justify-center gap-2 btn-violet hover-lift text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDeleteSermon(sermon.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all button-press text-sm font-medium hover-lift"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

