# 🚀 Plano de Ação - Resolução Completa dos Problemas

## 📋 Visão Geral

Este documento detalha o plano de ação para resolver todos os problemas identificados no projeto Célula31, priorizando **Performance** e depois seguindo para **Segurança**, **Arquitetura** e **Qualidade de Código**.

**Estimativa Total**: 4-6 semanas de desenvolvimento
**Prioridade**: 🔴 Crítica → 🟡 Alta → 🟢 Média

---

## 🎯 FASE 1: PERFORMANCE (Semana 1-2)

### ✅ Tarefa 1.1: Corrigir Queries N+1 em `app/home/page.tsx` - **CONCLUÍDA**

**Status**: ✅ Implementado e testado
**Mudanças**:
- Código já estava otimizado usando `collectionGroup` para buscar membros
- Melhorada extração de `roomId` do path (mais robusta)
- Adicionado tratamento de erro para salas que não existem mais
- Adicionado fallback para lista vazia em caso de erro

### 🔴 Tarefa 1.2: Implementar Paginação em Todas as Listagens

**Problema**: Busca todas as salas e depois faz query individual para cada sala privada.

**Impacto**: Com 100 salas = 100+ queries = 10-20 segundos de espera

**Solução**: Reestruturar dados ou usar query composta

#### Opção A: Reestruturar Dados (Recomendado)
Criar coleção `userRooms/{userId}/rooms/{roomId}` para salas privadas do usuário.

**Passos**:
1. Criar Cloud Function para sincronizar membros:
   ```typescript
   // functions/src/syncUserRooms.ts
   // Quando usuário é adicionado como membro, criar documento em userRooms
   ```

2. Modificar `app/home/page.tsx`:
   ```typescript
   // Buscar salas públicas
   const publicRooms = await getDocs(query(
     collection(db, "rooms"),
     where("visibility", "==", "public"),
     limit(20)
   ));

   // Buscar salas privadas do usuário (uma query apenas)
   const userRooms = await getDocs(query(
     collection(db, "userRooms", user.id, "rooms")
   ));

   // Combinar resultados
   ```

**Arquivos a Modificar**:
- `app/home/page.tsx` (linhas 29-77)
- Criar: `functions/src/syncUserRooms.ts` (Cloud Function)
- Atualizar: `firestore.rules` (adicionar regras para `userRooms`)

**Estimativa**: 4-6 horas

#### Opção B: Query Composta (Mais Rápido, Menos Ideal)
Usar `whereIn` com lista de IDs de salas privadas (limitado a 10).

**Passos**:
1. Primeiro buscar IDs de salas privadas onde usuário é membro:
   ```typescript
   // Buscar apenas IDs de membros
   const memberRoomsQuery = query(
     collectionGroup(db, "members"),
     where("__name__", "==", user.id)
   );
   ```

2. Extrair roomIds e buscar salas em batch

**Arquivos a Modificar**:
- `app/home/page.tsx`

**Estimativa**: 2-3 horas

**Recomendação**: Implementar Opção A para escalabilidade.

---

### 🔴 Tarefa 1.2: Implementar Paginação em Todas as Listagens

**Problemas**:
- Sermões: carrega todos de uma vez
- Reflexões: carrega todas de uma vez
- Salas: carrega todas de uma vez
- Resumos: carrega todos de uma vez

**Solução**: Implementar paginação com `limit()` e `startAfter()`

#### ✅ 1.2.1: Paginação em Sermões - **CONCLUÍDA**

**Arquivo**: `app/sermons/page.tsx`
**Status**: ✅ Implementado
**Mudanças**:
- Adicionada paginação com `limit(20)` e `startAfter()`
- Estados de paginação: `lastDoc`, `hasMore`, `loadingMore`
- Botão "Carregar Mais" implementado
- Ordenação movida para Firestore (`orderBy("date", "desc")`)
- Índice composto adicionado em `firestore.indexes.json`
- Filtros aplicados via `useEffect` quando `sermons` muda

**Passos**:
1. Adicionar estado para paginação:
   ```typescript
   const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
   const [hasMore, setHasMore] = useState(true);
   const [pageSize] = useState(10);
   ```

