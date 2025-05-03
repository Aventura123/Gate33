import { NextResponse } from 'next/server';

export async function GET() {
  // Não exiba a chave completa, apenas verifique se ela existe
  const hasAdminPrivateKey = !!process.env.LEARN2EARN_ADMIN_PRIVATE_KEY;
  const keyLength = process.env.LEARN2EARN_ADMIN_PRIVATE_KEY?.length || 0;
  
  return NextResponse.json({
    hasKey: hasAdminPrivateKey,
    keyLength: keyLength,
    message: hasAdminPrivateKey 
      ? 'LEARN2EARN_ADMIN_PRIVATE_KEY está configurada corretamente' 
      : 'LEARN2EARN_ADMIN_PRIVATE_KEY não está configurada'
  });
}