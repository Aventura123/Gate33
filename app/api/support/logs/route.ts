import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, where, deleteDoc, Timestamp, doc, getDoc, setDoc } from "firebase/firestore";
// Removed bcryptjs import as no longer needed

export async function GET(request: Request) {
  try {
    console.log("API: Fetching system logs...");
    
    // Consulta os logs do Firestore sem exigir autenticação
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
    return NextResponse.json({ error: "Failed to fetch system logs" }, { status: 500 });
  }
}
// Função para ser utilizada no cliente para deletar logs
export const deleteSystemLogs = async (token: string, startDate: string, endDate: string, userId: string) => {
  try {
    const response = await fetch('/api/support/logs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ startDate, endDate, userId })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao deletar logs');
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao deletar logs:', error);
    throw error;
  }
};

export async function DELETE(request: Request) {
  try {    const { startDate, endDate, userId } = await request.json();
    // Verifica o token do Firebase na header Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authentication token missing" }, { status: 401 });
    }
    const token = authHeader.substring(7); // Remove "Bearer "
    if (!token) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }
    if (!userId) {
      return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
    }
    const userRef = doc(db, "admins", userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    const userData = userDoc.data();
    const userRole = userData.role;
    if (userRole !== "super_admin" && userRole !== "admin" && userRole !== "support") {
      return NextResponse.json({ error: "Permission denied. Only administrators can clear logs." }, { status: 403 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
    }
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999); // Definir para o fim do dia
    const startTimestamp = Timestamp.fromDate(startDateTime);
    const endTimestamp = Timestamp.fromDate(endDateTime);
    const logsCollection = collection(db, "systemLogs");
    const logsQuery = query(
      logsCollection,
      where("timestamp", ">=", startTimestamp),
      where("timestamp", "<=", endTimestamp)
    );
    const logsSnapshot = await getDocs(logsQuery);
    if (logsSnapshot.empty) {
      return NextResponse.json({ message: "No logs found in the specified date range" }, { status: 200 });
    }
    const deletePromises = logsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    const logsCount = logsSnapshot.size;
    try {
      const systemLogsCollection = collection(db, "systemLogs");
      const newLogData = {
        timestamp: Timestamp.now(),
        action: "logs_cleaned",
        user: userId,
        details: {
          startDate: startDate,
          endDate: endDate,
          logsRemoved: logsCount,
          cleanedAt: new Date().toISOString()
        }
      };
      await setDoc(doc(systemLogsCollection), newLogData);
    } catch (logError) {
      // Não interrompe o fluxo por falha no log de auditoria
    }
    return NextResponse.json({ 
      message: `${logsCount} logs successfully removed` 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete system logs" }, { status: 500 });
  }
}

