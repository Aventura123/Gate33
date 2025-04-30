// File: app/api/cryptocurrencies/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleUpdateRequest } from '../update-service';

// Endpoint GET para acionar a atualização dos dados
export async function GET(request: NextRequest) {
  try {
    // Verificar autorização (opcional, pode implementar autenticação mais robusta)
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    
    // Chave simples para evitar atualizações não autorizadas
    // Em produção, implemente autenticação mais segura
    if (apiKey !== process.env.CRYPTO_UPDATE_KEY && apiKey !== 'gate33-admin-key') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const result = await handleUpdateRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Erro ao processar requisição de atualização:', error);
    return NextResponse.json(
      { error: 'Falha ao processar requisição de atualização' },
      { status: 500 }
    );
  }
}