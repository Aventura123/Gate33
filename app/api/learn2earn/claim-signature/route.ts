import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { db } from '../../../../lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

// Importando varíaveis de ambiente
// Em produção, essas chaves devem ser armazenadas de forma segura
// e nunca expostas no código-fonte ou no frontend
const ADMIN_PRIVATE_KEY = process.env.LEARN2EARN_ADMIN_PRIVATE_KEY;

/**
 * Endpoint para gerar uma assinatura digital para o claim de tokens no contrato Learn2Earn
 * Este endpoint:
 * 1. Verifica se o usuário completou todas as tarefas necessárias
 * 2. Verifica se o ID do learn2earn é válido
 * 3. Verifica se o usuário ainda não recebeu tokens para este learn2earn
 * 4. Gera uma assinatura válida que será aceita pelo contrato inteligente
 */
export async function POST(request: Request) {
  try {
    // Autenticação é necessária para este endpoint em produção!
    // Neste exemplo estamos deixando aberto para fins didáticos

    const body = await request.json();
    const { contractId, userAddress, amount, network } = body;

    // Validação dos parâmetros
    if (!contractId || !userAddress || !amount || !network) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verificar se o endereço do usuário é válido
    if (!ethers.utils.isAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Para encontrar o learn2earn pelo contractId
    const learnCollection = collection(db, "learn2earn");
    const learnQuery = query(learnCollection, where("contractId", "==", contractId.toString()));
    const querySnapshot = await getDocs(learnQuery);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Learn2Earn opportunity not found with the provided contractId' },
        { status: 404 }
      );
    }

    const learn2earn = querySnapshot.docs[0].data();
    const learn2earnId = querySnapshot.docs[0].id;

    // Verificar se o learn2earn está ativo
    if (learn2earn.status !== 'active') {
      return NextResponse.json(
        { error: 'This Learn2Earn opportunity is not active' },
        { status: 400 }
      );
    }

    // Verificar se o usuário completou as tarefas necessárias
    const participantsCollection = collection(db, "learn2earnParticipants");
    const participantQuery = query(
      participantsCollection,
      where("learn2earnId", "==", learn2earnId),
      where("walletAddress", "==", userAddress.toLowerCase())
    );
    const participantSnapshot = await getDocs(participantQuery);

    if (participantSnapshot.empty) {
      return NextResponse.json(
        { error: 'You have not completed the required tasks for this Learn2Earn' },
        { status: 403 }
      );
    }

    // Verificar se o usuário já recebeu tokens (para evitar dupla recompensa)
    const participant = participantSnapshot.docs[0].data();
    
    if (participant.rewarded) {
      return NextResponse.json(
        { error: 'You have already been rewarded for this Learn2Earn opportunity' },
        { status: 400 }
      );
    }

    // Se a chave privada do admin não estiver configurada, retorne um erro específico
    // Isso ajuda durante o desenvolvimento para identificar claramente o problema
    if (!ADMIN_PRIVATE_KEY) {
      console.error("Admin private key not configured. Cannot generate signature.");
      return NextResponse.json(
        { 
          error: 'Signature generation is not configured on this server',
          devEnvironment: true
        },
        { status: 500 }
      );
    }

    // Se chegamos até aqui, o usuário está qualificado para receber os tokens
    // Agora vamos gerar a assinatura digital
    try {
      // Usar a chave privada do admin para assinar a mensagem
      const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);
      
      // Criando a mensagem para assinar (deve corresponder à verificação feita no contrato)
      // No contrato: keccak256(abi.encodePacked(_user, _learn2earnId, _amount))
      const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'uint256', 'uint256'],
        [userAddress, contractId, amount]
      );
      
      // Adicionar o prefixo Ethereum para compatibilidade com verificação no contrato
      const prefixedHash = ethers.utils.arrayify(
        ethers.utils.solidityKeccak256(
          ['string', 'bytes32'],
          ['\x19Ethereum Signed Message:\n32', messageHash]
        )
      );
      
      // Assinar a mensagem
      const signature = await wallet.signMessage(prefixedHash);
      
      console.log(`Generated signature for user ${userAddress}, contractId ${contractId}, amount ${amount}`);
      
      return NextResponse.json({
        success: true,
        signature,
        message: 'Signature generated successfully'
      });
    } catch (signError) {
      console.error('Error generating signature:', signError);
      return NextResponse.json(
        { error: 'Failed to generate signature' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in claim-signature API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}