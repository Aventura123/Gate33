import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json({ error: 'Código de autorização não encontrado.' }, { status: 400 });
  }

  try {
    // Trocar o código pelo access token
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/linkedin-callback');
    params.append('client_id', process.env.LINKEDIN_CLIENT_ID || 'SUA_CLIENT_ID');
    params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET || 'SUA_CLIENT_SECRET');

    const response = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return NextResponse.json({ access_token: response.data.access_token, state });
  } catch (error: any) {
    return NextResponse.json({ error: error.response?.data || error.message }, { status: 500 });
  }
}
