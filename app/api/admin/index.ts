import { NextApiRequest, NextApiResponse } from 'next';

// Simulação de base de dados de administradores
const admins = [
  { id: '1', name: 'Aventura', username: 'aventura' },
  // Adicione mais admins conforme necessário
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Retorna a lista de administradores
    res.status(200).json(admins);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
