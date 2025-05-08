"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import jwt from "jsonwebtoken";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Interface para as opções de autenticação
interface AuthOptions {
  // Tipo de usuário: 'admin', 'company', 'seeker', 'support'
  userType?: 'admin' | 'company' | 'seeker' | 'support';
  // URL da página de login para redirecionamento, se não especificado, será determinado pelo userType
  loginPath?: string;
}

export default function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: AuthOptions = {}
) {
  const WithAuth = (props: P) => {
    const router = useRouter();
    
    // Determinar qual tipo de usuário e caminho de login usar
    // Mudado o padrão para 'seeker' em vez de 'admin' quando não especificado
    const userType = options.userType || 'seeker';
    
    // Mapear tipos de usuário para caminhos de login e nomes de token
    const typeToLoginPath = {
      'admin': '/admin-login',
      'company': '/login',
      'seeker': '/login',
      'support': '/support-login'
    };
    
    const typeToTokenName = {
      'admin': 'token',            // token JWT para admin
      'company': 'companyToken',   // token específico para company
      'seeker': 'seekerToken',     // token específico para seeker
      'support': 'supportToken'    // token específico para support
    };
    
    // Determinar caminho de login adequado
    const loginPath = options.loginPath || typeToLoginPath[userType];
    
    // Determinar nome do token a ser verificado
    const tokenName = typeToTokenName[userType];

    useEffect(() => {
      const checkToken = async () => {
        // Verificar se existe um token para o tipo de usuário adequado
        const token = localStorage.getItem(tokenName);

        if (!token || token === "null") {
          console.warn(`No valid ${userType} token found. Redirecting to ${loginPath}.`);
          router.replace(loginPath);
          return;
        }

        try {
          // Admin usa token JWT que precisa ser verificado
          if (userType === 'admin') {
            if (!process.env.JWT_SECRET) {
              throw new Error("JWT_SECRET is not defined in the environment variables.");
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const adminId = typeof decoded !== "string" && "id" in decoded ? decoded.id : null;

            if (!adminId) {
              console.error("Invalid admin token payload. Redirecting to login.");
              router.replace(loginPath);
              return;
            }

            // Verificar token do admin no Firestore
            if (!db) {
              throw new Error("Firestore instance is not initialized.");
            }
            const adminRef = doc(db, "admins", adminId);
            const adminDoc = await getDoc(adminRef);

            if (!adminDoc.exists() || adminDoc.data().token !== token) {
              console.error("Token mismatch or admin not found. Redirecting to login.");
              router.replace(loginPath);
              return;
            }
          } 
          // Para outros tipos de usuário, podemos implementar verificações específicas
          // Por exemplo, para seekers e companies, podemos verificar se o ID decodificado existe no Firestore
          else if (userType === 'seeker') {
            // Para seekers, o token geralmente é apenas o ID codificado em base64
            try {
              const seekerId = atob(token); // Decodificar token base64
              
              if (!db) {
                throw new Error("Firestore instance is not initialized.");
              }
              
              const seekerRef = doc(db, "seekers", seekerId);
              const seekerDoc = await getDoc(seekerRef);
              
              if (!seekerDoc.exists()) {
                console.error("Seeker not found in database. Redirecting to login.");
                router.replace(loginPath);
                return;
              }
            } catch (error) {
              console.error("Invalid seeker token:", error);
              router.replace(loginPath);
              return;
            }
          }
          // Verificação similar para companhias e suporte
          else if (userType === 'company' || userType === 'support') {
            // Implementar verificações específicas conforme necessário
            // Esta é uma verificação simplificada que apenas verifica se o token existe
          }

          console.log(`${userType} token is valid.`);
        } catch (err) {
          console.error(`Invalid or expired ${userType} token:`, err);
          router.replace(loginPath);
        }
      };

      checkToken();
    }, [router, loginPath, userType, tokenName]);

    if (typeof window !== "undefined" && !localStorage.getItem(tokenName)) {
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };

  WithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

  return WithAuth;
}