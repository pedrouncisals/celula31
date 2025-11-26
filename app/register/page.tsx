"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { Mail, Lock, User, LogIn, Sparkle, ArrowRight, Wrench } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
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
          console.log("Google register successful:", user.email);
          
          // Verificar se o usuário já existe no Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (!userDoc.exists()) {
            // Criar perfil do usuário
            await setDoc(doc(db, "users", user.uid), {
              name: user.displayName || "Usuário",
              email: user.email,
              photoUrl: user.photoURL || "",
              bio: "",
              streak: 0,
            });
          }

          router.push("/");
        } else {
          setLoading(false);
        }
      } catch (error: any) {
        console.error("Google redirect error:", error);
        setError(error.message || "Erro ao criar conta com Google");
        setLoading(false);
      }
    };

    // Só verificar se não estiver em processo de redirect
    if (!loading) {
      handleRedirectResult();
    }
  }, [router, loading]);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Criar perfil do usuário
      await setDoc(doc(db, "users", user.uid), {
        name: name || "Usuário",
        email: user.email,
        photoUrl: "",
        bio: "",
        streak: 0,
      });

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
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
    } catch (err: any) {
      console.error("Google register error:", err);
      setError(err.message || "Erro ao criar conta com Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-3 sm:px-4" style={{ background: 'var(--bg-primary)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-10 sm:opacity-20" style={{ background: 'var(--accent-violet)' }}></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-10 sm:opacity-20" style={{ background: 'var(--accent-emerald)' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: 'rgba(169, 139, 255, 0.1)', border: '1px solid rgba(169, 139, 255, 0.2)' }}>
            <Sparkle className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--accent-violet)' }} />
            <span className="text-[10px] sm:text-xs font-medium" style={{ color: 'var(--accent-violet)' }}>Junte-se a nós</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3">
            <span className="block" style={{ color: 'var(--text-primary)' }}>Criar Conta</span>
          </h1>
          
          <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Comece sua jornada espiritual hoje
          </p>
        </div>

        {/* Register Card */}
        <div className="card-premium p-5 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-4 sm:mb-5 p-3 rounded-lg text-xs sm:text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleEmailRegister} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="name" className="block text-xs sm:text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Nome
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border transition-all text-sm sm:text-base touch-target"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border transition-all text-sm sm:text-base touch-target"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Senha (mín. 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border transition-all text-sm sm:text-base touch-target"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-violet flex items-center justify-center gap-2 hover-lift disabled:opacity-50 touch-target text-sm sm:text-base py-3 sm:py-3.5"
            >
              <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </form>

          <div className="my-5 sm:my-6 flex items-center">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--border-subtle))' }}></div>
            <span className="px-3 sm:px-4 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, var(--border-subtle))' }}></div>
          </div>

          {/* Google Register - Com o meme */}
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
              <span className="text-xs sm:text-sm">Criar conta com Google</span>
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

          <p className="text-center text-xs sm:text-sm mt-5 sm:mt-6" style={{ color: 'var(--text-secondary)' }}>
            Já tem uma conta?{" "}
            <Link href="/login" className="font-semibold hover:underline transition-all inline-flex items-center gap-1" style={{ color: 'var(--accent-violet)' }}>
              Fazer login
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
