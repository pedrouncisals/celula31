# 🔥 Atualização das Regras do Firestore

## ⚠️ IMPORTANTE: Atualize as regras no Firebase Console

As regras do Firestore foram atualizadas para incluir suporte aos highlights de versículos e planos de leitura.

### Como atualizar:

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Firestore Database** > **Regras**
4. Cole o conteúdo do arquivo `firestore.rules`
5. Clique em **Publicar**

### Novas regras adicionadas:

#### 1. **verseHighlights** - Highlights de versículos
- Usuários podem ler apenas seus próprios highlights
- Usuários podem criar/atualizar/excluir apenas seus próprios highlights

#### 2. **readingPlans** - Planos de leitura
- Qualquer usuário autenticado pode ler planos
- Usuários autenticados podem criar planos

#### 3. **users/{userId}/readingPlans** - Progresso de leitura
- Usuários podem ler/atualizar apenas seu próprio progresso

### Estrutura das coleções:

```
verseHighlights/
  {highlightId}/
    userId: string
    roomId: string
    book: string
    chapter: number
    verse: number
    color: "yellow" | "green" | "blue" | "pink" | "purple"
    createdAt: string

readingPlans/
  {planId}/
    name: string
    description: string
    type: "daily" | "weekly" | "custom"
    duration: number
    chapters: array
    badgeId: string
    createdAt: string

users/{userId}/readingPlans/
  {planId}/
    planId: string
    userId: string
    currentDay: number
    completedChapters: array
    startedAt: string
    completedAt: string (opcional)
```

### Índices necessários:

O Firestore pode solicitar a criação de índices compostos. Se aparecer um erro, clique no link fornecido para criar automaticamente.

