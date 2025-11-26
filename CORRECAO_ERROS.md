# 🔧 Correção dos Erros Identificados

## 📊 Resumo dos Problemas

Foram identificados **2 erros** que impedem o carregamento das salas:

1. **❌ Índice faltando** para query de salas públicas
2. **❌ Permissões insuficientes** para `collectionGroup("members")`

## ✅ Soluções Implementadas

### 1. Regras do Firestore Atualizadas

As regras do Firestore foram atualizadas para permitir `collectionGroup` queries. O arquivo `firestore.rules` foi modificado.

**⚠️ IMPORTANTE**: Você precisa **publicar as novas regras** no Firebase Console!

#### Como Publicar as Regras:

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **celula31-9b117**
3. Vá em **Firestore Database** > **Regras**
4. Abra o arquivo `celula31-main/firestore.rules` no seu editor
5. **Copie todo o conteúdo** do arquivo
6. **Cole no Firebase Console**
7. Clique em **Publicar**

### 2. Índice do Firestore

O índice precisa ser criado no Firestore. Há duas formas:

#### Opção A: Usar o Link do Erro (Recomendado)

1. **Clique no link** que aparece no console do navegador quando o erro ocorre:
   ```
   https://console.firebase.google.com/v1/r/project/celula31-9b117/firestore/indexes?create_composite=...
   ```

2. O Firebase Console abrirá com o índice pré-configurado

3. Clique em **Criar Índice**

4. Aguarde alguns minutos (o índice pode levar 2-5 minutos para ser criado)

#### Opção B: Criar Manualmente

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **celula31-9b117**
3. Vá em **Firestore Database** > **Índices**
4. Clique em **Criar Índice**
5. Configure:
   - **Coleção**: `rooms`
   - **Campos**:
     - `visibility` (Ascendente)
     - `startDate` (Descendente)
   - **Query scope**: Collection
6. Clique em **Criar**

## 📋 Checklist de Correção

- [ ] **Publicar novas regras do Firestore** (Firebase Console > Firestore > Regras)
- [ ] **Criar índice** para `rooms` com `visibility` + `startDate` (usar link do erro ou criar manualmente)
- [ ] **Aguardar** alguns minutos para o índice ser criado
- [ ] **Recarregar** a página da aplicação
- [ ] **Verificar** se as salas aparecem corretamente

## 🔍 Verificação

Após seguir os passos acima:

1. **Recarregue a página** (F5)
2. **Abra o console** (F12)
3. **Verifique** se não há mais erros
4. **Confirme** que as salas aparecem na lista

## 📝 Nota sobre os Erros

### Erro 1: Índice Faltando
```
Error fetching public rooms: FirebaseError: The query requires an index.
```

**Causa**: A query precisa de um índice composto para `visibility` + `startDate`

**Solução**: Criar o índice (veja instruções acima)

### Erro 2: Permissões Insuficientes
```
Error fetching private rooms: FirebaseError: Missing or insufficient permissions.
```

**Causa**: As regras do Firestore não permitiam `collectionGroup` queries em `members`

**Solução**: Regras atualizadas (precisa publicar no Firebase Console)

## ⚠️ Importante

- **As salas NÃO foram perdidas!** Elas estão no Firestore, apenas não aparecem por causa dos erros acima
- Após corrigir os dois problemas, todas as salas voltarão a aparecer normalmente
- O processo de criação do índice pode levar alguns minutos

## 🆘 Se Ainda Não Funcionar

1. Verifique se as regras foram publicadas corretamente
2. Verifique se o índice foi criado (status deve ser "Habilitado" no Firebase Console)
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Verifique o console do navegador para novos erros

---

**Última atualização**: 2024
**Status**: Aguardando criação do índice e publicação das regras

