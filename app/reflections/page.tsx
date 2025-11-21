"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { collection, getDocs, addDoc, query, orderBy, doc, getDoc, updateDoc, arrayUnion, arrayRemove, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Reflection, ReflectionComment } from "@/types";
import Link from "next/link";
import { ArrowLeft, Plus, Heart, BookMarked, Calendar, User as UserIcon, Edit2, Trash2, Save, X, MessageCircle, Send, ChevronDown, ChevronUp, Search, Trophy, TrendingUp, Church } from "lucide-react";

export default function ReflectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [likingInProgress, setLikingInProgress] = useState<Set<string>>(new Set());
  const [expandedReflections, setExpandedReflections] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Map<string, ReflectionComment[]>>(new Map());
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"likes" | "date">("likes");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadReflections();
    }
  }, [user, authLoading, router]);

  const loadReflections = async () => {
    try {
      const reflectionsQuery = query(
        collection(db, "reflections"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(reflectionsQuery);

      const reflectionsList: Reflection[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.deleted) continue;
        
        const authorDoc = await getDoc(doc(db, "users", data.authorId));
        const authorData = authorDoc.data();

        reflectionsList.push({
          id: docSnap.id,
          ...data,
          authorName: authorData?.name || "Usuário",
          authorPhoto: authorData?.photoUrl || "",
          authorFavoriteVerse: authorData?.favoriteVerse || "",
          authorChurch: authorData?.church || "",
        } as Reflection);
      }

      // Ordenar por likes ou data
      reflectionsList.sort((a, b) => {
        if (sortBy === "likes") {
          if (b.likes !== a.likes) {
            return b.likes - a.likes;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });

      setReflections(reflectionsList);
    } catch (error) {
      console.error("Error loading reflections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadReflections();
    }
  }, [sortBy]);

  const loadComments = async (reflectionId: string) => {
    try {
      const commentsQuery = query(
        collection(db, "reflections", reflectionId, "comments"),
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(commentsQuery);

      const commentsList: ReflectionComment[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const authorDoc = await getDoc(doc(db, "users", data.authorId));
        const authorData = authorDoc.data();

        commentsList.push({
          id: docSnap.id,
          ...data,
          authorName: authorData?.name || "Usuário",
          authorPhoto: authorData?.photoUrl || "",
          authorFavoriteVerse: authorData?.favoriteVerse || "",
          authorChurch: authorData?.church || "",
        } as ReflectionComment);
      }

      setComments(prev => new Map(prev).set(reflectionId, commentsList));
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, "reflections", editingId), {
          title: title.trim(),
          content: content.trim(),
        });
      } else {
        await addDoc(collection(db, "reflections"), {
          authorId: user.id,
          title: title.trim(),
          content: content.trim(),
          likes: 0,
          likedBy: [],
          createdAt: new Date().toISOString(),
        });
      }

      setTitle("");
      setContent("");
      setShowForm(false);
      setEditingId(null);
      loadReflections();
    } catch (error) {
      console.error("Error saving reflection:", error);
      alert("Erro ao salvar reflexão. Tente novamente.");
    }
  };

  const handleLike = async (reflectionId: string) => {
    if (!user || likingInProgress.has(reflectionId)) return;

    const reflection = reflections.find(r => r.id === reflectionId);
    if (!reflection) return;

    const hasLiked = reflection.likedBy?.includes(user.id) || false;

    setLikingInProgress(prev => new Set(prev).add(reflectionId));

    try {
      if (hasLiked) {
        await updateDoc(doc(db, "reflections", reflectionId), {
          likes: (reflection.likes || 0) - 1,
          likedBy: arrayRemove(user.id),
        });
      } else {
        await updateDoc(doc(db, "reflections", reflectionId), {
          likes: (reflection.likes || 0) + 1,
          likedBy: arrayUnion(user.id),
        });
      }

      loadReflections();
    } catch (error) {
      console.error("Error liking reflection:", error);
    } finally {
      setLikingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(reflectionId);
        return newSet;
      });
    }
  };

  const handleComment = async (reflectionId: string) => {
    if (!user) return;
    const commentText = commentTexts.get(reflectionId) || "";
    if (!commentText.trim()) return;

    try {
      await addDoc(collection(db, "reflections", reflectionId, "comments"), {
        authorId: user.id,
        reflectionId: reflectionId,
        message: commentText.trim(),
        createdAt: new Date().toISOString(),
      });

      setCommentTexts(prev => {
        const newMap = new Map(prev);
        newMap.set(reflectionId, "");
        return newMap;
      });
      loadComments(reflectionId);
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Erro ao adicionar comentário. Tente novamente.");
    }
  };

  const handleDeleteComment = async (reflectionId: string, commentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este comentário?")) return;

    try {
      await updateDoc(doc(db, "reflections", reflectionId, "comments", commentId), {
        deleted: true,
      });
      loadComments(reflectionId);
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const toggleExpand = (reflectionId: string) => {
    setExpandedReflections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reflectionId)) {
        newSet.delete(reflectionId);
      } else {
        newSet.add(reflectionId);
      }
      return newSet;
    });
  };

  const toggleComments = (reflectionId: string) => {
    setShowComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reflectionId)) {
        newSet.delete(reflectionId);
      } else {
        newSet.add(reflectionId);
        if (!comments.has(reflectionId)) {
          loadComments(reflectionId);
        }
      }
      return newSet;
    });
  };

  const handleEdit = (reflection: Reflection) => {
    setTitle(reflection.title);
    setContent(reflection.content);
    setEditingId(reflection.id);
    setShowForm(true);
  };

  const handleDelete = async (reflectionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta reflexão?")) return;

    try {
      await updateDoc(doc(db, "reflections", reflectionId), {
        deleted: true,
      });
      loadReflections();
    } catch (error) {
      console.error("Error deleting reflection:", error);
      alert("Erro ao excluir reflexão. Tente novamente.");
    }
  };

  const canEdit = (reflection: Reflection): boolean => {
    if (!user) return false;
    return reflection.authorId === user.id;
  };

  const filteredReflections = reflections.filter(reflection => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      reflection.title.toLowerCase().includes(query) ||
      reflection.content.toLowerCase().includes(query) ||
      reflection.authorName?.toLowerCase().includes(query)
    );
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
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 hover-lift touch-target px-2 -ml-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setTitle("");
                  setContent("");
                  setEditingId(null);
                }
              }}
              className="flex items-center gap-2 btn-emerald hover-lift text-sm sm:text-base px-3 sm:px-4"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{showForm ? "Cancelar" : "Nova Reflexão"}</span>
              <span className="sm:hidden">{showForm ? "Cancelar" : "Nova"}</span>
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" style={{ color: 'var(--text-primary)' }}>Reflexões</h1>
          <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: 'var(--text-secondary)' }}>
            Compartilhe suas experiências, insights e reflexões sobre a Palavra de Deus
          </p>
          
          {/* Busca e Filtros */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar reflexões..."
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-2 rounded-lg border transition-all text-sm sm:text-base touch-target"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy("likes")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-all hover-lift touch-target text-xs sm:text-sm flex-1 ${
                  sortBy === "likes" ? "btn-gold" : ""
                }`}
                style={sortBy !== "likes" ? {
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                } : {}}
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Mais Curtidas</span>
                <span className="sm:hidden">Curtidas</span>
              </button>
              <button
                onClick={() => setSortBy("date")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-all hover-lift touch-target text-xs sm:text-sm flex-1 ${
                  sortBy === "date" ? "btn-violet" : ""
                }`}
                style={sortBy !== "date" ? {
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                } : {}}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Mais Recentes</span>
                <span className="sm:hidden">Recentes</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Formulário de Nova/Editar Reflexão */}
        {showForm && (
          <div className="card-premium p-6 mb-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editingId ? "Editar Reflexão" : "Nova Reflexão"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da reflexão"
                className="w-full px-3 sm:px-4 py-3 rounded-lg border transition-all text-sm sm:text-base touch-target"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
                required
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreva sua reflexão aqui..."
                rows={10}
                className="w-full px-3 sm:px-4 py-3 rounded-lg border transition-all resize-none text-sm sm:text-base"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
                required
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-emerald hover-lift flex-1"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  {editingId ? "Salvar Alterações" : "Publicar Reflexão"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                    setContent("");
                    setEditingId(null);
                  }}
                  className="px-4 py-2 rounded-lg transition-all hover-lift"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Reflexões */}
        {filteredReflections.length === 0 ? (
          <div className="card-premium p-12 text-center animate-fade-in">
            <BookMarked className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
              {searchQuery ? "Nenhuma reflexão encontrada" : "Nenhuma reflexão ainda"}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {searchQuery ? "Tente buscar com outros termos" : "Seja o primeiro a compartilhar uma reflexão!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReflections.map((reflection, index) => {
              const hasLiked = reflection.likedBy?.includes(user.id) || false;
              const isLiking = likingInProgress.has(reflection.id);
              const isExpanded = expandedReflections.has(reflection.id);
              const showCommentsForThis = showComments.has(reflection.id);
              const reflectionComments = comments.get(reflection.id) || [];
              const commentText = commentTexts.get(reflection.id) || "";

              return (
                <article
                  key={reflection.id}
                  className="card-premium p-4 md:p-6 animate-fade-in hover-lift"
                >
                  {/* Cabeçalho Compacto */}
                  <div className="flex items-start gap-3 mb-3">
                    {reflection.authorPhoto ? (
                      <img
                        src={reflection.authorPhoto}
                        alt={reflection.authorName}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
                        <UserIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                          {reflection.authorName}
                        </h3>
                        {index === 0 && sortBy === "likes" && reflection.likes > 0 && (
                          <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-gold)' }} />
                        )}
                        {canEdit(reflection) && (
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => handleEdit(reflection)}
                              className="hover-lift touch-target"
                              style={{ color: 'var(--accent-violet)' }}
                            >
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(reflection.id)}
                              className="hover-lift touch-target"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 mb-2">
                        {reflection.authorChurch && (
                          <div className="flex items-center gap-1">
                            <Church className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent-gold)' }} />
                            <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                              {reflection.authorChurch}
                            </span>
                          </div>
                        )}
                        {reflection.authorFavoriteVerse && (
                          <div className="flex items-center gap-1">
                            <BookMarked className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent-violet)' }} />
                            <span className="text-xs italic truncate" style={{ color: 'var(--accent-violet)' }}>
                              &quot;{reflection.authorFavoriteVerse}&quot;
                            </span>
                          </div>
                        )}
                      </div>
                      <h2 
                        className="text-base sm:text-lg font-bold mb-2 cursor-pointer hover:opacity-80 transition-opacity leading-tight"
                        onClick={() => toggleExpand(reflection.id)}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {reflection.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(reflection.createdAt).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" style={{ color: hasLiked ? '#ef4444' : 'var(--text-muted)' }} />
                          <span>{reflection.likes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{reflectionComments.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="mt-4 animate-fade-in">
                      <div
                        className="prose prose-invert max-w-none mb-4 leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {reflection.content.split('\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-4 text-base">
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-3 sm:gap-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                          onClick={() => handleLike(reflection.id)}
                          disabled={isLiking}
                          className={`flex items-center gap-2 transition-all hover-lift touch-target ${
                            isLiking ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          style={{ color: hasLiked ? '#ef4444' : 'var(--text-secondary)' }}
                        >
                          <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${hasLiked ? "fill-current" : ""} ${isLiking ? "animate-pulse" : ""}`} />
                          <span className="font-medium text-sm sm:text-base">{reflection.likes || 0}</span>
                        </button>
                        <button
                          onClick={() => toggleComments(reflection.id)}
                          className="flex items-center gap-2 transition-all hover-lift touch-target"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                          <span className="font-medium text-sm sm:text-base">{reflectionComments.length}</span>
                          {showCommentsForThis ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Comentários */}
                      {showCommentsForThis && (
                        <div className="mt-4 pt-4 animate-fade-in" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          {/* Formulário de Comentário */}
                          <div className="mb-4 flex gap-2">
                            {user.photoUrl ? (
                              <img
                                src={user.photoUrl}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
                                <UserIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                              </div>
                            )}
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={commentText}
                                onChange={(e) => {
                                  setCommentTexts(prev => new Map(prev).set(reflection.id, e.target.value));
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleComment(reflection.id);
                                  }
                                }}
                                placeholder="Escreva um comentário..."
                                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border transition-all text-sm sm:text-base touch-target"
                                style={{
                                  background: 'var(--bg-secondary)',
                                  borderColor: 'var(--border-subtle)',
                                  color: 'var(--text-primary)'
                                }}
                              />
                              <button
                                onClick={() => handleComment(reflection.id)}
                                className="btn-violet hover-lift px-3 sm:px-4 touch-target min-w-[44px]"
                              >
                                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Lista de Comentários */}
                          {reflectionComments.length === 0 ? (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                              Nenhum comentário ainda. Seja o primeiro!
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {reflectionComments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="flex gap-3 p-3 rounded-lg"
                                  style={{ background: 'var(--bg-secondary)' }}
                                >
                                  {comment.authorPhoto ? (
                                    <img
                                      src={comment.authorPhoto}
                                      alt={comment.authorName}
                                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
                                      <UserIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                        {comment.authorName}
                                      </p>
                                      {comment.authorId === user.id && (
                                        <button
                                          onClick={() => handleDeleteComment(reflection.id, comment.id)}
                                          className="hover-lift ml-auto touch-target"
                                          style={{ color: '#ef4444' }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                    {comment.authorChurch && (
                                      <div className="flex items-center gap-1 mb-1">
                                        <Church className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent-gold)' }} />
                                        <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                          {comment.authorChurch}
                                        </span>
                                      </div>
                                    )}
                                    {comment.authorFavoriteVerse && (
                                      <p className="text-xs italic mb-1" style={{ color: 'var(--accent-violet)' }}>
                                        &quot;{comment.authorFavoriteVerse}&quot;
                                      </p>
                                    )}
                                    <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                      {comment.message}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                      {new Date(comment.createdAt).toLocaleDateString("pt-BR", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botão para Expandir/Recolher */}
                  {!isExpanded && (
                    <button
                      onClick={() => toggleExpand(reflection.id)}
                      className="w-full mt-3 py-3 text-sm font-medium transition-all hover-lift flex items-center justify-center gap-2 touch-target rounded-lg"
                      style={{ 
                        color: 'var(--accent-violet)',
                        background: 'var(--bg-secondary)'
                      }}
                    >
                      Ver reflexão completa
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                  {isExpanded && (
                    <button
                      onClick={() => toggleExpand(reflection.id)}
                      className="w-full mt-3 py-3 text-sm font-medium transition-all hover-lift flex items-center justify-center gap-2 touch-target rounded-lg"
                      style={{ 
                        color: 'var(--text-muted)',
                        background: 'var(--bg-secondary)'
                      }}
                    >
                      Recolher
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
