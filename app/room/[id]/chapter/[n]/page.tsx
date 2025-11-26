"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Room, Summary, Comment } from "@/types";
import { calculateCurrentChapter, isChapterUnlocked, canEditSummary } from "@/lib/utils";
import { getBibleChapter } from "@/lib/bible";
import { getChapterHighlights } from "@/lib/highlights";
import { getChapterHighlights as getVerseHighlights, saveVerseHighlight, removeVerseHighlight } from "@/lib/verse-highlights";
import type { VerseHighlight } from "@/lib/verse-highlights";
import { autoMarkChapterAsRead } from "@/lib/reading-plans";
import Link from "next/link";
import { ArrowLeft, Heart, MessageCircle, Send, Edit2, Trash2, BookOpen, ChevronRight, Highlighter, X, CheckCircle2, BookMarked, Plus } from "lucide-react";

// Função para calcular blocos de versículos
function getVerseBlocks(verses: { [verse: string]: string }): Array<{ block: number; startVerse: number; endVerse: number; verses: { [verse: string]: string } }> {
  const verseNumbers = Object.keys(verses).map(Number).sort((a, b) => a - b);
  const blocks: Array<{ block: number; startVerse: number; endVerse: number; verses: { [verse: string]: string } }> = [];
  
  for (let i = 0; i < verseNumbers.length; i += 10) {
    const blockNum = Math.floor(i / 10) + 1;
    const startVerse = verseNumbers[i];
    const endVerse = verseNumbers[Math.min(i + 9, verseNumbers.length - 1)];
    const blockVerses: { [verse: string]: string } = {};
    
    for (let j = i; j < Math.min(i + 10, verseNumbers.length); j++) {
      const verseNum = verseNumbers[j];
      blockVerses[verseNum.toString()] = verses[verseNum.toString()];
    }
    
    blocks.push({
      block: blockNum,
      startVerse,
      endVerse,
      verses: blockVerses,
    });
  }
  
  return blocks;
}

