import { NextResponse } from 'next/server';

export async function GET() {
  // Do not display the full key, just check if it exists
  const hasAdminPrivateKey = !!process.env.LEARN2EARN_ADMIN_PRIVATE_KEY;
  const keyLength = process.env.LEARN2EARN_ADMIN_PRIVATE_KEY?.length || 0;
  
  return NextResponse.json({
    hasKey: hasAdminPrivateKey,
    keyLength: keyLength,
    message: hasAdminPrivateKey 
      ? 'LEARN2EARN_ADMIN_PRIVATE_KEY is set correctly' 
      : 'LEARN2EARN_ADMIN_PRIVATE_KEY is not set'
  });
}