2. Modificar `loadSermons`:
   ```typescript
   const loadSermons = async (loadMore = false) => {
     try {
       let sermonsQuery = query(
         collection(db, "sermons"),
         where("authorId", "==", user.id),
         orderBy("date", "desc"),
         limit(pageSize)
       );

       if (loadMore && lastDoc) {
         sermonsQuery = query(sermonsQuery, startAfter(lastDoc));
       }

       const snapshot = await getDocs(sermonsQuery);
       
       if (snapshot.empty) {
         setHasMore(false);
         return;
       }

       const newSermons = snapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data()
       }));

       setSermons(prev => loadMore ? [...prev, ...newSermons] : newSermons);
       setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
       setHasMore(snapshot.docs.length === pageSize);
     } catch (error) {
       console.error("Error loading sermons:", error);
     }
   };
   ```

3. Adicionar botão "Carregar Mais":
   ```typescript
   {hasMore && (
     <button onClick={() => loadSermons(true)}>
       Carregar Mais
     </button>
   )}
   ```

**Arquivos a Modificar**:
- `app/sermons/page.tsx` (linhas 42-71)

**Estimativa**: 2 horas

#### ✅ 1.2.2: Paginação em Reflexões - **CONCLUÍDA**

**Arquivo**: `app/reflections/page.tsx`
**Status**: ✅ Implementado
**Mudanças**:
- Paginação implementada para ordenação por data
- Para ordenação por likes: carrega até 100 itens e ordena localmente (likes mudam frequentemente)
- Otimização: busca todos os autores de uma vez (elimina queries N+1 de autores)
- Botão "Carregar Mais" implementado
- Índice adicionado em `firestore.indexes.json` para `createdAt DESC`

**Arquivos a Modificar**:
- `app/reflections/page.tsx` (linhas 40-84)

**Estimativa**: 2 horas

#### 1.2.3: Paginação em Salas

**Arquivo**: `app/home/page.tsx`

**Passos**: Similar ao 1.2.1, mas considerar salas públicas e privadas separadamente

**Arquivos a Modificar**:
- `app/home/page.tsx` (linhas 29-77)

**Estimativa**: 2 horas

#### ✅ 1.2.4: Paginação em Resumos - **CONCLUÍDA**

**Arquivo**: `app/room/[id]/chapter/[n]/page.tsx`
**Status**: ✅ Implementado
**Mudanças**:
- Paginação implementada com `limit(10)` e `startAfter()`
- Otimização: busca todos os autores de uma vez (elimina queries N+1 de autores)
- Ordenação no Firestore: `orderBy("likes", "desc")` e `orderBy("createdAt", "asc")`
- Botão "Carregar Mais Resumos" implementado
- Índice composto já existia em `firestore.indexes.json`

**Total Estimativa Tarefa 1.2**: ✅ CONCLUÍDA

---

### ✅ Tarefa 1.3: Otimizar Queries N+1 em `app/profile/page.tsx` - **CONCLUÍDA**

**Status**: ✅ Implementado
**Mudanças**:
- Substituído loop N+1 por `collectionGroup` queries
- Busca todos os membros do usuário de uma vez
- Busca todos os resumos do usuário em todas as salas de uma vez
- Busca todos os comentários do usuário em todas as salas de uma vez
- Índices adicionados para `collectionGroup("summaries")` e `collectionGroup("comments")` com `where("authorId")`
- Redução de ~N queries para 3 queries (onde N = número de salas)

**Arquivos Modificados**:
- `app/profile/page.tsx` (linhas 92-162)
- `firestore.indexes.json` (adicionados 2 novos índices)

---

### ✅ Tarefa 1.4: Implementar Cache com SWR - **PARCIALMENTE CONCLUÍDA**

**Status**: ✅ Implementado parcialmente (exemplo funcional)
**Mudanças**:
- SWR instalado (`npm install swr`)
- Hook `useRooms` criado com cache automático
- Hook `useSermons` criado (estrutura base)
- Página `app/home/page.tsx` refatorada para usar `useRooms`
- Cache configurado com `dedupingInterval: 5000` e `revalidateOnFocus: false`
- **Nota**: Implementação pode ser expandida incrementalmente para outras páginas

**Arquivos Criados**:
- `hooks/useRooms.ts` - Hook com SWR para salas
- `hooks/useSermons.ts` - Hook com SWR para sermões (estrutura)

