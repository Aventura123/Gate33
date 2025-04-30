import { NextRequest, NextResponse } from "next/server";
import { db, storage, diagnoseFBStorage } from "../../../../lib/firebase";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

/**
 * Endpoint para diagnóstico do Firebase Storage
 * Tenta um upload simples para verificar se o Storage está funcionando
 */
export async function GET(req: NextRequest) {
  try {
    console.log("Iniciando diagnóstico do Firebase Storage...");
    
    // Executar diagnóstico básico do Firebase Storage
    const basicDiagnosis = await diagnoseFBStorage();
    console.log("Resultado do diagnóstico básico:", basicDiagnosis);

    // Se o diagnóstico básico falhar, retornar o resultado
    if (basicDiagnosis.status === "error") {
      return NextResponse.json({
        success: false,
        diagnose: basicDiagnosis
      });
    }
    
    // Teste adicional - tentar fazer um upload de uma string simples
    try {
      console.log("Tentando fazer upload de teste para o Firebase Storage...");
      
      // Adicionando verificação para garantir que o storage não seja null antes de usar
      if (!storage) {
        return NextResponse.json({
          success: false,
          message: "Firebase Storage não está inicializado. Verifique a configuração do Firebase.",
        }, { status: 500 });
      }

      // Criar um arquivo de texto simples para teste
      const testFileRef = ref(storage, `test/diagnostic-${Date.now()}.txt`);
      const testContent = "Este é um arquivo de teste para diagnóstico do Firebase Storage - " + new Date().toISOString();
      
      // Tentar upload
      await uploadString(testFileRef, testContent);
      console.log("Upload de teste realizado com sucesso");
      
      // Tentar obter URL
      const downloadURL = await getDownloadURL(testFileRef);
      console.log("URL de download obtida com sucesso:", downloadURL);
      
      return NextResponse.json({
        success: true,
        message: "Firebase Storage está funcionando corretamente",
        diagnosticResult: {
          basicDiagnosis,
          testUpload: {
            success: true,
            downloadURL
          }
        },
        firebase: {
          storageInitialized: !!storage,
          firebaseConfig: {
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""
          }
        }
      });
    } catch (uploadError: any) {
      console.error("Erro no teste de upload:", uploadError);
      
      // Informações detalhadas sobre o erro
      const errorDetails = {
        code: uploadError.code,
        message: uploadError.message,
        name: uploadError.name,
        serverResponse: uploadError.serverResponse
      };
      
      // Obter sugestões baseadas no código de erro
      let suggestions = ["Verifique sua conexão de internet"];
      
      if (uploadError.code === "storage/unauthorized") {
        suggestions = [
          "As regras de segurança do Firebase Storage estão bloqueando o acesso",
          "Verifique as regras de segurança no Console do Firebase",
          "Experimente esta regra para teste: service firebase.storage { match /b/{bucket}/o { match /{allPaths=**} { allow read, write: if true; } } }"
        ];
      } else if (uploadError.code === "storage/quota-exceeded") {
        suggestions = ["A cota do seu plano Firebase foi excedida", "Considere atualizar para um plano pago"];
      } else if (uploadError.code?.includes("network")) {
        suggestions = ["Há um problema de conexão com a internet", "Verifique seu firewall ou conexão VPN"];
      }
      
      return NextResponse.json({
        success: false,
        message: "Falha no teste de upload para o Firebase Storage",
        diagnosticResult: {
          basicDiagnosis,
          testUpload: {
            success: false,
            error: errorDetails
          }
        },
        suggestions,
        firebase: {
          storageInitialized: !!storage,
          firebaseConfig: {
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""
          }
        }
      });
    }
    
  } catch (error: any) {
    console.error("Erro ao executar diagnóstico completo:", error);
    return NextResponse.json({
      success: false,
      message: "Erro ao executar diagnóstico completo",
      error: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
}