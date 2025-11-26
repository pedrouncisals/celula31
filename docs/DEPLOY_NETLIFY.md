# 🚀 Deploy no Netlify - Célula31

## 📋 Pré-requisitos

1. Conta no [Netlify](https://www.netlify.com/)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. Projeto configurado com Firebase

## 🔧 Passo a Passo

### 1. Preparar o Projeto

O arquivo `netlify.toml` já foi criado com as configurações necessárias.

### 2. Fazer Build Local (Opcional - para testar)

```bash
npm run build
```

### 3. Deploy via Netlify Dashboard

#### Opção A: Deploy via Git (Recomendado)

1. Acesse [app.netlify.com](https://app.netlify.com/)
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Conecte seu repositório Git (GitHub/GitLab/Bitbucket)
4. Configure as opções:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next` (ou deixe vazio, o Netlify detecta automaticamente)
   - **Node version**: `20` (ou superior)

#### Opção B: Deploy via Netlify CLI

1. Instale o Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Faça login:
```bash
netlify login
```

3. Inicialize o site:
```bash
netlify init
```

4. Faça o deploy:
```bash
netlify deploy --prod
```

### 4. Configurar Variáveis de Ambiente

No painel do Netlify:

1. Vá em **Site settings** → **Environment variables**
2. Adicione as variáveis do Firebase:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (se usar Analytics)

### 5. Configurar Firebase para o Domínio do Netlify

No Firebase Console:

1. Vá em **Authentication** → **Settings** → **Authorized domains**
2. Adicione o domínio do Netlify (ex: `seu-site.netlify.app`)
3. Se usar domínio customizado, adicione também

### 6. Configurar PWA no Netlify

O PWA já está configurado. Certifique-se de que:
- O arquivo `manifest.json` está em `public/manifest.json`
- O `service-worker.js` está em `public/service-worker.js`
- Os ícones estão na pasta `public/`

### 7. Deploy Automático

Com o deploy via Git, cada push na branch principal (ou a branch configurada) fará deploy automaticamente.

## ⚙️ Configurações Adicionais

### Domínio Customizado

1. No Netlify: **Site settings** → **Domain management**
2. Adicione seu domínio customizado
3. Configure os DNS conforme instruções do Netlify

### Headers de Segurança (Opcional)

Adicione em `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## 🐛 Troubleshooting

### Erro: "Module not found"
- Verifique se todas as dependências estão no `package.json`
- Execute `npm install` localmente para testar

### Erro: "Build failed"
- Verifique os logs de build no Netlify
- Teste o build localmente: `npm run build`

### PWA não funciona
- Verifique se o `manifest.json` está acessível
- Verifique se o `service-worker.js` está registrado corretamente

### Firebase não conecta
- Verifique se as variáveis de ambiente estão configuradas
- Verifique se o domínio está autorizado no Firebase

## 📝 Notas Importantes

- O Netlify usa o plugin `@netlify/plugin-nextjs` para otimizar o Next.js
- O build pode levar alguns minutos na primeira vez
- O Netlify oferece SSL automático para todos os sites
- O deploy é gratuito até certo limite de uso

## 🔗 Links Úteis

- [Documentação Netlify](https://docs.netlify.com/)
- [Next.js no Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Netlify CLI](https://cli.netlify.com/)