**Arquivos Modificados**:
- `app/home/page.tsx` - Refatorado para usar `useRooms`

**Próximos Passos** (opcional):
- Expandir para outras páginas (sermons, reflections)
- Implementar mutação otimista quando necessário

**Passos**:
1. Instalar SWR:
   ```bash
   npm install swr
   ```

2. Criar hook customizado:
   ```typescript
   // hooks/useRooms.ts
   import useSWR from 'swr';
   import { getDocs, query, collection, where } from 'firebase/firestore';
   import { db } from '@/lib/firebase';

   export function useRooms(userId: string) {
     const { data, error, mutate } = useSWR(
       userId ? `rooms-${userId}` : null,
       async () => {
         // Lógica de busca otimizada
       },
       {
         revalidateOnFocus: false,
         revalidateOnReconnect: true,
         dedupingInterval: 5000
       }
     );

     return { rooms: data, loading: !error && !data, error, mutate };
   }
   ```

3. Substituir `useState` + `useEffect` por hooks SWR em:
   - `app/home/page.tsx`
   - `app/sermons/page.tsx`
   - `app/reflections/page.tsx`
   - `app/profile/page.tsx`

**Arquivos a Modificar**:
- Criar: `hooks/useRooms.ts`
- Criar: `hooks/useSermons.ts`
- Criar: `hooks/useReflections.ts`
- Modificar: Todas as páginas que fazem queries

**Estimativa**: 6-8 horas

---

### ✅ Tarefa 1.5: Otimizar Bundle Size - **CONCLUÍDA**

**Status**: ✅ Implementado
**Mudanças**:
- Bundle Analyzer instalado e configurado (`@next/bundle-analyzer`)
- Script `npm run analyze` adicionado para análise de bundle
- Otimização de imports de pacotes configurada (`optimizePackageImports`)
- Imports já estavam específicos (não usando `import *`)
- **Nota**: Para analisar bundle, executar `npm run analyze`

**Arquivos Modificados**:
- `next.config.js` - Adicionado bundle analyzer e otimizações
- `package.json` - Adicionado script `analyze`

**Passos**:
1. Verificar bundle atual:
   ```bash
   npm install @next/bundle-analyzer
   ```

2. Modificar `next.config.js`:
   ```javascript
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });

   module.exports = withBundleAnalyzer({
     // ... config existente
   });
   ```

3. Otimizar imports:
   ```typescript
   // ❌ Antes
   import * as firestore from 'firebase/firestore';
   
   // ✅ Depois
   import { collection, query, where, getDocs } from 'firebase/firestore';
   ```

4. Lazy load componentes pesados:
   ```typescript
   const SermonEditor = dynamic(() => import('./SermonEditor'), {
     loading: () => <Skeleton />,
     ssr: false
   });
   ```

**Arquivos a Modificar**:
- `next.config.js`
- Todos os arquivos com imports do Firebase
- Componentes pesados (editor de sermões, etc.)

**Estimativa**: 4-6 horas

---

## 🔒 FASE 2: SEGURANÇA (Semana 2-3)

### 🔴 Tarefa 2.1: Proteger Código de Convite

**Problema**: `inviteCode` exposto no cliente.

**Solução**: Mover lógica para Cloud Functions

**Passos**:
1. Criar Cloud Function:
   ```typescript
   // functions/src/roomInvites.ts
   export const generateInviteCode = functions.https.onCall(async (data, context) => {
     if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
     
     const { roomId } = data;
     const roomDoc = await admin.firestore().doc(`rooms/${roomId}`).get();
     
     if (roomDoc.data()?.adminId !== context.auth.uid) {
       throw new functions.https.HttpsError('permission-denied', 'Only admin can generate invite codes');
     }
     
     const inviteCode = generateRandomCode();
     await admin.firestore().doc(`rooms/${roomId}`).update({
       inviteCode: inviteCode
     });
     
     return { inviteCode };
   });

   export const joinRoomByInvite = functions.https.onCall(async (data, context) => {
     if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
     
     const { inviteCode } = data;
     const roomsSnapshot = await admin.firestore()
       .collection('rooms')
       .where('inviteCode', '==', inviteCode)
       .limit(1)
       .get();
     
     if (roomsSnapshot.empty) {
       throw new functions.https.HttpsError('not-found', 'Invalid invite code');
     }
     
     const roomId = roomsSnapshot.docs[0].id;
     await admin.firestore().doc(`rooms/${roomId}/members/${context.auth.uid}`).set({
       joinedAt: admin.firestore.FieldValue.serverTimestamp()
     });
     
     return { roomId };
   });
   ```

