import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Preencha com os dados do seu app LinkedIn
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const REDIRECT_URI = 'https://www.gate33.net/api/linkedin/callback';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`LinkedIn OAuth error: ${error_description || error}`);
  }

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    // Troca o code pelo access token
    const tokenRes = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, expires_in } = tokenRes.data;

    // Exibe o token na tela (copie e salve em local seguro, depois remova este print!)
    res.status(200).json({
      message: 'Access token obtido com sucesso! Salve este token em local seguro.',
      access_token,
      expires_in,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao trocar authorization code pelo access token', details: err?.response?.data || err.message });
  }
}
