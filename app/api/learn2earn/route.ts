import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

// Simple Firebase Admin initialization
function getAdminDb() {
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    console.log('Firebase config check:', {
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey?.length,
      clientEmail,
      projectId,
      envKeys: Object.keys(process.env).filter(key => key.includes('FIREBASE'))
    });

    if (!privateKey || !clientEmail || !projectId) {
      const errorMsg = `Missing Firebase Admin credentials: privateKey=${!!privateKey}, clientEmail=${!!clientEmail}, projectId=${!!projectId}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      throw error;
    }
  }
  
  return getFirestore();
}

// Handle GET requests to fetch all learn2earn opportunities or a specific one
export async function GET(request: Request) {
  try {
    const adminDb = getAdminDb();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // If ID is provided, fetch a specific learn2earn opportunity
    if (id) {
      const docRef = adminDb.collection("learn2earn").doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return NextResponse.json({ error: 'Learn2Earn opportunity not found' }, { status: 404 });
      }

      const data = {
        id: docSnap.id,
        ...docSnap.data()
      };

      return NextResponse.json(data);
    }

    // Otherwise, fetch all active learn2earn opportunities
    const learnQuery = adminDb.collection("learn2earn").where("status", "==", "active");
    const querySnapshot = await learnQuery.get();

    const data = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Learn2Earn API:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

// Handle POST requests to process participation
export async function POST(request: Request) {
  try {
    console.log('Learn2Earn API POST request received');
    const adminDb = getAdminDb();
    const body = await request.json();
    console.log('Request body:', body);
    const { learn2earnId, walletAddress, answers } = body;

    // Validate required fields
    if (!learn2earnId || !walletAddress) {
      console.log('Validation failed: missing required fields', { learn2earnId, walletAddress });
      return NextResponse.json(
        { error: 'Learn2Earn ID and wallet address are required' }, 
        { status: 400 }
      );
    }

    // Check if the Learn2Earn opportunity exists
    console.log('Checking Learn2Earn opportunity:', learn2earnId);
    const docRef = adminDb.collection("learn2earn").doc(learn2earnId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log('Learn2Earn opportunity not found:', learn2earnId);
      return NextResponse.json(
        { error: 'Learn2Earn opportunity not found' }, 
        { status: 404 }
      );
    }

    const learn2earnData = docSnap.data();
    console.log('Learn2Earn data:', learn2earnData);

    // Check if the opportunity is active
    if (learn2earnData!.status !== 'active') {
      return NextResponse.json(
        { error: 'This Learn2Earn opportunity is not currently active' }, 
        { status: 400 }
      );
    }

    // Check if max participants reached
    if (learn2earnData!.maxParticipants && 
        learn2earnData!.totalParticipants >= learn2earnData!.maxParticipants) {
      return NextResponse.json(
        { error: 'Maximum participants limit has been reached' }, 
        { status: 400 }
      );
    }

    // Check if this wallet has already participated
    const participantQuery = adminDb.collection("learn2earnParticipants")
      .where("learn2earnId", "==", learn2earnId)
      .where("walletAddress", "==", walletAddress.toLowerCase()); // Normalize wallet address
    
    const participantSnapshot = await participantQuery.get();

    if (!participantSnapshot.empty) {
      return NextResponse.json(
        { error: 'This wallet has already participated in this opportunity' }, 
        { status: 400 }
      );
    }

    // At this point, everything is valid. We can record the participation
    // and update the totalParticipants count

    // Add participant entry
    const participantRef = adminDb.collection("learn2earnParticipants").doc();
    await participantRef.set({
      learn2earnId,
      walletAddress: walletAddress.toLowerCase(), // Store normalized wallet address
      answers: answers || [],
      timestamp: new Date(),
      status: 'pending', // Initially pending until tokens are transferred
      rewarded: false,
      claimed: false // Add claimed field for tracking
    });

    // Increment the total participants count
    await docRef.update({
      totalParticipants: FieldValue.increment(1)
    });

    return NextResponse.json({
      success: true,
      message: 'Participation recorded successfully',
      participationId: participantRef.id
    });
  } catch (error) {
    console.error('Error processing Learn2Earn participation:', error);
    return NextResponse.json(
      { error: 'Failed to process participation' }, 
      { status: 500 }
    );
  }
}