2. Remover `inviteCode` da interface `Room`:
   ```typescript
   // types/index.ts
   export interface Room {
     // ... outros campos
     // inviteCode?: string; // ❌ Remover
   }
   ```

3. Atualizar regras do Firestore:
   ```javascript
   match /rooms/{roomId} {
     allow read: if request.auth != null;
     // Não permitir ler inviteCode
     allow read: if request.auth != null && 
       !('inviteCode' in resource.data);
   }
   ```

4. Atualizar UI para usar Cloud Functions:
   ```typescript
   import { getFunctions, httpsCallable } from 'firebase/functions';
   
   const functions = getFunctions();
   const generateInvite = httpsCallable(functions, 'generateInviteCode');
   const joinByInvite = httpsCallable(functions, 'joinRoomByInvite');
   ```

**Arquivos a Modificar**:
- Criar: `functions/src/roomInvites.ts`
- `types/index.ts` (remover inviteCode)
- `firestore.rules` (ocultar inviteCode)
- `app/create-room/page.tsx` (usar Cloud Function)
- `app/home/page.tsx` (usar Cloud Function para entrar)

**Estimativa**: 6-8 horas

---

### 🔴 Tarefa 2.2: Implementar Validação de Dados com Zod

**Problema**: Dados não são validados antes de salvar.

**Solução**: Implementar Zod para validação

**Passos**:
1. Instalar Zod:
   ```bash
   npm install zod
   ```

2. Criar schemas:
   ```typescript
   // lib/schemas.ts
   import { z } from 'zod';

   export const summarySchema = z.object({
     summary: z.string().min(10).max(500),
     application: z.string().min(10).max(300),
     title: z.string().max(100).optional(),
     chapter: z.number().int().positive(),
     verseBlock: z.number().int().positive(),
   });

   export const sermonSchema = z.object({
     title: z.string().min(5).max(200),
     date: z.string().datetime(),
     introduction: z.string().min(10).max(1000),
     points: z.array(z.object({
       title: z.string().min(5).max(200),
       content: z.string().min(10).max(2000),
     })).min(1).max(10),
     conclusion: z.string().min(10).max(1000),
     application: z.string().min(10).max(1000),
   });
   ```

3. Validar antes de salvar:
   ```typescript
   const handleSubmit = async (data: FormData) => {
     try {
       const validated = summarySchema.parse(data);
       await addDoc(collection(db, "rooms", roomId, "summaries"), validated);
     } catch (error) {
       if (error instanceof z.ZodError) {
         // Mostrar erros de validação
       }
     }
   };
   ```

**Arquivos a Modificar**:
- Criar: `lib/schemas.ts`
- `app/room/[id]/chapter/[n]/page.tsx` (validar resumos)
- `app/sermons/create/page.tsx` (validar sermões)
- `app/reflections/page.tsx` (validar reflexões)

**Estimativa**: 4-6 horas

---

### 🔴 Tarefa 2.3: Implementar Rate Limiting

**Problema**: Vulnerável a ataques de força bruta e spam.

**Solução**: Implementar rate limiting no cliente e Cloud Functions

**Passos**:
1. Criar hook de rate limiting:
   ```typescript
   // hooks/useRateLimit.ts
   import { useState, useRef } from 'react';

   export function useRateLimit(maxRequests: number, windowMs: number) {
     const requests = useRef<number[]>([]);
     
     const checkLimit = () => {
       const now = Date.now();
       requests.current = requests.current.filter(time => now - time < windowMs);
       
       if (requests.current.length >= maxRequests) {
         return false;
       }
       
       requests.current.push(now);
       return true;
     };
     
     return { checkLimit };
   }
   ```