export default function ChapterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const chapterNum = parseInt(params.n as string);
  const [room, setRoom] = useState<Room | null>(null);
  const [chapterText, setChapterText] = useState<{ [verse: string]: string } | null>(null);
  const [verseBlocks, setVerseBlocks] = useState<Array<{ block: number; startVerse: number; endVerse: number; verses: { [verse: string]: string } }>>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMoreSummaries, setLoadingMoreSummaries] = useState(false);
  const [lastSummaryDoc, setLastSummaryDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreSummaries, setHasMoreSummaries] = useState(true);
  const SUMMARY_PAGE_SIZE = 10;
  const [highlights, setHighlights] = useState<string[]>([]);
  const [showSummaryForm, setShowSummaryForm] = useState<number | null>(null); // block number
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [summaryTitle, setSummaryTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [application, setApplication] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [likingInProgress, setLikingInProgress] = useState<Set<string>>(new Set());
  const [verseHighlights, setVerseHighlights] = useState<Map<number, VerseHighlight["color"]>>(new Map());
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightingVerse, setHighlightingVerse] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<{ verse: number; time: number } | null>(null);
  const [notification, setNotification] = useState<{ message: string; plans: string[] } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && roomId && chapterNum) {
      loadData();
    }
  }, [user, authLoading, roomId, chapterNum, router]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Carregar sala
      const roomDoc = await getDoc(doc(db, "rooms", roomId));
      if (!roomDoc.exists()) {
        router.push("/home");
        return;
      }

      const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
      setRoom(roomData);

      // Verificar se é membro
      const memberDoc = await getDoc(doc(db, "rooms", roomId, "members", user.id));
      const member = memberDoc.exists();
      setIsMember(member);

      if (!member) {
        setLoading(false);
        return;
      }

      // Verificar se o capítulo está desbloqueado
      if (!isChapterUnlocked(roomData.startDate, chapterNum)) {
        router.push(`/room/${roomId}`);
        return;
      }

      // Carregar texto do capítulo (usando NVI por padrão)
      const text = await getBibleChapter(roomData.book, chapterNum, "nvi");
      setChapterText(text);
      
      // Dividir em blocos de 10 versículos
      const blocks = getVerseBlocks(text);
      setVerseBlocks(blocks);

      // Marcar automaticamente em planos de leitura ativos
      if (user) {
        const updatedPlans = await autoMarkChapterAsRead(user.id, roomData.book, chapterNum);
        if (updatedPlans.length > 0) {
          setNotification({
            message: `Capítulo marcado como lido em ${updatedPlans.length} plano${updatedPlans.length > 1 ? "s" : ""}!`,
            plans: updatedPlans
          });
          // Remover notificação após 5 segundos
          setTimeout(() => setNotification(null), 5000);
        }
      }

      // Carregar resumos (primeira página)
      await loadSummaries(false);

      // Carregar comentários
      await loadComments();

      // Carregar destaques
      const chapterHighlights = await getChapterHighlights(roomId, chapterNum);
      setHighlights(chapterHighlights);

      // Carregar highlights pessoais de versículos
      if (user) {
        const personalHighlights = await getVerseHighlights(user.id, roomId, roomData.book, chapterNum);
        setVerseHighlights(personalHighlights);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummaries = async (loadMore = false) => {
    if (loadMore) {
      setLoadingMoreSummaries(true);
    }

    try {
      // Construir query com ordenação no Firestore
      // Ordenar por likes DESC, depois createdAt ASC (índice composto necessário)
      let summariesQuery = query(
        collection(db, "rooms", roomId, "summaries"),
        where("chapter", "==", chapterNum),
        orderBy("likes", "desc"),
        orderBy("createdAt", "asc"),
        limit(SUMMARY_PAGE_SIZE)
      );

      if (loadMore && lastSummaryDoc) {
        summariesQuery = query(summariesQuery, startAfter(lastSummaryDoc));
      }

      const snapshot = await getDocs(summariesQuery);

      if (snapshot.empty) {
        setHasMoreSummaries(false);
        if (loadMore) {
          setLoadingMoreSummaries(false);
        }
        return;
      }

      // Coletar todos os authorIds primeiro
      const authorIds = new Set<string>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        authorIds.add(data.authorId);
      });

      // Buscar todos os autores de uma vez (otimização: elimina queries N+1)
      const authorPromises = Array.from(authorIds).map(authorId =>
        getDoc(doc(db, "users", authorId)).then(doc => ({
          id: authorId,
          data: doc.data()
        }))
      );
      const authorsData = await Promise.all(authorPromises);
      const authorsMap = new Map(authorsData.map(a => [a.id, a.data]));

      // Processar resumos com dados dos autores
      const newSummaries: Summary[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const authorData = authorsMap.get(data.authorId);

        newSummaries.push({
          id: docSnap.id,
          ...data,
          // Garantir valores padrão para compatibilidade
          verseBlock: data.verseBlock || 1,
          startVerse: data.startVerse || 1,
          endVerse: data.endVerse || 10,
          authorName: authorData?.name || "Usuário",
          authorPhoto: authorData?.photoUrl || "",
          authorFavoriteVerse: authorData?.favoriteVerse || "",
        } as Summary);
      });

      // Ordenação já feita no Firestore, mas garantir ordem local também
      // (Firestore ordena, mas garantimos consistência)
      newSummaries.sort((a, b) => {
        if (b.likes !== a.likes) {
          return b.likes - a.likes;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Atualizar lista
      if (loadMore) {
        setSummaries(prev => [...prev, ...newSummaries]);
      } else {
        setSummaries(newSummaries);
      }

      // Atualizar lastDoc e hasMore
      const lastDocument = snapshot.docs[snapshot.docs.length - 1];
      setLastSummaryDoc(lastDocument);
      setHasMoreSummaries(snapshot.docs.length === SUMMARY_PAGE_SIZE);
    } catch (error) {
      console.error("Error loading summaries:", error);
      setHasMoreSummaries(false);
    } finally {
      if (loadMore) {
        setLoadingMoreSummaries(false);
      }
    }
  };

  const loadComments = async () => {
    try {
      const commentsQuery = query(
        collection(db, "rooms", roomId, "comments"),
        where("chapter", "==", chapterNum)
      );
      const snapshot = await getDocs(commentsQuery);

      const commentsList: Comment[] = [];
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
        } as Comment);
      }

      commentsList.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      setComments(commentsList);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleSubmitSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedBlock === null) return;

    if (summaryText.length > 500) {
      alert("O resumo deve ter no máximo 500 caracteres");
      return;
    }

    if (application.length > 300) {
      alert("A aplicação prática deve ter no máximo 300 caracteres");
      return;
    }

    const block = verseBlocks.find(b => b.block === selectedBlock);
    if (!block) return;

    try {
      if (editingSummary) {
        await updateDoc(doc(db, "rooms", roomId, "summaries", editingSummary), {
          title: summaryTitle || "",
          summary: summaryText,
          application,
        });
      } else {
        // Verificar se já existe resumo para este bloco
        const existingSummary = summaries.find(
          (s) => s.authorId === user.id && s.verseBlock === selectedBlock
        );
        if (existingSummary) {
          alert("Você já escreveu um resumo para este bloco de versículos");
          return;
        }

        await addDoc(collection(db, "rooms", roomId, "summaries"), {
          authorId: user.id,
          chapter: chapterNum,
          verseBlock: selectedBlock,
          startVerse: block.startVerse,
          endVerse: block.endVerse,
          title: summaryTitle || "",
          summary: summaryText,
          application,
          tags: [],
          likes: 0,
          likedBy: [],
          createdAt: new Date().toISOString(),
        });
      }

      setSummaryTitle("");
      setSummaryText("");
      setApplication("");
      setShowSummaryForm(null);
      setSelectedBlock(null);
      setEditingSummary(null);
      await loadSummaries();
    } catch (error) {
      console.error("Error submitting summary:", error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, "rooms", roomId, "comments"), {
        authorId: user.id,
        chapter: chapterNum,
        message: commentText,
        createdAt: new Date().toISOString(),
      });

      setCommentText("");
      setShowCommentForm(false);
      await loadComments();
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  const handleLikeSummary = async (summaryId: string) => {
    if (!user) return;

    // Prevenir múltiplos cliques simultâneos
    if (likingInProgress.has(summaryId)) return;

    const summary = summaries.find(s => s.id === summaryId);
    if (!summary) return;

    // Verificar se já curtiu
    const alreadyLiked = summary.likedBy?.includes(user.id) || false;

    // Marcar como em progresso
    setLikingInProgress(prev => new Set(prev).add(summaryId));

    try {
      const summaryRef = doc(db, "rooms", roomId, "summaries", summaryId);
      const currentLikedBy = summary.likedBy || [];
      
      if (alreadyLiked) {
        // Remover like
        await updateDoc(summaryRef, {
          likes: increment(-1),
          likedBy: currentLikedBy.filter((id: string) => id !== user.id),
        });
      } else {
        // Adicionar like
        await updateDoc(summaryRef, {
          likes: increment(1),
          likedBy: [...currentLikedBy, user.id],
        });
      }
      await loadSummaries();
    } catch (error) {
      console.error("Error liking summary:", error);
    } finally {
      // Remover do progresso
      setLikingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(summaryId);
        return newSet;
      });
    }
  };

  const handleEditSummary = (summary: Summary) => {
    if (!canEditSummary(summary.createdAt)) {
      alert("Você só pode editar resumos dentro de 24 horas após a criação");
      return;
    }
    setEditingSummary(summary.id);
    setSelectedBlock(summary.verseBlock);
    setSummaryTitle(summary.title || "");
    setSummaryText(summary.summary);
    setApplication(summary.application);
    setShowSummaryForm(summary.verseBlock);
  };

  const handleDeleteSummary = async (summaryId: string) => {
    if (!confirm("Tem certeza que deseja excluir este resumo?")) return;

    try {
      await deleteDoc(doc(db, "rooms", roomId, "summaries", summaryId));
      await loadSummaries();
    } catch (error) {
      console.error("Error deleting summary:", error);
    }
  };

  const openSummaryForm = (block: number) => {
    if (!user) return;
    const blockData = verseBlocks.find(b => b.block === block);
    if (!blockData) return;
    
    const existingSummary = summaries.find(
      (s) => s.authorId === user.id && s.verseBlock === block
    );
    
    if (existingSummary) {
      handleEditSummary(existingSummary);
    } else {
      setSelectedBlock(block);
      setShowSummaryForm(block);
      setSummaryTitle("");
      setSummaryText("");
      setApplication("");
      setEditingSummary(null);
    }

    // Scroll automático para o formulário no mobile
    setTimeout(() => {
      const formElement = document.getElementById(`summary-form-${block}`);
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleVerseLongPress = (verseNum: number) => {
    if (!user || !room) return;
    setSelectedVerse(verseNum);
    setShowHighlightMenu(true);
    setHighlightingVerse(verseNum);
  };

  const handleVerseClick = (verseNum: number) => {
    // No mobile, apenas mostra o menu se já estiver destacado
    if (verseHighlights.has(verseNum)) {
      handleVerseLongPress(verseNum);
    }
  };

  // Touch handlers para mobile
  const handleTouchStart = (verseNum: number) => {
    setTouchStart({ verse: verseNum, time: Date.now() });
  };

  const handleTouchEnd = (verseNum: number) => {
    if (!touchStart || touchStart.verse !== verseNum) return;
    
    const pressDuration = Date.now() - touchStart.time;
    if (pressDuration > 500) { // 500ms = toque longo
      handleVerseLongPress(verseNum);
    }
    setTouchStart(null);
  };

  const handleHighlightVerse = async (verseNum: number, color: VerseHighlight["color"]) => {
    if (!user || !room) return;

    try {
      const isHighlighted = verseHighlights.has(verseNum);
      const currentColor = verseHighlights.get(verseNum);
      
      if (isHighlighted && currentColor === color) {
        // Remover highlight se já está destacado com a mesma cor
        await removeVerseHighlight(user.id, roomId, room.book, chapterNum, verseNum);
        const newMap = new Map(verseHighlights);
        newMap.delete(verseNum);
        setVerseHighlights(newMap);
      } else {
        // Adicionar ou alterar highlight
        await saveVerseHighlight(user.id, roomId, room.book, chapterNum, verseNum, color);
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
      setHighlightingVerse(null);
    }
  };

  const getNextChapter = () => {
    if (!room) return null;
    const nextChapter = chapterNum + 1;
    if (nextChapter > room.totalChapters) return null;
    if (!isChapterUnlocked(room.startDate, nextChapter)) return null;
    return nextChapter;
  };

  const getPrevChapter = () => {
    if (!room) return null;
    const prevChapter = chapterNum - 1;
    if (prevChapter < 1) return null;
    if (!isChapterUnlocked(room.startDate, prevChapter)) return null;
    return prevChapter;
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Carregando...</div>
      </div>
    );
  }

  if (!room || !user || !isMember) {
    return null;
  }

  if (!chapterText || verseBlocks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Carregando capítulo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-10 backdrop-blur-md" style={{ background: 'rgba(22, 22, 35, 0.95)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <Link
            href={`/room/${roomId}`}
            className="inline-flex items-center gap-2 mb-3 sm:mb-4 hover-lift touch-target px-2 -ml-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar à Sala</span>
            <span className="sm:hidden">Voltar</span>
          </Link>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {room.book} - Cap. {chapterNum}
            </h1>
            <div className="flex items-center gap-2">
              {getPrevChapter() && (
                <Link
                  href={`/room/${roomId}/chapter/${getPrevChapter()}`}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg hover-lift transition-all touch-target"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Link>
              )}
              {getNextChapter() && (
                <Link
                  href={`/room/${roomId}/chapter/${getNextChapter()}`}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg btn-violet hover-lift touch-target"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            Toque e segure um versículo para destacar
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Texto do Capítulo dividido em blocos */}
        <section className="card-premium p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Texto Bíblico</h2>
            <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>NVI</span>
          </div>
          
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {verseBlocks.map((block) => {
              const blockSummaries = summaries.filter(s => s.verseBlock === block.block);
              const userBlockSummary = blockSummaries.find(s => s.authorId === user.id);
              
              return (
                <div key={block.block} className="border-b pb-4 sm:pb-6 lg:pb-8 last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  {/* Cabeçalho do bloco */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <div className="px-2 sm:px-3 py-1 rounded-lg font-semibold text-xs sm:text-sm" style={{ background: 'var(--gradient-violet)', color: 'white' }}>
                        <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Bloco {block.block}: {block.startVerse}-{block.endVerse}
                      </div>
                      {blockSummaries.length > 0 && (
                        <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {blockSummaries.length} resumo{blockSummaries.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {!userBlockSummary && (
                      <button
                        onClick={() => openSummaryForm(block.block)}
                        className="text-xs sm:text-sm btn-emerald hover-lift touch-target px-3 sm:px-4 self-start sm:self-auto"
                      >
                        Escrever Resumo
                      </button>
                    )}
                  </div>

                  {/* Versículos do bloco */}
                  <div className="rounded-lg p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {Object.entries(block.verses).map(([verse, text]) => {
                      const verseNum = parseInt(verse);
                      const highlight = getHighlightColor(verseNum);
                      const isHighlighted = !!highlight;
                      return (
                        <div
                          key={verse}
                          className="mb-1.5 sm:mb-2 leading-relaxed relative group"
                        >
                          <p 
                            className="text-sm sm:text-base verse-text touch-target transition-all rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 relative"
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
                                color: highlight?.text || 'var(--accent-violet)', 
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

                  {/* Formulário de resumo para este bloco */}
                  {showSummaryForm === block.block && (
                    <form 
                      id={`summary-form-${block.block}`}
                      onSubmit={handleSubmitSummary} 
                      className="mb-4 p-4 rounded-lg space-y-4 animate-slide-in"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)' }}
                    >
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          Título (opcional)
                        </label>
                        <input
                          type="text"
                          value={summaryTitle}
                          onChange={(e) => setSummaryTitle(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border transition-all"
                          style={{
                            background: 'var(--bg-tertiary)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="Título do resumo"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          Resumo (máx. 500 caracteres)
                        </label>
                        <textarea
                          value={summaryText}
                          onChange={(e) => setSummaryText(e.target.value)}
                          required
                          maxLength={500}
                          rows={4}
                          className="w-full px-4 py-2 rounded-lg border transition-all"
                          style={{
                            background: 'var(--bg-tertiary)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="Escreva seu resumo aqui..."
                        />
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{summaryText.length}/500</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          Aplicação Prática (máx. 300 caracteres)
                        </label>
                        <textarea
                          value={application}
                          onChange={(e) => setApplication(e.target.value)}
                          required
                          maxLength={300}
                          rows={3}
                          className="w-full px-4 py-2 rounded-lg border transition-all"
                          style={{
                            background: 'var(--bg-tertiary)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="Como você pode aplicar isso na sua vida?"
                        />
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{application.length}/300</p>
                      </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="btn-emerald hover-lift"
                            >
                              {editingSummary ? "Salvar Alterações" : "Publicar Resumo"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowSummaryForm(null);
                                setSelectedBlock(null);
                                setEditingSummary(null);
                                setSummaryTitle("");
                                setSummaryText("");
                                setApplication("");
                              }}
                              className="px-4 py-2 rounded-lg transition-all button-press hover-lift"
                              style={{
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)'
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                    </form>
                  )}

                  {/* Resumos deste bloco */}
                  {blockSummaries.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {blockSummaries.map((summary) => (
                        <div
                          key={summary.id}
                          className="p-4 rounded-lg hover-lift animate-fade-in card-premium"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {summary.authorPhoto && (
                                <img
                                  src={summary.authorPhoto}
                                  alt={summary.authorName}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <div>
                                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{summary.authorName}</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                  {new Date(summary.createdAt).toLocaleDateString("pt-BR")}
                                </p>
                                {summary.authorFavoriteVerse && (
                                  <p className="text-xs italic mt-1 flex items-center gap-1" style={{ color: 'var(--accent-violet)' }}>
                                    <BookMarked className="w-3 h-3" />
                                    &quot;{summary.authorFavoriteVerse}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                            {summary.authorId === user.id && canEditSummary(summary.createdAt) && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditSummary(summary)}
                                  className="hover-lift"
                                  style={{ color: 'var(--accent-violet)' }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSummary(summary.id)}
                                  className="hover-lift"
                                  style={{ color: '#ef4444' }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          {summary.title && (
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{summary.title}</h3>
                          )}
                          <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>{summary.summary}</p>
                          <div className="p-3 rounded-lg mb-2" style={{ background: 'var(--bg-secondary)', borderLeft: '3px solid var(--accent-emerald)' }}>
                            <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent-emerald)' }}>Aplicação Prática:</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{summary.application}</p>
                          </div>
                              <button
                                onClick={() => handleLikeSummary(summary.id)}
                                disabled={likingInProgress.has(summary.id)}
                                className={`flex items-center gap-2 transition-all button-press hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  summary.likedBy?.includes(user.id)
                                    ? ""
                                    : ""
                                }`}
                                style={{
                                  color: summary.likedBy?.includes(user.id) ? '#ef4444' : 'var(--text-muted)'
                                }}
                                aria-label={summary.likedBy?.includes(user.id) ? "Remover curtida" : "Curtir"}
                              >
                            <Heart 
                              className={`w-5 h-5 ${summary.likedBy?.includes(user.id) ? "fill-current" : ""} ${likingInProgress.has(summary.id) ? "animate-pulse" : ""}`} 
                            />
                            <span style={{ color: 'var(--text-primary)' }}>{summary.likes}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botão Carregar Mais Resumos */}
          {hasMoreSummaries && summaries.length > 0 && !loading && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => loadSummaries(true)}
                disabled={loadingMoreSummaries}
                className="btn-emerald flex items-center gap-2 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMoreSummaries ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Carregando...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Carregar Mais Resumos
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Comentários */}
        <section className="card-premium p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Discussão</h2>
              {!showCommentForm && (
                  <button
                    onClick={() => setShowCommentForm(true)}
                    className="flex items-center gap-2 btn-violet hover-lift"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Comentar
                  </button>
                )}
          </div>

              {showCommentForm && (
                <form onSubmit={handleSubmitComment} className="mb-6 animate-slide-in">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2 rounded-lg border transition-all mb-2"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)'
                }}
                placeholder="Escreva seu comentário..."
              />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 btn-violet hover-lift"
                    >
                      <Send className="w-4 h-4" />
                      Enviar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCommentForm(false);
                        setCommentText("");
                      }}
                      className="px-4 py-2 rounded-lg transition-all button-press hover-lift"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
            </form>
          )}

          {comments.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhum comentário ainda. Inicie a discussão!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-lg card-premium">
                  <div className="flex items-center gap-2 mb-2">
                    {comment.authorPhoto && (
                      <img
                        src={comment.authorPhoto}
                        alt={comment.authorName}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{comment.authorName}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {new Date(comment.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      {comment.authorFavoriteVerse && (
                        <p className="text-xs italic mt-1 flex items-center gap-1" style={{ color: 'var(--accent-violet)' }}>
                          <BookMarked className="w-3 h-3" />
                          &quot;{comment.authorFavoriteVerse}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)' }}>{comment.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
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
