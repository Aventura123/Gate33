import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

export async function GET() {
  try {
    console.log("API: Fetching system logs...");
    
    // Verifica se o usuário tem permissão (isso pode ser expandido com middleware de autenticação)
    // Por enquanto, vamos apenas fornecer os logs
    
    // Consulta os logs do Firestore
    const logsCollection = collection(db, "systemLogs");
    const logsQuery = query(
      logsCollection,
      orderBy("timestamp", "desc"),
      limit(100) // Limita a 100 logs mais recentes
    );
    
    const logsSnapshot = await getDocs(logsQuery);
    
    // Se não houver logs, retorne um array vazio
    if (logsSnapshot.empty) {
      console.log("API: No logs found");
      return NextResponse.json([], { status: 200 });
    }
    
    // Converte os documentos em objetos de log
    const logs = logsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
        action: data.action || "unknown action",
        user: data.user || "unknown user",
        details: data.details || {}
      };
    });
    
    console.log(`API: Retrieved ${logs.length} system logs`);
    
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("Error fetching system logs:", error);
    return NextResponse.json({ error: "Failed to fetch system logs" }, { status: 500 });
  }
}