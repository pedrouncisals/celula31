const CACHE_NAME = "celula31-v3";
const urlsToCache = [
  "/",
  "/home",
  "/login",
  "/register",
  "/manifest.json",
];

// Instalar Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Fazer cache de cada URL individualmente para evitar falhas em cascata
      return Promise.allSettled(
        urlsToCache.map((url) => {
          return cache.add(url).catch((err) => {
            console.log(`Erro ao fazer cache de ${url}:`, err);
            return null; // Continuar mesmo se uma URL falhar
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interceptar requisições (Network First Strategy)
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  
  // Não fazer cache de requisições não suportadas - verificação robusta
  if (
    // Não fazer cache de chrome-extension, moz-extension, etc (verificação por string também)
    url.includes("chrome-extension://") ||
    url.includes("moz-extension://") ||
    url.includes("safari-extension://") ||
    url.includes("chrome://") ||
    url.includes("moz://") ||
    // Não fazer cache de APIs externas
    url.includes("firebase") ||
    url.includes("googleapis") ||
    // Não fazer cache de requisições que não sejam GET
    event.request.method !== "GET" ||
    // Não fazer cache de requisições que não sejam http/https
    (!url.startsWith("http://") && !url.startsWith("https://"))
  ) {
    return;
  }
  
  // Tentar criar URL para verificação adicional de protocolo
  let requestUrl;
  try {
    requestUrl = new URL(url);
    // Verificação adicional de protocolo
    if (requestUrl.protocol === "chrome-extension:" ||
        requestUrl.protocol === "moz-extension:" ||
        requestUrl.protocol === "safari-extension:" ||
        !(requestUrl.protocol === "http:" || requestUrl.protocol === "https:")) {
      return;
    }
  } catch (e) {
    // Se não conseguir criar URL, não fazer cache
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar a resposta
        const responseToCache = response.clone();
        
        // Verificação adicional antes de fazer cache
        const url = event.request.url;
        const isCacheable = 
          response.status === 200 && 
          response.type === "basic" &&
          !url.includes("chrome-extension://") &&
          !url.includes("moz-extension://") &&
          !url.includes("safari-extension://") &&
          !url.includes("chrome://") &&
          !url.includes("moz://") &&
          (url.startsWith("http://") || url.startsWith("https://"));
        
        // Fazer cache apenas de requisições válidas
        if (isCacheable) {
          caches.open(CACHE_NAME).then((cache) => {
            // Verificar novamente antes de fazer cache
            try {
              // Verificar se a requisição é válida
              if (event.request.url && !event.request.url.includes("chrome-extension")) {
                cache.put(event.request, responseToCache).catch((err) => {
                  // Silenciar erros de cache para requisições não suportadas
                  if (!err.message.includes("chrome-extension") && !err.message.includes("unsupported")) {
                    console.log("Erro ao fazer cache:", err);
                  }
                });
              }
            } catch (err) {
              // Silenciar erros de cache para requisições não suportadas
              if (!err.message || (!err.message.includes("chrome-extension") && !err.message.includes("unsupported"))) {
                console.log("Erro ao fazer cache:", err);
              }
            }
          }).catch(() => {
            // Ignorar erros ao abrir cache
          });
        }
        
        return response;
      })
      .catch(() => {
        // Se a rede falhar, tentar buscar do cache
        return caches.match(event.request);
      })
  );
});

