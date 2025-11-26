# 📱 Ícones PWA Necessários

Para que o PWA funcione completamente, você precisa criar os seguintes ícones:

## Ícones Obrigatórios

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

## Como Criar os Ícones

### Opção 1: Usar um Gerador Online
1. Acesse: https://www.pwabuilder.com/imageGenerator
2. Faça upload de uma imagem (recomendado: 512x512 ou maior)
3. Baixe os ícones gerados
4. Coloque-os na pasta `public/`

### Opção 2: Criar Manualmente
1. Crie uma imagem quadrada (recomendado: 1024x1024)
2. Redimensione para 192x192 e salve como `icon-192.png`
3. Redimensione para 512x512 e salve como `icon-512.png`
4. Coloque ambos na pasta `public/`

### Opção 3: Usar o Favicon Existente
Se você já tem um favicon.ico, pode convertê-lo:
- Use ferramentas online como https://convertio.co/pt/ico-png/
- Ou use ImageMagick: `convert favicon.ico -resize 192x192 icon-192.png`

## Verificação

Após adicionar os ícones, verifique:
1. O arquivo `public/manifest.json` está configurado corretamente
2. Os ícones aparecem no DevTools > Application > Manifest
3. O botão de instalação aparece no navegador

## Nota

Os ícones são referenciados no `manifest.json`. Se não existirem, o PWA ainda funcionará, mas sem ícones personalizados.

