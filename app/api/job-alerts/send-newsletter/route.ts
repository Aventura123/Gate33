import { NextRequest, NextResponse } from 'next/server';
import { sendJobAlertsNewsletter } from '../sendJobAlertsNewsletter';

export async function POST(req: NextRequest) {
  try {
    const { intro, jobs, partners } = await req.json(); // Parse data from request body
    await sendJobAlertsNewsletter(intro, jobs, partners); // Pass all data to the logic
    return NextResponse.json({ success: true, message: 'Newsletter sent.' });
  } catch (err) {
    console.error('Newsletter send error:', err); // Added error logging
    return NextResponse.json({ success: false, message: 'Failed to send newsletter.', error: String(err) }, { status: 500 });
  }
}
