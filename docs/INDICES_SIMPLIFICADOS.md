# 🔧 Índices Necessários - Instruções Corretas

## ⚠️ IMPORTANTE: São Necessários 2 Índices

### Índice 1: Salas Públicas (Índice Composto - 2 CAMPOS)

**Query que precisa deste índice:**
```typescript
where("visibility", "==", "public")
orderBy("startDate", "desc")
```

**Como Criar:**

#### Opção 1: Usar o Link do Erro (Mais Rápido)
1. **Clique no link** que aparece no console:
   ```
   https://console.firebase.google.com/v1/r/project/celula31-9b117/firestore/indexes?create_composite=...
   ```

#### Opção 2: Criar Manualmente
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **celula31-9b117**
3. Vá em **Firestore Database** > **Índices**
4. Clique em **Criar Índice**
5. Configure:
   - **Coleção**: `rooms`
   - **Query scope**: Collection
   - **Campos do índice** (2 CAMPOS):
     - Campo 1: `visibility` (Ascendente)
     - Campo 2: `startDate` (Descendente)
6. Clique em **Criar**

---

### Índice 2: CollectionGroup de Membros (1 Campo)

**Query que precisa deste índice:**
```typescript
collectionGroup(db, "members")
where("userId", "==", userId)
```

**Como Criar:**

#### Opção 1: Usar o Link do Erro (Mais Rápido)
1. **Clique no link** que aparece no console:
   ```
   https://console.firebase.google.com/v1/r/project/celula31-9b117/firestore/indexes?create_exemption=...
   ```

#### Opção 2: Criar Manualmente
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **celula31-9b117**
3. Vá em **Firestore Database** > **Índices**
4. Clique em **Criar Índice**
5. Configure:
   - **Coleção**: `members`
   - **Query scope**: **Collection group** ⚠️ (IMPORTANTE!)
   - **Campos do índice** (1 CAMPO):
     - Campo 1: `userId` (Ascendente)
6. Clique em **Criar**

---

## 📋 Resumo dos 2 Índices

| Índice | Coleção | Query Scope | Campos | Status |
|--------|---------|-------------|--------|--------|
| 1. Salas Públicas | `rooms` | Collection | `visibility` (ASC) + `startDate` (DESC) | ⚠️ Criar |
| 2. Membros | `members` | **Collection group** | `userId` (ASC) | ⚠️ Criar |

---

## ⏱️ Tempo de Criação

Cada índice pode levar **2-5 minutos**. Você pode criar ambos ao mesmo tempo!

---

## ✅ Verificação

Após criar ambos os índices:
1. Aguarde até que ambos mostrem status "Habilitado"
2. Recarregue a página (F5)
3. As salas devem aparecer corretamente

---

**Última atualização**: 2024
**Status**: Ambos os índices precisam ser criados

