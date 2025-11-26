# 🔧 Instruções para Criar Índice do Firestore

## ⚠️ Erro de Índice Detectado

O Firestore precisa criar um índice composto para a query de salas públicas.

## 📋 Passos para Resolver

### Opção 1: Usar o Link do Erro (Mais Rápido)

1. **Clique no link** que aparece no console do navegador:
   ```
   https://console.firebase.google.com/v1/r/project/celula31-9b117/firestore/indexes?create_composite=...
   ```

2. O Firebase Console abrirá automaticamente com o índice pré-configurado

3. Clique em **Criar Índice**

4. Aguarde alguns minutos enquanto o índice é criado

### Opção 2: Criar Manualmente

1. Acesse [Firebase Console](https://console.firebase.google.com/)

2. Selecione o projeto **celula31-9b117**

3. Vá em **Firestore Database** > **Índices**

4. Clique em **Criar Índice**

5. Configure:
   - **Coleção**: `rooms`
   - **Campos do índice**:
     - `visibility` (Ascendente)
     - `startDate` (Descendente)
   - **Query scope**: Collection

6. Clique em **Criar**

## ⏱️ Tempo de Criação

O índice pode levar **alguns minutos** para ser criado. Você verá o status "Criando..." no Firebase Console.

## ✅ Verificação

Após criar o índice:
1. Recarregue a página da aplicação
2. As salas públicas devem aparecer corretamente
3. O erro no console deve desaparecer

## 📝 Nota

O arquivo `firestore.indexes.json` já contém a definição do índice. Se você usar o Firebase CLI, pode executar:

```bash
firebase deploy --only firestore:indexes
```

Mas a forma mais rápida é usar o link do erro diretamente.

