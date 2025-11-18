"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { BookOpen, FileText, Heart, ArrowRight, Users, Sparkles } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Célula31
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Escolha um módulo para começar sua jornada de estudo e crescimento espiritual
          </p>
        </div>

        {/* Cards dos Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Estudo Bíblico - Célula */}
          <Link
            href="/home"
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover-lift animate-fade-in"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-8 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Estudo Bíblico</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Estude a Bíblia capítulo por capítulo em comunidade. Crie salas, escreva resumos e participe de discussões.
              </p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                <span>Começar</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>
          </Link>

          {/* Criador de Sermões */}
          <Link
            href="/sermons"
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover-lift animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-8 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Criador de Sermões</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Crie e organize seus sermões com facilidade. Estruture suas mensagens com versículos, pontos principais e aplicações.
              </p>
              <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                <span>Começar</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>
          </Link>

          {/* Devocional */}
          <div className="group relative bg-white rounded-2xl shadow-lg opacity-75 cursor-not-allowed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10"></div>
            <div className="p-8 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-2xl font-bold text-gray-900">Devocional</h2>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                  Em breve
                </span>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Momentos diários de reflexão e conexão com Deus. Este módulo está em desenvolvimento.
              </p>
              <div className="flex items-center text-gray-400">
                <span>Em construção</span>
                <Sparkles className="w-5 h-5 ml-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-500 text-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <p>Escolha um módulo acima para começar</p>
        </div>
      </div>
    </div>
  );
}

