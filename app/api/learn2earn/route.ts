import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, increment, setDoc } from 'firebase/firestore';

// Handle GET requests to fetch all learn2earn opportunities or a specific one
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    // If ID is provided, fetch a specific learn2earn opportunity
    if (id) {
      const docRef = doc(db, "learn2earn", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return NextResponse.json({ error: 'Learn2Earn opportunity not found' }, { status: 404 });
      }

      const data = {
        id: docSnap.id,
        ...docSnap.data()
      };

      return NextResponse.json(data);
    }

    // Otherwise, fetch all active learn2earn opportunities
    const learnCollection = collection(db, "learn2earn");
    const learnQuery = query(learnCollection, where("status", "==", "active"));
    const querySnapshot = await getDocs(learnQuery);

    const data = querySnapshot.docs.map(doc => ({
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
    const body = await request.json();
    const { learn2earnId, walletAddress, answers } = body;

    // Validate required fields
    if (!learn2earnId || !walletAddress) {
      return NextResponse.json(
        { error: 'Learn2Earn ID and wallet address are required' }, 
        { status: 400 }
      );
    }

    // Check if the Learn2Earn opportunity exists
    const docRef = doc(db, "learn2earn", learn2earnId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Learn2Earn opportunity not found' }, 
        { status: 404 }
      );
    }

    const learn2earnData = docSnap.data();

    // Check if the opportunity is active
    if (learn2earnData.status !== 'active') {
      return NextResponse.json(
        { error: 'This Learn2Earn opportunity is not currently active' }, 
        { status: 400 }
      );
    }

    // Check if max participants reached
    if (learn2earnData.maxParticipants && 
        learn2earnData.totalParticipants >= learn2earnData.maxParticipants) {
      return NextResponse.json(
        { error: 'Maximum participants limit has been reached' }, 
        { status: 400 }
      );
    }

    // Check if this wallet has already participated
    const participantsCollection = collection(db, "learn2earnParticipants");
    const participantQuery = query(
      participantsCollection, 
      where("learn2earnId", "==", learn2earnId),
      where("walletAddress", "==", walletAddress.toLowerCase()) // Normalize wallet address
    );
    const participantSnapshot = await getDocs(participantQuery);

    if (!participantSnapshot.empty) {
      return NextResponse.json(
        { error: 'This wallet has already participated in this opportunity' }, 
        { status: 400 }
      );
    }

    // At this point, everything is valid. We can record the participation
    // and update the totalParticipants count

    // Add participant entry - fixed to use setDoc instead of updateDoc
    const participantRef = doc(collection(db, "learn2earnParticipants"));
    await setDoc(participantRef, {
      learn2earnId,
      walletAddress: walletAddress.toLowerCase(), // Store normalized wallet address
      answers: answers || [],
      timestamp: new Date(),
      status: 'pending', // Initially pending until tokens are transferred
      rewarded: false,
      claimed: false // Add claimed field for tracking
    });

    // Increment the total participants count
    await updateDoc(docRef, {
      totalParticipants: increment(1)
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
