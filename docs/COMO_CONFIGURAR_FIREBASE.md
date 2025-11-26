# 🔥 Como Configurar as Variáveis de Ambiente do Firebase

## ❌ Erro Atual
```
Firebase: Error (auth/invalid-api-key)
```

Isso acontece porque o arquivo `.env.local` não existe ou está vazio.

## ✅ Solução

### 1. Obter as Credenciais do Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto (ou crie um novo)
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Role até **Seus aplicativos** e clique no ícone `</>` (Web)
5. Copie as credenciais que aparecem

### 2. Criar o Arquivo `.env.local`

Na raiz do projeto (`d:\WORKSPACE\celula31`), crie um arquivo chamado `.env.local` com o seguinte conteúdo:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key-aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=seu-app-id
```

### 3. Substituir os Valores

Substitua cada valor pelos dados do seu projeto Firebase:

- `NEXT_PUBLIC_FIREBASE_API_KEY` - A chave da API
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - O domínio de autenticação (geralmente `projeto-id.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - O ID do projeto
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - O bucket de storage (geralmente `projeto-id.appspot.com`)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - O ID do remetente de mensagens
- `NEXT_PUBLIC_FIREBASE_APP_ID` - O ID do app

### 4. Reiniciar o Servidor

Após criar o arquivo `.env.local`:

1. Pare o servidor (Ctrl+C)
2. Inicie novamente: `npm run dev`

## ⚠️ Importante

- **NUNCA** commite o arquivo `.env.local` no Git (ele já está no `.gitignore`)
- Mantenha suas credenciais seguras
- Cada ambiente (desenvolvimento, produção) precisa de suas próprias credenciais

## 📝 Exemplo de Arquivo Completo

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=celula31-abc123.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=celula31-abc123
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=celula31-abc123.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

## 🔍 Verificar se Está Funcionando

Após configurar, o erro `auth/invalid-api-key` deve desaparecer e você conseguirá fazer login no app.

