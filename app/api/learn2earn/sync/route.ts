import { NextResponse } from 'next/server';
import learn2earnContractService from '../../../../services/learn2earnContractService';
import { db } from '../../../../lib/firebase';

/**
 * API endpoint para sincronizar o status do Learn2Earn entre o Firestore e a blockchain
 * 
 * @route POST /api/learn2earn/sync
 * @param {string} id - ID opcional do Learn2Earn específico a ser sincronizado (se omitido, sincroniza todos)
 * @returns Resultados da sincronização
 */
export async function POST(request: Request) {
  try {
    // Obter dados da solicitação
    const { id } = await request.json();

    // Sincronização individual se um ID foi fornecido
    if (id) {
      console.log(`Iniciando sincronização do Learn2Earn com Firebase ID: ${id}`);
      // O parâmetro id aqui é o firebaseId (ID do documento no Firestore)
      const result = await learn2earnContractService.syncLearn2EarnStatus(id);
      
      return NextResponse.json({
        success: result.success,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        message: result.success ? "Sincronização concluída com sucesso" : result.message
      });
    } 
    // Sincronização em massa se nenhum ID foi fornecido
    else {
      console.log("Iniciando sincronização de todos os Learn2Earns");
      const result = await learn2earnContractService.syncAllLearn2EarnStatuses();
      
      return NextResponse.json({
        success: result.success,
        total: result.total,
        synchronized: result.synchronized,
        failed: result.failed,
        message: result.success 
          ? `Sincronização concluída: ${result.synchronized}/${result.total} Learn2Earns sincronizados com sucesso` 
          : result.message
      });
    }
  } catch (error) {
    console.error("Erro durante sincronização de Learn2Earns:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Erro desconhecido durante sincronização" 
      }, 
      { status: 500 }
    );
  }
}