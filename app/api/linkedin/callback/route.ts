import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Configurações do LinkedIn OAuth
const CLIENT_ID = "77u9qtiet3nmdh"; // Seu client_id do LinkedIn
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "WPL_AP1.9FS2BXA5qW2rc7pI.76Uj3A=="; // Pode ser fixo ou via env
const REDIRECT_URI = "https://gate33.net/api/linkedin/callback"; // Corrigido para a rota da API

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

  try {
    // Troca o código de autorização por um access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );    const { access_token, expires_in } = tokenResponse.data;
    
    // Exibe o token na tela para uso
    return NextResponse.json({
      message: 'Token gerado com sucesso!',
      access_token,
      expires_in,
      token_type: tokenResponse.data.token_type || 'Bearer'
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.response?.data || err.message || err.toString()
    }, { status: 500 });
  }
}
