export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  bio: string;
  church?: string;
  favoriteVerse?: string; // Ex: "João 3:16"
  streak: number;
}

export interface Room {
  id: string;
  title: string;
  book: string;
  totalChapters: number;
  startDate: string; // ISO string
  visibility: "public" | "private";
  adminId: string;
  inviteCode?: string; // Código de convite para salas privadas
}

export interface Chapter {
  unlockedAt: string; // ISO string
  highlights: string[]; // summaryIds
}

export interface Summary {
  id: string;
  authorId: string;
  chapter: number;
  verseBlock: number; // Bloco de versículos (1 = versículos 1-10, 2 = 11-20, etc.)
  startVerse: number; // Versículo inicial do bloco
  endVerse: number; // Versículo final do bloco
  title?: string;
  summary: string;
  application: string;
  tags: string[];
  likes: number;
  likedBy?: string[]; // IDs dos usuários que curtiram
  createdAt: string; // ISO string
  authorName?: string;
  authorPhoto?: string;
  authorFavoriteVerse?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  chapter: number;
  message: string;
  createdAt: string; // ISO string
  authorName?: string;
  authorPhoto?: string;
  authorFavoriteVerse?: string;
}

export interface BibleBook {
  book: string;
  totalChapters: number;
  chapters: {
    [chapterNumber: string]: {
      verses: {
        [verseNumber: string]: string;
      };
    };
  };
}

export interface Reflection {
  id: string;
  authorId: string;
  title: string;
  content: string;
  tags?: string[];
  likes: number;
  likedBy?: string[];
  createdAt: string; // ISO string
  authorName?: string;
  authorPhoto?: string;
  authorFavoriteVerse?: string;
  authorChurch?: string;
}

export interface ReflectionComment {
  id: string;
  authorId: string;
  reflectionId: string;
  message: string;
  createdAt: string; // ISO string
  authorName?: string;
  authorPhoto?: string;
  authorFavoriteVerse?: string;
  authorChurch?: string;
}

