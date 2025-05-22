import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Unsubscribe endpoint para seekers e companies
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid email.' }, { status: 400 });
    }
    let unsubscribed = false;
    // jobAlertSubscribers
    const q1 = query(collection(db, 'jobAlertSubscribers'), where('email', '==', email));
    const snap1 = await getDocs(q1);
    for (const docSnap of snap1.docs) {
      await updateDoc(doc(db, 'jobAlertSubscribers', docSnap.id), { active: false });
      unsubscribed = true;
    }
    // seekers
    const q2 = query(collection(db, 'seekers'), where('email', '==', email));
    const snap2 = await getDocs(q2);
    for (const docSnap of snap2.docs) {
      await updateDoc(doc(db, 'seekers', docSnap.id), { 'notificationPreferences.marketing': false });
      unsubscribed = true;
    }
    // companies
    const q3 = query(collection(db, 'companies'), where('email', '==', email));
    const snap3 = await getDocs(q3);
    for (const docSnap of snap3.docs) {
      await updateDoc(doc(db, 'companies', docSnap.id), { 'notificationPreferences.marketing': false });
      unsubscribed = true;
    }
    if (unsubscribed) {
      return NextResponse.json({ success: true, message: 'You have been unsubscribed.' });
    } else {
      return NextResponse.json({ success: false, message: 'Email not found.' }, { status: 404 });
    }
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
    let unsubscribed = false;
    // jobAlertSubscribers
    const q1 = query(collection(db, 'jobAlertSubscribers'), where('email', '==', email));
    const snap1 = await getDocs(q1);
    for (const docSnap of snap1.docs) {
      await updateDoc(doc(db, 'jobAlertSubscribers', docSnap.id), { active: false });
      unsubscribed = true;
    }
    // seekers
    const q2 = query(collection(db, 'seekers'), where('email', '==', email));
    const snap2 = await getDocs(q2);
    for (const docSnap of snap2.docs) {
      await updateDoc(doc(db, 'seekers', docSnap.id), { 'notificationPreferences.marketing': false });
      unsubscribed = true;
    }
    // companies
    const q3 = query(collection(db, 'companies'), where('email', '==', email));
    const snap3 = await getDocs(q3);
    for (const docSnap of snap3.docs) {
      await updateDoc(doc(db, 'companies', docSnap.id), { 'notificationPreferences.marketing': false });
      unsubscribed = true;
    }
    if (unsubscribed) {
      return new NextResponse('<html><body><h2>You have been unsubscribed from job alerts.</h2></body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      return NextResponse.json({ success: false, message: 'Email not found.' }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error.' }, { status: 500 });
  }
}
