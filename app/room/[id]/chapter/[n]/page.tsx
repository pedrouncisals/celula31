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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Room, Summary, Comment } from "@/types";
import { calculateCurrentChapter, isChapterUnlocked, canEditSummary } from "@/lib/utils";
import { getBibleChapter } from "@/lib/bible";
import { getChapterHighlights } from "@/lib/highlights";
import Link from "next/link";
import { ArrowLeft, Heart, MessageCircle, Send, Edit2, Trash2, BookOpen } from "lucide-react";

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
  const [highlights, setHighlights] = useState<string[]>([]);
  const [showSummaryForm, setShowSummaryForm] = useState<number | null>(null); // block number
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [summaryTitle, setSummaryTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [application, setApplication] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);

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

      // Carregar resumos
      await loadSummaries();

      // Carregar comentários
      await loadComments();

      // Carregar destaques
      const chapterHighlights = await getChapterHighlights(roomId, chapterNum);
      setHighlights(chapterHighlights);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummaries = async () => {
    try {
      const summariesQuery = query(
        collection(db, "rooms", roomId, "summaries"),
        where("chapter", "==", chapterNum)
      );
      const snapshot = await getDocs(summariesQuery);

      const summariesList: Summary[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const authorDoc = await getDoc(doc(db, "users", data.authorId));
        const authorData = authorDoc.data();

        summariesList.push({
          id: docSnap.id,
          ...data,
          // Garantir valores padrão para compatibilidade
          verseBlock: data.verseBlock || 1,
          startVerse: data.startVerse || 1,
          endVerse: data.endVerse || 10,
          authorName: authorData?.name || "Usuário",
          authorPhoto: authorData?.photoUrl || "",
        } as Summary);
      }

      // Ordenar localmente: primeiro por likes (desc), depois por createdAt (asc)
      summariesList.sort((a, b) => {
        if (b.likes !== a.likes) {
          return b.likes - a.likes;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      setSummaries(summariesList);
    } catch (error) {
      console.error("Error loading summaries:", error);
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

    const summary = summaries.find(s => s.id === summaryId);
    if (!summary) return;

    // Verificar se já curtiu
    const alreadyLiked = summary.likedBy?.includes(user.id) || false;

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
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-700">Carregando...</div>
      </div>
    );
  }

  if (!room || !user || !isMember) {
    return null;
  }

  if (!chapterText || verseBlocks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-700">Carregando capítulo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={`/room/${roomId}`}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {room.book} - Capítulo {chapterNum}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Texto do Capítulo dividido em blocos */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Texto Bíblico</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">NVI</span>
          </div>
          
          <div className="space-y-8">
            {verseBlocks.map((block) => {
              const blockSummaries = summaries.filter(s => s.verseBlock === block.block);
              const userBlockSummary = blockSummaries.find(s => s.authorId === user.id);
              
              return (
                <div key={block.block} className="border-b border-gray-200 pb-8 last:border-b-0 last:pb-0">
                  {/* Cabeçalho do bloco */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-semibold">
                        <BookOpen className="w-4 h-4 inline mr-1" />
                        Bloco {block.block}: Versículos {block.startVerse}-{block.endVerse}
                      </div>
                      {blockSummaries.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {blockSummaries.length} resumo{blockSummaries.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {!userBlockSummary && (
                      <button
                        onClick={() => openSummaryForm(block.block)}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all button-press hover-lift shadow-md hover:shadow-lg"
                      >
                        Escrever Resumo
                      </button>
                    )}
                  </div>

                  {/* Versículos do bloco */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 mb-4">
                    {Object.entries(block.verses).map(([verse, text]) => (
                      <p key={verse} className="mb-3 text-gray-800 leading-relaxed text-base">
                        <span className="font-bold text-blue-600 mr-2">{verse}</span>
                        <span className="text-gray-900">{text}</span>
                      </p>
                    ))}
                  </div>

                  {/* Formulário de resumo para este bloco */}
                  {showSummaryForm === block.block && (
                    <form onSubmit={handleSubmitSummary} className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4 animate-slide-in">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Título (opcional)
                        </label>
                        <input
                          type="text"
                          value={summaryTitle}
                          onChange={(e) => setSummaryTitle(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                          placeholder="Título do resumo"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Resumo (máx. 500 caracteres)
                        </label>
                        <textarea
                          value={summaryText}
                          onChange={(e) => setSummaryText(e.target.value)}
                          required
                          maxLength={500}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                          placeholder="Escreva seu resumo aqui..."
                        />
                        <p className="text-sm text-gray-500 mt-1">{summaryText.length}/500</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Aplicação Prática (máx. 300 caracteres)
                        </label>
                        <textarea
                          value={application}
                          onChange={(e) => setApplication(e.target.value)}
                          required
                          maxLength={300}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                          placeholder="Como você pode aplicar isso na sua vida?"
                        />
                        <p className="text-sm text-gray-500 mt-1">{application.length}/300</p>
                      </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all button-press hover-lift shadow-md hover:shadow-lg"
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
                              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all button-press"
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
                          className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow hover-lift animate-fade-in"
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
                                <p className="font-semibold text-gray-900">{summary.authorName}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(summary.createdAt).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                            {summary.authorId === user.id && canEditSummary(summary.createdAt) && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditSummary(summary)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSummary(summary.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          {summary.title && (
                            <h3 className="font-semibold text-gray-900 mb-2">{summary.title}</h3>
                          )}
                          <p className="text-gray-700 mb-2">{summary.summary}</p>
                          <div className="bg-blue-50 p-3 rounded-lg mb-2">
                            <p className="text-sm font-medium text-blue-900 mb-1">Aplicação Prática:</p>
                            <p className="text-sm text-blue-800">{summary.application}</p>
                          </div>
                              <button
                                onClick={() => handleLikeSummary(summary.id)}
                                className={`flex items-center gap-2 transition-all button-press hover:scale-110 ${
                                  summary.likedBy?.includes(user.id)
                                    ? "text-red-600 hover:text-red-700"
                                    : "text-gray-600 hover:text-red-600"
                                }`}
                              >
                            <Heart 
                              className={`w-5 h-5 ${summary.likedBy?.includes(user.id) ? "fill-current" : ""}`} 
                            />
                            <span className="text-gray-900">{summary.likes}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Comentários */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Discussão</h2>
              {!showCommentForm && (
                  <button
                    onClick={() => setShowCommentForm(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all button-press hover-lift shadow-md hover:shadow-lg"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2 text-gray-900 bg-white"
                placeholder="Escreva seu comentário..."
              />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all button-press hover-lift shadow-md hover:shadow-lg"
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
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all button-press"
                    >
                      Cancelar
                    </button>
                  </div>
            </form>
          )}

          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum comentário ainda. Inicie a discussão!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {comment.authorPhoto && (
                      <img
                        src={comment.authorPhoto}
                        alt={comment.authorName}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{comment.authorName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700">{comment.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