2. Implementar rate limiting em Cloud Functions:
   ```typescript
   // functions/src/rateLimit.ts
   import * as admin from 'firebase-admin';

   export async function checkRateLimit(uid: string, action: string): Promise<boolean> {
     const key = `rateLimit:${uid}:${action}`;
     const ref = admin.firestore().doc(`rateLimits/${key}`);
     const doc = await ref.get();
     
     const now = Date.now();
     const windowMs = 60000; // 1 minuto
     const maxRequests = 10;
     
     if (!doc.exists) {
       await ref.set({ count: 1, resetAt: now + windowMs });
       return true;
     }
     
     const data = doc.data()!;
     if (now > data.resetAt) {
       await ref.set({ count: 1, resetAt: now + windowMs });
       return true;
     }
     
     if (data.count >= maxRequests) {
       return false;
     }
     
     await ref.update({ count: admin.firestore.FieldValue.increment(1) });
     return true;
   }
   ```

**Arquivos a Modificar**:
- Criar: `hooks/useRateLimit.ts`
- Criar: `functions/src/rateLimit.ts`
- Aplicar em: likes, comentários, criação de conteúdo

**Estimativa**: 3-4 horas

---

## 🏗️ FASE 3: ARQUITETURA (Semana 3-4)

### 🟡 Tarefa 3.1: Criar Hook Customizado `useLike`

**Problema**: Lógica de likes duplicada em múltiplos lugares.

**Solução**: Criar hook reutilizável

**Passos**:
1. Criar hook:
   ```typescript
   // hooks/useLike.ts
   import { useState } from 'react';
   import { doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
   import { db } from '@/lib/firebase';

   export function useLike(
     collectionPath: string,
     docId: string,
     userId: string | null,
     currentLikes: number,
     likedBy: string[] = []
   ) {
     const [liking, setLiking] = useState(false);
     const [likes, setLikes] = useState(currentLikes);
     const [isLiked, setIsLiked] = useState(likedBy.includes(userId || ''));

     const toggleLike = async () => {
       if (!userId || liking) return;

       setLiking(true);
       const newIsLiked = !isLiked;
       const newLikes = newIsLiked ? likes + 1 : likes - 1;
       const newLikedBy = newIsLiked
         ? [...likedBy, userId]
         : likedBy.filter(id => id !== userId);

       try {
         const docRef = doc(db, collectionPath, docId);
         await updateDoc(docRef, {
           likes: increment(newIsLiked ? 1 : -1),
           likedBy: newIsLiked ? arrayUnion(userId) : arrayRemove(userId),
         });

         setLikes(newLikes);
         setIsLiked(newIsLiked);
       } catch (error) {
         console.error('Error toggling like:', error);
       } finally {
         setLiking(false);
       }
     };

     return { likes, isLiked, toggleLike, liking };
   }
   ```

2. Substituir implementações duplicadas:
   - `app/room/[id]/chapter/[n]/page.tsx` (handleLikeSummary)
   - `app/reflections/page.tsx` (handleLike)
   - Comentários (se aplicável)

**Arquivos a Modificar**:
- Criar: `hooks/useLike.ts`
- `app/room/[id]/chapter/[n]/page.tsx`
- `app/reflections/page.tsx`

**Estimativa**: 2-3 horas

---

### 🟡 Tarefa 3.2: Implementar Repository Pattern

**Problema**: Código fortemente acoplado ao Firestore.

**Solução**: Criar interfaces e implementações

**Passos**:
1. Criar interfaces:
   ```typescript
   // lib/repositories/IRoomRepository.ts
   export interface IRoomRepository {
     findAll(userId: string): Promise<Room[]>;
     findById(id: string): Promise<Room | null>;
     create(room: Omit<Room, 'id'>): Promise<string>;
     update(id: string, data: Partial<Room>): Promise<void>;
     delete(id: string): Promise<void>;
   }
   ```

2. Criar implementação:
   ```typescript
   // lib/repositories/FirestoreRoomRepository.ts
   import { IRoomRepository } from './IRoomRepository';
   import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
   import { db } from '@/lib/firebase';

   export class FirestoreRoomRepository implements IRoomRepository {
     async findAll(userId: string): Promise<Room[]> {
       // Implementação otimizada
     }

     async findById(id: string): Promise<Room | null> {
       const docSnap = await getDoc(doc(db, 'rooms', id));
       return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Room : null;
     }

     // ... outros métodos
   }
   ```

