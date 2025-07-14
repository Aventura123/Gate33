import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export async function GET() {
  try {
    // Fetch partners from Firestore
    const querySnapshot = await getDocs(collection(db, 'partners'));
    const partners = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        logoUrl: data.logoUrl || '',
        description: data.description || '',
        website: data.website || '',
        type: data.type || '',
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    // Return the partners as JSON
    return NextResponse.json(partners);
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 });
  }
}
