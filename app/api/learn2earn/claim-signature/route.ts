import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { db } from '../../../../lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, DocumentSnapshot, DocumentData } from 'firebase/firestore';

// Importando varíaveis de ambiente
// Em produção, essas chaves devem ser armazenadas de forma segura
// e nunca expostas no código-fonte ou no frontend
const ADMIN_PRIVATE_KEY = process.env.LEARN2EARN_ADMIN_PRIVATE_KEY;

// Determinar o ambiente atual
const isDevelopment = process.env.NODE_ENV !== 'production';
const isVercel = !!process.env.VERCEL;

/**
 * Endpoint para gerar uma assinatura digital para o claim de tokens no contrato Learn2Earn
 * Este endpoint:
 * 1. Verifica se o usuário completou todas as tarefas necessárias
 * 2. Verifica se o ID do learn2earn é válido
 * 3. Verifica se o usuário ainda não recebeu tokens para este learn2earn
 * 4. Gera uma assinatura válida que será aceita pelo contrato inteligente
 */
export async function GET(request: Request) {
  try {
    // Autenticação é necessária para este endpoint em produção!
    console.log(`Environment: ${process.env.NODE_ENV}, Vercel: ${isVercel}`);

    // Extrair parâmetros da URL
    const { searchParams } = new URL(request.url);
    // Aceita tanto firebaseId quanto contractId para retrocompatibilidade
    const firebaseId = searchParams.get('firebaseId') || searchParams.get('contractId');
    const userAddress = searchParams.get('address');
    const amount = searchParams.get('amount');

    console.log("Claim signature request params:", { firebaseId, userAddress, amount });

    // Validação dos parâmetros
    if (!firebaseId || !userAddress || !amount) {
      console.warn("Missing parameters:", { firebaseId, userAddress, amount });
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

    // Verificar se a chave privada está configurada
    if (!ADMIN_PRIVATE_KEY) {
      console.warn("LEARN2EARN_ADMIN_PRIVATE_KEY not found in environment variables");
      // Em ambiente de produção, isso é um erro crítico
      if (!isDevelopment) {
        return NextResponse.json(
          { error: 'Server configuration error: Signature generation is not configured' },
          { status: 500 }
        );
      }
    }

    // Normalizar o endereço para comparações consistentes
    const normalizedUserAddress = userAddress.toLowerCase();

    // Buscar o documento Learn2Earn pelo ID usado na criação do contrato
    const learnCollection = collection(db, "learn2earn");
    let learnQuery = query(learnCollection, where("firebaseId", "==", firebaseId));
    let querySnapshot = await getDocs(learnQuery);
    
    // Se não encontrou pelo firebaseId, tenta pelo ID do documento
    if (querySnapshot.empty) {
      try {
        const directDocRef = doc(db, "learn2earn", firebaseId);
        const directDoc = await getDoc(directDocRef);
        
        if (directDoc.exists()) {
          // Não podemos criar um QuerySnapshot diretamente, então vamos apenas continuar
          // com o documento obtido diretamente e ignorar o querySnapshot
          const learn2earn = directDoc.data();
          const firebaseDocId = directDoc.id;
          
          return await handleExistingDocument(
            firebaseDocId,
            learn2earn,
            userAddress,
            normalizedUserAddress,
            amount
          );
        }
      } catch (e) {
        console.warn("Failed to get direct document:", e);
      }
    }

    if (querySnapshot.empty) {
      // Em desenvolvimento local, podemos continuar sem o documento
      if (isDevelopment && !isVercel) {
        console.warn("LOCAL DEV MODE: Learn2Earn not found, but allowing claim for testing");
        
        // Criar documento temporário para testes
        const mockLearn2EarnData = {
          learn2earnId: 1,
          startDate: { seconds: Math.floor((Date.now() - 86400000) / 1000) },  // Ontem
          endDate: { seconds: Math.floor((Date.now() + 86400000) / 1000) },    // Amanhã
          tokenAmount: amount
        };
        
        // Processar com dados fictícios
        return await handleExistingDocument(
          "dev-test-id",
          mockLearn2EarnData,
          userAddress,
          normalizedUserAddress,
          amount
        );
      }
      
      return NextResponse.json(
        { error: 'Learn2Earn opportunity not found with the provided Firebase ID' },
        { status: 404 }
      );
    }

    const learn2earn = querySnapshot.docs[0].data();
    const firebaseDocId = querySnapshot.docs[0].id; // Firestore document ID
    
    return await handleExistingDocument(
      firebaseDocId,
      learn2earn,
      userAddress,
      normalizedUserAddress,
      amount
    );
  } catch (error) {
    console.error('Error in claim-signature API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * Função auxiliar para processar um documento Learn2Earn existente
 */
async function handleExistingDocument(
  firebaseDocId: string, 
  learn2earn: DocumentData, 
  userAddress: string, 
  normalizedUserAddress: string, 
  amount: string
) {
  console.log("Processing Learn2Earn document:", firebaseDocId, learn2earn);
  
  // Get the numeric contract ID from the document data
  const contractId = Number(learn2earn.learn2earnId || 1); // Default to 1 if no ID found
  
  if (isNaN(contractId)) {
    console.warn("Invalid contractId:", learn2earn.learn2earnId);
    return NextResponse.json(
      { error: 'Invalid contractId in the learn2earn document' },
      { status: 400 }
    );
  }

  // Verificar se o usuário completou as tarefas necessárias
  const participantsCollection = collection(db, "learn2earnParticipants");
  const participantQuery = query(
    participantsCollection,
    where("learn2earnId", "==", firebaseDocId),
    where("walletAddress", "==", normalizedUserAddress)
  );
  const participantSnapshot = await getDocs(participantQuery);
  
  let userQualified = false;
  
  if (!participantSnapshot.empty) {
    const participant = participantSnapshot.docs[0].data();
    
    if (!participant.claimed) {
      userQualified = true;
    } else {
      console.log("User already claimed rewards");
      
      // No modo de desenvolvimento local, permitir reivindicação mesmo já tendo reivindicado antes
      if (isDevelopment && !isVercel) {
        console.warn("LOCAL DEV MODE: User already claimed, but allowing claim for testing");
        userQualified = true;
      } else {
        return NextResponse.json(
          { error: 'You have already claimed tokens for this Learn2Earn opportunity' },
          { status: 400 }
        );
      }
    }
  } else {
    // Em desenvolvimento local, sempre considerar o usuário qualificado para testes
    if (isDevelopment && !isVercel) {
      console.warn("LOCAL DEV MODE: User not found in participants, but allowing claim for testing");
      userQualified = true;
    }
  }

  if (!userQualified) {
    console.warn("User not qualified:", normalizedUserAddress);
    return NextResponse.json(
      { error: 'You have not completed the required tasks for this Learn2Earn' },
      { status: 403 }
    );
  }

  // Se chegamos até aqui, o usuário está qualificado para receber os tokens
  // Agora vamos gerar a assinatura digital
  try {
    // Verificar a disponibilidade da chave privada
    if (!ADMIN_PRIVATE_KEY) {
      if (!isDevelopment || isVercel) {
        throw new Error("Admin private key not configured in environment variables");
      }
      
      // Em desenvolvimento local, podemos usar uma chave de teste temporária
      // Esta chave não é válida e só deve ser usada para testes do frontend
      console.warn("LOCAL DEV MODE: Using temporary test key (this signature won't work on real blockchain)");
    }

    // Usar a chave privada administradora ou uma chave temporária para desenvolvimento local
    const privateKey = ADMIN_PRIVATE_KEY || 
      (isDevelopment && !isVercel ? "0x0000000000000000000000000000000000000000000000000000000000000001" : null);
    
    if (!privateKey) {
      throw new Error("No private key available for signature generation");
    }

    // Usar a chave privada para assinar a mensagem
    const wallet = new ethers.Wallet(privateKey);
    
    // Criando a mensagem para assinar (deve corresponder à verificação feita no contrato)
    // No contrato: keccak256(abi.encodePacked(_user, _learn2earnId, _amount))
    const messageHash = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256'],
      [userAddress, contractId, ethers.BigNumber.from(amount)]
    );
    
    // Assinar o hash diretamente (o contrato já vai adicionar o prefixo Ethereum)
    const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
    
    console.log(`Generated signature for user ${userAddress}, contractId ${contractId}, amount ${amount}`);
    
    // Indicar se estamos em modo de desenvolvimento local
    const isLocalDev = isDevelopment && !isVercel;
    
    return NextResponse.json({
      success: true,
      signature,
      message: isLocalDev ? 'Test signature generated (local development only)' : 'Signature generated successfully',
      isLocalDev
    });
  } catch (signError) {
    console.error('Error generating signature:', signError);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
}

/**
 * Mantém o método POST para compatibilidade, mas usa a mesma lógica do GET
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firebaseId, userAddress, amount } = body;
    
    // Criar uma URL para repassar para o endpoint GET
    const url = new URL(request.url);
    url.searchParams.set('firebaseId', firebaseId);
    url.searchParams.set('address', userAddress);
    url.searchParams.set('amount', amount);
    
    // Usar a mesma lógica do GET
    const modifiedRequest = new Request(url, {
      headers: request.headers,
      method: 'GET'
    });
    
    return GET(modifiedRequest);
  } catch (error) {
    console.error('Error in POST claim-signature API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}