import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No code received from LinkedIn.' }, { status: 400 });
  }

  // Exibe o code na tela para fácil cópia
  return new Response(
    `<html><body style="font-family:sans-serif;padding:2em"><h2>LinkedIn OAuth Callback</h2><p><b>Authorization code:</b></p><pre style="background:#eee;padding:1em">${code}</pre><p>Copie este código e use no comando curl para obter o access token.</p></body></html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}