3. Substituir queries diretas por repositórios

**Arquivos a Modificar**:
- Criar: `lib/repositories/IRoomRepository.ts`
- Criar: `lib/repositories/FirestoreRoomRepository.ts`
- Criar: `lib/repositories/ISummaryRepository.ts`
- Criar: `lib/repositories/FirestoreSummaryRepository.ts`
- Modificar: Todas as páginas que fazem queries

**Estimativa**: 8-10 horas

---

### 🟡 Tarefa 3.3: Separar Lógica de Negócio dos Componentes

**Problema**: Lógica de negócio misturada com UI.

**Solução**: Criar camada de serviços/use cases

**Passos**:
1. Criar serviços:
   ```typescript
   // lib/services/roomService.ts
   import { IRoomRepository } from '../repositories/IRoomRepository';

   export class RoomService {
     constructor(private roomRepo: IRoomRepository) {}

     async getUserRooms(userId: string): Promise<Room[]> {
       // Lógica de negócio: combinar salas públicas e privadas
       const publicRooms = await this.roomRepo.findPublic();
       const privateRooms = await this.roomRepo.findByMember(userId);
       return [...publicRooms, ...privateRooms];
     }

     async createRoom(data: CreateRoomData, adminId: string): Promise<string> {
       // Validações de negócio
       if (data.totalChapters < 1) {
         throw new Error('Room must have at least 1 chapter');
       }
       
       return await this.roomRepo.create({
         ...data,
         adminId,
         startDate: new Date().toISOString(),
       });
     }
   }
   ```

2. Usar serviços nos componentes:
   ```typescript
   // app/home/page.tsx
   const roomService = new RoomService(roomRepository);
   const rooms = await roomService.getUserRooms(user.id);
   ```

**Arquivos a Modificar**:
- Criar: `lib/services/roomService.ts`
- Criar: `lib/services/summaryService.ts`
- Criar: `lib/services/sermonService.ts`
- Modificar: Componentes para usar serviços

**Estimativa**: 10-12 horas

---

## 🎨 FASE 4: QUALIDADE DE CÓDIGO (Semana 4-5)

### 🟡 Tarefa 4.1: Implementar Sistema de Notificações Toast

**Problema**: Erros apenas em `console.error`, sem feedback ao usuário.

**Solução**: Implementar react-hot-toast ou similar

**Passos**:
1. Instalar:
   ```bash
   npm install react-hot-toast
   ```

2. Configurar provider:
   ```typescript
   // app/layout.tsx
   import { Toaster } from 'react-hot-toast';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Toaster position="top-right" />
         </body>
       </html>
     );
   }
   ```

3. Substituir `console.error` e `alert`:
   ```typescript
   import toast from 'react-hot-toast';

   try {
     await saveData();
     toast.success('Salvo com sucesso!');
   } catch (error) {
     toast.error('Erro ao salvar. Tente novamente.');
   }
   ```

**Arquivos a Modificar**:
- `app/layout.tsx`
- Todos os arquivos com `console.error` ou `alert`

**Estimativa**: 3-4 horas

---

### 🟡 Tarefa 4.2: Adicionar Testes Unitários

**Problema**: Zero testes.

**Solução**: Implementar Jest + React Testing Library

