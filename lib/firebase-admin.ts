// Placeholder para Firebase Admin SDK
// Para produção, você precisará configurar o Firebase Admin SDK no servidor
// Por enquanto, retornamos null para desenvolvimento

export async function verifyIdToken(token: string) {
  // Em produção, use o Firebase Admin SDK aqui
  // Por enquanto, retornamos um objeto mockado
  // Você precisará instalar: npm install firebase-admin
  // E configurar as credenciais do serviço
  
  // Para desenvolvimento, vamos usar o cliente Firebase
  return { uid: "", email: "" };
}

