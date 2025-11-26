"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, LogIn, Sparkle, ArrowRight, Wrench } from "lucide-react";
import BibleCanvas from "@/components/BibleCanvas";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Verificar se o usuário voltou do redirect do Google
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        setLoading(true);
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          const user = result.user;
          console.log("Google login successful:", user.email);
          
          // Verificar se o usuário já existe no Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (!userDoc.exists()) {
            // Criar perfil no Firestore
            await setDoc(doc(db, "users", user.uid), {
              name: user.displayName || "Usuário",
              email: user.email,
              photoUrl: user.photoURL || "",
              bio: "",
              streak: 0,
              createdAt: new Date().toISOString(),
            });
          }

          router.push("/");
        } else {
          setLoading(false);
        }
      } catch (error: any) {
        console.error("Google redirect error:", error);
        setError(error.message || "Erro ao fazer login com Google");
        setLoading(false);
      }
    };

    // Só verificar se não estiver em processo de redirect
    if (!loading) {
      handleRedirectResult();
    }
  }, [router, loading]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar se o usuário existe no Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        // Criar perfil básico se não existir
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName || "Usuário",
          email: user.email,
          photoUrl: user.photoURL || "",
          createdAt: new Date().toISOString(),
        });
      }

      router.push("/");
    } catch (error: any) {
      console.error("Login error:", error);
      setError("Email ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Usar redirect em vez de popup para evitar problemas com COOP
      await signInWithRedirect(auth, provider);
      // Não resetar loading aqui, pois o redirect vai acontecer
    } catch (error: any) {
      console.error("Google login error:", error);
      setError(error.message || "Erro ao fazer login com Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-3 sm:px-4 py-8" style={{ 
      background: '#050b1d'
    }}>
      {/* Canvas com animação bíblica */}
      <BibleCanvas />

      <div className="relative z-10 w-full max-w-md animate-fade-in" style={{ zIndex: 2 }}>
        {/* Header com Logo */}
        <div className="text-center mb-8 sm:mb-10">
          {/* Ícone Grande no lugar do texto - Redondo sem margens, só vermelho */}
          <div className="flex justify-center mb-6">
            <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-72 md:h-72 rounded-full overflow-hidden relative">
              <Image
                src="/icon-512.png"
                alt="Célula 31"
                width={512}
                height={512}
                priority
                className="w-full h-full"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transform: 'scale(1.3)',
                  filter: 'contrast(1.1) brightness(1.05)'
                }}
              />
            </div>
          </div>

          {/* Badge de Boas-vindas */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ 
            background: 'rgba(95, 160, 255, 0.1)', 
            border: '1px solid rgba(95, 160, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <Sparkle className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#5fa0ff' }} />
            <span className="text-[10px] sm:text-xs font-medium" style={{ color: '#5fa0ff' }}>Bem-vindo de volta</span>
          </div>
          
          <p className="text-sm sm:text-base max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Entre para continuar sua jornada espiritual
          </p>
        </div>

        {/* Login Card - Glassmorphism */}
        <div className="card-premium p-6 sm:p-8 relative" style={{
          background: 'rgba(5, 11, 29, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(95, 160, 255, 0.2)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(95, 160, 255, 0.1)'
        }}>
          
          <form onSubmit={handleEmailLogin} className="space-y-5 sm:space-y-6 relative z-10">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border transition-all text-sm sm:text-base touch-target"
                  style={{
                    background: 'rgba(5, 11, 29, 0.5)',
                    borderColor: 'rgba(95, 160, 255, 0.3)',
                    color: '#ECECF1',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border transition-all text-sm sm:text-base touch-target"
                  style={{
                    background: 'rgba(5, 11, 29, 0.5)',
                    borderColor: 'rgba(95, 160, 255, 0.3)',
                    color: '#ECECF1',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-xs sm:text-sm animate-shake" style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444', 
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 hover-lift disabled:opacity-50 disabled:cursor-not-allowed touch-target text-sm sm:text-base py-4 sm:py-4 relative overflow-hidden group"
              style={{
                background: loading 
                  ? 'rgba(5, 11, 29, 0.5)' 
                  : 'linear-gradient(135deg, #5fa0ff 0%, #4a8ae6 100%)',
                color: '#050b1d',
                fontWeight: 600,
                borderRadius: '0.75rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(95, 160, 255, 0.4)'
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-violet)' }}></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          <div className="my-5 sm:my-6 flex items-center">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(95, 160, 255, 0.3))' }}></div>
            <span className="px-3 sm:px-4 text-xs sm:text-sm" style={{ color: '#A6A6BF' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(95, 160, 255, 0.3))' }}></div>
          </div>

          {/* Google Login - Com o meme */}
          <div className="relative">
            <div className="w-full flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-3.5 rounded-xl border transition-all opacity-60"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-xs sm:text-sm">Continuar com Google</span>
            </div>
            
            {/* Overlay com o meme */}
            <div className="absolute inset-0 flex items-center justify-center rounded-xl"
              style={{
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)'
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 text-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--accent-gold)' }} />
                    <span className="text-[10px] sm:text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>
                      Em manutenção:
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    TO ARRUMANDO, TA BUGADO AAAAAAAAAAAH
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-6 text-center text-xs sm:text-sm" style={{ color: '#A6A6BF' }}>
            Não tem uma conta?{" "}
            <Link href="/register" className="font-semibold hover:underline transition-all inline-flex items-center gap-1" style={{ color: '#5fa0ff' }}>
              Criar conta
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
