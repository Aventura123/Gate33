import { NextRequest, NextResponse } from 'next/server';
import { sendJobAlertsNewsletter } from '../sendJobAlertsNewsletter';

export async function POST(req: NextRequest) {
  try {
    const { intro } = await req.json(); // Parse intro from request body
    await sendJobAlertsNewsletter(intro); // Pass intro to the logic
    return NextResponse.json({ success: true, message: 'Newsletter sent.' });
  } catch (err) {
    console.error('Newsletter send error:', err); // Added error logging
    return NextResponse.json({ success: false, message: 'Failed to send newsletter.', error: String(err) }, { status: 500 });
  }
}