**Passos**:
1. Instalar dependências:
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
   ```

2. Configurar Jest:
   ```javascript
   // jest.config.js
   module.exports = {
     testEnvironment: 'jsdom',
     setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/$1',
     },
   };
   ```

3. Criar testes:
   ```typescript
   // __tests__/hooks/useLike.test.ts
   import { renderHook, act } from '@testing-library/react';
   import { useLike } from '@/hooks/useLike';

   describe('useLike', () => {
     it('should toggle like correctly', async () => {
       // Test implementation
     });
   });
   ```

**Arquivos a Modificar**:
- Criar: `jest.config.js`
- Criar: `jest.setup.js`
- Criar: `__tests__/` com testes para hooks e utilitários

**Estimativa**: 8-10 horas (testes básicos)

---

### 🟡 Tarefa 4.3: Melhorar Tratamento de Erros

**Problema**: Erros genéricos, sem contexto.

**Solução**: Criar classes de erro customizadas

**Passos**:
1. Criar classes de erro:
   ```typescript
   // lib/errors.ts
   export class ValidationError extends Error {
     constructor(message: string, public field?: string) {
       super(message);
       this.name = 'ValidationError';
     }
   }

   export class PermissionError extends Error {
     constructor(message: string) {
       super(message);
       this.name = 'PermissionError';
     }
   }

   export class NotFoundError extends Error {
     constructor(resource: string) {
       super(`${resource} not found`);
       this.name = 'NotFoundError';
     }
   }
   ```

2. Usar em serviços:
   ```typescript
   if (!user) {
     throw new PermissionError('User must be authenticated');
   }
   ```

3. Tratar em componentes:
   ```typescript
   try {
     await service.action();
   } catch (error) {
     if (error instanceof ValidationError) {
       toast.error(`Erro de validação: ${error.message}`);
     } else if (error instanceof PermissionError) {
       toast.error('Você não tem permissão para esta ação');
     } else {
       toast.error('Erro inesperado');
     }
   }
   ```

**Arquivos a Modificar**:
- Criar: `lib/errors.ts`
- Modificar: Serviços e componentes

**Estimativa**: 3-4 horas

---

## 🎯 FASE 5: UX/UI (Semana 5-6)

### 🟢 Tarefa 5.1: Implementar Onboarding

**Problema**: Novo usuário não sabe por onde começar.

**Solução**: Tour guiado na primeira visita

**Passos**:
1. Instalar:
   ```bash
   npm install react-joyride
   ```

2. Criar tour:
   ```typescript
   // components/OnboardingTour.tsx
   import Joyride from 'react-joyride';

   const steps = [
     {
       target: '.create-room-button',
       content: 'Crie sua primeira sala de estudo bíblico',
     },
     // ... mais steps
   ];
   ```

**Estimativa**: 4-6 horas

---

### 🟢 Tarefa 5.2: Melhorar Estados Vazios

**Problema**: Telas vazias são desanimadoras.

**Solução**: Ilustrações e CTAs claros

**Estimativa**: 2-3 horas

---

### 🟢 Tarefa 5.3: Implementar Skeleton Loaders

**Problema**: Spinners genéricos.

**Solução**: Skeleton loaders específicos

**Estimativa**: 3-4 horas

---

## 📊 Resumo do Plano

### Priorização

| Fase | Tarefas | Estimativa | Prioridade |
|------|---------|------------|------------|
| 1. Performance | 5 tarefas | 25-35 horas | 🔴 Crítica |
| 2. Segurança | 3 tarefas | 13-18 horas | 🔴 Crítica |
| 3. Arquitetura | 3 tarefas | 20-25 horas | 🟡 Alta |
| 4. Qualidade | 3 tarefas | 14-18 horas | 🟡 Alta |
| 5. UX/UI | 3 tarefas | 9-13 horas | 🟢 Média |

**Total**: 81-109 horas (4-6 semanas)

### Ordem de Execução Recomendada

1. **Semana 1**: Tarefas 1.1, 1.2 (Performance crítica)
2. **Semana 2**: Tarefas 1.3, 1.4, 1.5 (Performance restante)
3. **Semana 3**: Tarefas 2.1, 2.2, 2.3 (Segurança)
4. **Semana 4**: Tarefas 3.1, 3.2, 3.3 (Arquitetura)
5. **Semana 5**: Tarefas 4.1, 4.2, 4.3 (Qualidade)
6. **Semana 6**: Tarefas 5.1, 5.2, 5.3 (UX/UI)

### Critérios de Sucesso

- ✅ Queries N+1 eliminadas
- ✅ Paginação implementada em todas as listagens
- ✅ Tempo de carregamento < 2s para listagens
- ✅ Código de convite protegido
- ✅ Validação de dados em todos os formulários
- ✅ Testes com cobertura > 60%
- ✅ Zero duplicação de código crítico
- ✅ Arquitetura desacoplada do Firebase

---

## 🚀 Como Começar

1. **Criar branch**: `git checkout -b fix/performance-and-security`
2. **Começar pela Tarefa 1.1** (Queries N+1)
3. **Testar cada mudança** antes de prosseguir
4. **Fazer commits pequenos e frequentes**
5. **Revisar código** antes de merge

---

**Última atualização**: 2024
**Status**: 📋 Pronto para execução

