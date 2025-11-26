# 🔧 Criar Índices do Firestore - INSTRUÇÕES URGENTES

## ⚠️ Dois Índices Precisam Ser Criados

O Firestore precisa de **2 índices** para que as salas funcionem corretamente.

---

## 📋 Índice 1: Salas Públicas

### Erro:
```
Error fetching public rooms: The query requires an index
```

### Link para Criar:
Clique neste link (aparece no console do navegador):
```
https://console.firebase.google.com/v1/r/project/celula31-9b117/firestore/indexes?create_composite=...
```

### Ou Crie Manualmente:
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **celula31-9b117**
3. Vá em **Firestore Database** > **Índices**
4. Clique em **Criar Índice**
5. Configure:
   - **Coleção**: `rooms`
   - **Query scope**: Collection
   - **Campos do índice**:
     - `visibility` (Ascendente)
     - `startDate` (Descendente)
6. Clique em **Criar**

---

## 📋 Índice 2: CollectionGroup de Membros

### Erro:
```
Error fetching private rooms: The query requires a COLLECTION_GROUP_ASC index for collection members and field userId
```

### Link para Criar:
Clique neste link (aparece no console do navegador):
```
https://console.firebase.google.com/v1/r/project/celula31-9b117/firestore/indexes?create_exemption=...
```

### Ou Crie Manualmente:
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **celula31-9b117**
3. Vá em **Firestore Database** > **Índices**
4. Clique em **Criar Índice**
5. Configure:
   - **Coleção**: `members`
   - **Query scope**: **Collection group** ⚠️ (IMPORTANTE: selecione "Collection group", não "Collection"!)
   - **Campos do índice**:
     - Campo 1: `userId` (Ascendente)
6. Clique em **Criar**

**⚠️ ATENÇÃO**: O erro menciona `COLLECTION_GROUP_ASC`, então certifique-se de selecionar **"Collection group"** como Query scope, não "Collection"!

---

## ⏱️ Tempo de Criação

Cada índice pode levar **2-5 minutos** para ser criado. Você verá o status "Criando..." no Firebase Console.

**Dica**: Crie ambos os índices ao mesmo tempo para economizar tempo!

---

## ✅ Verificação

Após criar ambos os índices:

1. **Aguarde** até que ambos mostrem status "Habilitado" no Firebase Console
2. **Recarregue** a página da aplicação (F5)
3. **Verifique** o console do navegador - não deve haver mais erros
4. **Confirme** que as salas aparecem na lista

---

## 🎯 Resumo Rápido

### Índice 1: `rooms`
- **Query scope**: Collection
- **Campos**: `visibility` (ASC) + `startDate` (DESC)

### Índice 2: `members`
- **Query scope**: **Collection group** ⚠️
- **Campos**: `userId` (ASC)

---

## 🆘 Se Ainda Não Funcionar

1. Verifique se ambos os índices foram criados
2. Verifique se ambos estão com status "Habilitado" (não "Criando...")
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Recarregue a página
5. Verifique o console do navegador para novos erros

---

**Última atualização**: 2024
**Status**: Aguardando criação dos 2 índices

