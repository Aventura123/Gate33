import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, requestType, details } = body;

    // Validate input
    if (!email || !requestType) {
      return NextResponse.json(
        { error: 'Email and request type are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate request ID
    const requestId = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Get client IP address from headers
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') || 
                     'unknown';

    // Log the privacy request (in production, this would go to a proper logging system)
    console.log('Privacy request received:', {
      requestId,
      email,
      requestType,
      details,
      timestamp: new Date().toISOString(),
      ip: clientIP
    });

    // In a real implementation, you would:
    // 1. Store the request in a database
    // 2. Send confirmation email to the user
    // 3. Queue the request for processing
    // 4. Notify the privacy team
    // 5. Set up automated reminders for response deadlines

    // Calculate expected response date (30 days from now)
    const expectedResponse = new Date();
    expectedResponse.setDate(expectedResponse.getDate() + 30);

    return NextResponse.json({
      success: true,
      requestId,
      message: `Your ${requestType} request has been received and will be processed within 30 days`,
      expectedResponseDate: expectedResponse.toISOString(),
      nextSteps: [
        'You will receive a confirmation email within 24 hours',
        'Our privacy team will verify your identity',
        'We will process your request and respond within 30 days',
        'You can contact privacy@gate33.net for updates'
      ],
      contacts: {
        privacy: 'privacy@gate33.net',
        dpo: 'dpo@gate33.net',
        support: 'support@gate33.net'
      }
    });

  } catch (error) {
    console.error('Privacy request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return information about available privacy request types
  return NextResponse.json({
    availableRequests: [
      {
        type: 'access',
        title: 'Data Access Request',
        description: 'Request a copy of all personal data we hold about you',
        timeframe: '1 month',
        format: 'Digital copy (PDF/JSON)'
      },
      {
        type: 'rectification',
        title: 'Data Correction Request',
        description: 'Request correction of inaccurate or incomplete personal data',
        timeframe: '1 month',
        format: 'Direct account update or manual correction'
      },
      {
        type: 'erasure',
        title: 'Data Deletion Request',
        description: 'Request deletion of your personal data (Right to be Forgotten)',
        timeframe: '1 month',
        format: 'Account deletion or selective data removal',
        limitations: 'Blockchain data cannot be deleted due to technical immutability'
      },
      {
        type: 'portability',
        title: 'Data Portability Request',
        description: 'Request your data in a machine-readable format to transfer to another service',
        timeframe: '1 month',
        format: 'JSON or CSV file'
      },
      {
        type: 'objection',
        title: 'Processing Objection',
        description: 'Object to processing of your data based on legitimate interest',
        timeframe: 'Immediate cessation where applicable',
        format: 'Processing restriction or cessation'
      },
      {
        type: 'restriction',
        title: 'Processing Restriction Request',
        description: 'Request limitation of how we process your personal data',
        timeframe: '1 month',
        format: 'Processing flags and restrictions applied'
      },
      {
        type: 'consent-withdrawal',
        title: 'Consent Withdrawal',
        description: 'Withdraw consent for consent-based data processing',
        timeframe: 'Immediate effect',
        format: 'Preference updates and processing cessation'
      }
    ],
    requirements: {
      identityVerification: 'Photo ID and account verification required for security',
      responseTime: 'Maximum 1 month, typically within 2 weeks',
      noFee: 'Privacy requests are processed free of charge',
      updates: 'Request status updates available via email or privacy@gate33.net'
    },
    contacts: {
      privacy: {
        email: 'privacy@gate33.net',
        purpose: 'General privacy requests and questions'
      },
      dpo: {
        email: 'dpo@gate33.net',
        purpose: 'Data Protection Officer for complex privacy issues'
      },
      legal: {
        email: 'legal@gate33.net',
        purpose: 'Legal compliance and regulatory questions'
      }
    }
  });
}
