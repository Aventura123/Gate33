import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import bcrypt from "bcryptjs";

// Handler para método OPTIONS (para suporte CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  // Configuração de headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  
  try {
    // Verificar se a requisição é um objeto válido
    if (!req || !req.json) {
      return NextResponse.json({ error: 'Objeto de requisição inválido' }, { status: 400, headers });
    }
    
    const body = await req.json();
    const email = body.email;
    const password = body.password;
    
    if (!email || !password) {
      console.log('Email ou password ausente');
      return NextResponse.json({ error: 'Email e password obrigatórios' }, { status: 400, headers });
    }
    
    console.log("Tentativa de login para candidato:", email);
    
    if (!db) {
      throw new Error("Firestore instance is not initialized");
    }

    // Consultar a coleção seekers no Firestore
    const seekersRef = collection(db, "seekers");
    const q = query(seekersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    console.log("Resultado da consulta:", querySnapshot.size);

    if (querySnapshot.empty) {
      console.warn("Nenhum candidato encontrado com o email fornecido:", email);
      return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401, headers });
    }

    // Obter os dados do candidato
    const seekerDoc = querySnapshot.docs[0];
    const seekerData = seekerDoc.data();
    const seekerId = seekerDoc.id;
    
    console.log("Dados do candidato recuperados:", { email, id: seekerId });

    // Verificar senha
    const storedHash = seekerData.password;
    if (!storedHash || typeof storedHash !== "string") {
      console.error("Hash de senha não encontrado ou inválido para email:", email);
      return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401, headers });
    }

    // Comparar senha fornecida com hash armazenado
    let passwordMatches = false;
    
    // Verificar se é um hash bcrypt (começa com $2)
    if (storedHash.startsWith('$2')) {
      passwordMatches = await bcrypt.compare(password, storedHash);
      console.log("Resultado da comparação bcrypt:", passwordMatches);
    } else {
      // Comparação direta para senhas não criptografadas (apenas para desenvolvimento/teste)
      passwordMatches = (password === storedHash);
      console.log("Resultado da comparação direta de senha:", passwordMatches);
    }

    if (passwordMatches) {
      console.log("Login bem-sucedido para candidato:", email);

      // Criar um token simples com o ID do candidato
      const token = Buffer.from(seekerId).toString("base64");

      return NextResponse.json({ 
        success: true, 
        token: token,
        seeker: {
          id: seekerId,
          name: seekerData.name || seekerData.firstName || email,
          email: email,
          photoURL: seekerData.photoURL || seekerData.photo
        }
      }, { headers });
    } else {
      console.log("Senha incorreta para candidato:", email);
      return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401, headers });
    }
  } catch (error) {
    console.error("Erro ao processar autenticação do candidato:", error);
    return NextResponse.json({ success: false, error: "Erro no servidor" }, { status: 500, headers });
  }
}