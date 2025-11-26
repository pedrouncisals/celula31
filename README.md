# Célula31 - MVP

Aplicativo PWA para estudo bíblico em comunidade, desenvolvido com Next.js, TypeScript, TailwindCSS e Firebase.

## 🚀 Funcionalidades

- ✅ Autenticação (Email/Senha e Google)
- ✅ Criação e gerenciamento de salas de estudo
- ✅ Sistema de capítulos desbloqueados por dia
- ✅ Leitura de capítulos bíblicos
- ✅ Sistema de resumos com curtidas
- ✅ Destaques automáticos dos melhores resumos
- ✅ Fórum de discussão por capítulo
- ✅ Perfil de usuário com streak
- ✅ PWA completo (manifest + service worker)

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Firebase com projeto configurado

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <repo-url>
cd CELULA31
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Execute o projeto em desenvolvimento:
```bash
npm run dev
```

5. Acesse `http://localhost:3000`

## 🔥 Configuração do Firebase

### Firestore Database

Crie as seguintes coleções no Firestore:

1. **users** - Coleção de usuários
2. **rooms** - Coleção de salas
3. **rooms/{roomId}/members** - Subcoleção de membros
4. **rooms/{roomId}/chapters** - Subcoleção de capítulos
5. **rooms/{roomId}/summaries** - Subcoleção de resumos
6. **rooms/{roomId}/comments** - Subcoleção de comentários

### Regras de Segurança do Firestore

Configure as regras de segurança no Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários podem ler e atualizar apenas seu próprio perfil
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Salas públicas podem ser lidas por qualquer usuário autenticado
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.adminId == request.auth.uid;
      
      // Membros podem ler e escrever
      match /members/{memberId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
      
      // Capítulos podem ser lidos por membros
      match /chapters/{chapterId} {
        allow read: if request.auth != null && 
          exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
        allow write: if request.auth != null && 
          resource.data.adminId == request.auth.uid;
      }
      
      // Resumos podem ser lidos por membros, escritos apenas pelo autor
      match /summaries/{summaryId} {
        allow read: if request.auth != null && 
          exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
        allow create: if request.auth != null && 
          exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid)) &&
          request.resource.data.authorId == request.auth.uid;
        allow update, delete: if request.auth != null && 
          resource.data.authorId == request.auth.uid;
      }
      
      // Comentários podem ser lidos por membros, escritos apenas pelo autor
      match /comments/{commentId} {
        allow read: if request.auth != null && 
          exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid));
        allow create: if request.auth != null && 
          exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid)) &&
          request.resource.data.authorId == request.auth.uid;
        allow update, delete: if request.auth != null && 
          resource.data.authorId == request.auth.uid;
      }
    }
  }
}
```

### Firebase Authentication

Habilite os seguintes métodos de autenticação:
- Email/Senha
- Google

## 📱 PWA

O aplicativo está configurado como PWA. Para instalar:

1. Acesse o site em um dispositivo móvel ou navegador desktop
2. Procure pela opção "Instalar" ou "Adicionar à tela inicial"
3. O app será instalado e funcionará offline (com cache)

## 📦 Build para Produção

```bash
npm run build
npm start
```

## 🚢 Deploy

### Opção 1: Deploy na Vercel (Recomendado)

1. Conecte seu repositório à Vercel
2. Configure as variáveis de ambiente na Vercel
3. Faça o deploy

O projeto está pronto para deploy na Vercel sem configurações adicionais.

### Opção 2: Deploy no Netlify

O projeto também está configurado para deploy no Netlify!

1. O arquivo `netlify.toml` já está configurado
2. Conecte seu repositório ao Netlify
3. Configure as variáveis de ambiente no Netlify
4. Faça o deploy

📖 **Guia completo**: Veja `DEPLOY_NETLIFY.md` para instruções detalhadas.

## 📚 Estrutura do Projeto

```
CELULA31/
├── app/                    # Páginas Next.js (App Router)
│   ├── login/
│   ├── register/
│   ├── home/
│   ├── create-room/
│   ├── room/[id]/
│   ├── profile/
│   └── layout.tsx
├── components/             # Componentes React
├── lib/                    # Utilitários e configurações
│   ├── firebase.ts
│   ├── auth-context.tsx
│   └── utils.ts
├── types/                  # Tipos TypeScript
├── bible/                  # Arquivos JSON da Bíblia
├── public/                 # Arquivos estáticos
│   ├── manifest.json
│   └── service-worker.js
└── package.json
```

## 📝 Notas

- O arquivo JSON da Bíblia (Provérbios) contém apenas alguns versículos de exemplo. Para produção, você precisará adicionar todos os capítulos e versículos completos.
- As regras de segurança do Firestore precisam ser configuradas no Firebase Console.
- Os ícones do PWA precisam ser gerados e adicionados na pasta `public/`.

## 🎯 Próximos Passos

- [ ] Adicionar todos os livros da Bíblia em JSON
- [ ] Implementar sistema de destaques automáticos
- [ ] Adicionar notificações push
- [ ] Melhorar sistema de busca
- [ ] Adicionar estatísticas avançadas no perfil

