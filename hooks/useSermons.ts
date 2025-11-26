import useSWR from 'swr';
import { collection, query, where, getDocs, orderBy, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Sermon {
  id: string;
  title: string;
  passage: string;
  date: string;
  createdAt: string;
  authorId: string;
  tags?: string[];
}

async function fetchSermons(userId: string, lastDoc: QueryDocumentSnapshot | null = null, pageSize: number = 20): Promise<{
  sermons: Sermon[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}> {
  let sermonsQuery = query(
    collection(db, "sermons"),
    where("authorId", "==", userId),
    orderBy("date", "desc"),
    limit(pageSize)
  );

  if (lastDoc) {
    sermonsQuery = query(sermonsQuery, startAfter(lastDoc));
  }

  const snapshot = await getDocs(sermonsQuery);

  if (snapshot.empty) {
    return { sermons: [], lastDoc: null, hasMore: false };
  }

  const sermons: Sermon[] = [];
  snapshot.forEach((doc) => {
    sermons.push({ id: doc.id, ...doc.data() } as Sermon);
  });

  const lastDocument = snapshot.docs[snapshot.docs.length - 1];
  const hasMore = snapshot.docs.length === pageSize;

  return {
    sermons,
    lastDoc: lastDocument,
    hasMore,
  };
}

export function useSermons(userId: string | null) {
  const { data, error, mutate, isLoading } = useSWR<{
    sermons: Sermon[];
    lastDoc: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }>(
    userId ? `sermons-${userId}` : null,
    () => fetchSermons(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      revalidateIfStale: true,
    }
  );

  return {
    sermons: data?.sermons || [],
    lastDoc: data?.lastDoc || null,
    hasMore: data?.hasMore || false,
    loading: isLoading,
    error,
    mutate,
  };
}

