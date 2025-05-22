import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Unsubscribe endpoint for job alert emails
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid email.' }, { status: 400 });
    }
    // Find the subscriber by email
    const q = query(collection(db, 'jobAlertSubscribers'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return NextResponse.json({ success: false, message: 'Email not found.' }, { status: 404 });
    }
    // Mark all matching docs as inactive
    for (const docSnap of snapshot.docs) {
      await updateDoc(doc(db, 'jobAlertSubscribers', docSnap.id), { active: false });
    }
    return NextResponse.json({ success: true, message: 'You have been unsubscribed.' });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error.' }, { status: 500 });
  }
}

// Optionally, support GET for link-based unsubscribe
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ success: false, message: 'Missing email.' }, { status: 400 });
  }
  try {
    const q = query(collection(db, 'jobAlertSubscribers'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return NextResponse.json({ success: false, message: 'Email not found.' }, { status: 404 });
    }
    for (const docSnap of snapshot.docs) {
      await updateDoc(doc(db, 'jobAlertSubscribers', docSnap.id), { active: false });
    }
    // Optionally, render a simple HTML confirmation
    return new NextResponse('<html><body><h2>You have been unsubscribed from job alerts.</h2></body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error.' }, { status: 500 });
  }
}
