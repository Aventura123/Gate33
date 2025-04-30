import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';

// This is a simple mock payment API endpoint
// In a real implementation, you would integrate with a payment provider like Stripe

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { planId, jobData, companyId } = data;

    if (!planId || !jobData || !companyId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a mock payment ID
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    try {
      // Get the plan duration from the request data
      const planDuration = data.planDuration || 30; // Default to 30 days if not provided
      
      // Calculate expiration date based on plan duration
      const now = new Date();
      const expiryDate = new Date(now.getTime() + planDuration * 24 * 60 * 60 * 1000);
      
      // Create a new job document with payment info included
      const jobCollection = collection(db, 'jobs');
      const jobRef = await addDoc(jobCollection, {
        ...jobData,
        companyId,
        createdAt: now,
        expiresAt: expiryDate,
        paymentId,
        paymentStatus: 'completed',
        pricingPlanId: planId,
        paymentDate: now
      });

      // Return success response with payment details and job ID
      return NextResponse.json({
        success: true,
        paymentId,
        jobId: jobRef.id,
        status: 'completed',
        message: 'Payment processed successfully and job posted'
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to save job data after payment' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { success: false, message: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

// For payment verification
export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would verify payment status with your payment provider
    // For this mock implementation, we'll assume all payments with an ID are successful

    return NextResponse.json({
      success: true,
      status: 'completed',
      message: 'Payment verified'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
