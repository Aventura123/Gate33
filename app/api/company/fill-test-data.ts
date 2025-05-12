import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// ID da empresa de teste fornecido pelo usuário
const TEST_COMPANY_ID = 'company-susana1-1745631109298';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await setDoc(doc(db, 'companies', TEST_COMPANY_ID), {
      name: 'Gate33 Tecnologia Ltda',
      description: 'Empresa inovadora focada em soluções blockchain, pagamentos digitais e Web3.',
      website: 'https://gate33.com',
      location: 'São Paulo, SP',
      responsiblePerson: 'João da Silva',
      responsibleEmail: 'joao@gate33.com',
      address: 'Av. Paulista, 1000, 10º andar, São Paulo, SP, 01310-100',
      contactPhone: '+55 11 99999-8888',
      email: 'contato@gate33.com',
      taxId: '12.345.678/0001-99',
      registrationNumber: '123456789',
      industry: 'Tecnologia da Informação',
      country: 'Portugal',
      employees: '25',
      yearsActive: '4',
      linkedin: 'https://linkedin.com/company/gate33',
      telegram: '@gate33',
      twitter: '@gate33',
      facebook: 'gate33',
      instagram: 'gate33oficial',
      responsiblePosition: 'Diretor de Operações',
      responsiblePhone: '+55 11 98888-7777',
      comments: 'Empresa referência em inovação blockchain.',
      officialDocumentUrl: 'https://gate33.com/docs/contrato-social.pdf',
    }, { merge: true });

    return res.status(200).json({ message: 'Dados de teste preenchidos com sucesso!' });
  } catch (error) {
    console.error('Erro ao preencher dados de teste:', error);
    return res.status(500).json({ message: 'Erro ao preencher dados de teste.' });
  }
}
