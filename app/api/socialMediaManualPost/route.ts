import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import axios from 'axios';

// Function to send to the Cloud Function endpoint
async function callCloudFunction(jobId: string) {
  try {
    // URL of the manualSocialMediaPromotion function in Firebase Cloud Functions
    // Updated URL after Cloud Function implementation
    const cloudFunctionUrl = process.env.FIREBASE_FUNCTION_URL || 'https://manualsocialmediapromotion-cvmzclfema-uc.a.run.app';
    
    // Adding headers for CORS (DO NOT include 'Origin' in server-to-server calls)
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const response = await axios.post(cloudFunctionUrl, { jobId }, { headers });
    return response.data;
  } catch (error) {
    console.error('Error calling Cloud Function:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { jobId } = data;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // Check if the job exists before sending
    const jobRef = doc(db, 'jobs', jobId);
    const jobDoc = await getDoc(jobRef);

    if (!jobDoc.exists()) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Call the Cloud Function
    const result = await callCloudFunction(jobId);

    // Update the promotion counter in the job (also done in the Cloud Function, but we ensure it here)
    const jobData = jobDoc.data();
    await updateDoc(jobRef, {
      socialMediaPromotionCount: (jobData?.socialMediaPromotionCount || 0) + 1,
      socialMediaPromotionLastSent: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing job send to social media:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing the request' },
      { status: 500 }
    );
  }
}
