import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    lastUpdated: "2025-01-17",
    version: "1.0",
    companyInfo: {
      name: "Gate33 Platform",
      address: "Online Platform - European Operations",
      email: "privacy@gate33.net",
      phone: "+31-20-xxx-xxxx"
    },
    dataController: {
      name: "Gate33 Data Protection Officer",
      email: "dpo@gate33.net"
    },
    legalBasis: {
      processing: "Article 6(1)(b) GDPR - Contract performance",
      specialCategories: "Article 9(2)(a) GDPR - Explicit consent where applicable"
    },
    dataProcessing: {
      personalData: [
        {
          category: "Identity Data",
          types: ["First name", "Last name", "Email address", "Phone number"],
          purpose: "Account creation and management",
          legalBasis: "Contract performance",
          retention: "Account lifetime + 3 years"
        },
        {
          category: "Professional Data", 
          types: ["Skills", "Experience", "CV/Resume", "Portfolio links"],
          purpose: "Job matching and profile display",
          legalBasis: "Contract performance and consent",
          retention: "Account lifetime + 1 year"
        },
        {
          category: "Technical Data",
          types: ["IP address", "Browser type", "Device information", "Cookies"],
          purpose: "Platform functionality and security",
          legalBasis: "Legitimate interest",
          retention: "2 years maximum"
        },
        {
          category: "Blockchain Data",
          types: ["Wallet addresses", "Transaction hashes", "Token balances"],
          purpose: "Web3 functionality and payments",
          legalBasis: "Contract performance",
          retention: "Permanent (blockchain immutability)"
        },
        {
          category: "Communication Data",
          types: ["Messages", "Support tickets", "Email communications"],
          purpose: "Customer support and platform communication",
          legalBasis: "Contract performance and legitimate interest",
          retention: "3 years after last interaction"
        }
      ],
      purposes: [
        "Account registration and authentication",
        "Job matching and recruitment services", 
        "Payment processing via blockchain",
        "Customer support and communication",
        "Platform improvement and analytics",
        "Legal compliance and dispute resolution",
        "Marketing communications (with consent)"
      ],
      sharing: [
        {
          recipients: "Employers/Companies",
          data: "Public profile information (with consent)",
          purpose: "Job matching and recruitment"
        },
        {
          recipients: "Blockchain Networks",
          data: "Transaction data and wallet addresses",
          purpose: "Payment processing and smart contract execution"
        },
        {
          recipients: "Service Providers",
          data: "Technical and communication data",
          purpose: "Platform hosting, analytics, and support services"
        }
      ]
    },
    rights: {
      access: {
        description: "Right to obtain confirmation and copy of your personal data",
        howToExercise: "Email privacy@gate33.net or use account dashboard",
        timeframe: "Within 1 month of request"
      },
      rectification: {
        description: "Right to correct inaccurate or incomplete personal data",
        howToExercise: "Update through account settings or email privacy@gate33.net",
        timeframe: "Immediate for account data, within 1 month for other data"
      },
      erasure: {
        description: "Right to deletion of personal data under certain conditions",
        howToExercise: "Account deletion through settings or email privacy@gate33.net",
        limitations: "Blockchain data cannot be deleted due to technical impossibility",
        timeframe: "Within 1 month of request"
      },
      portability: {
        description: "Right to receive your data in machine-readable format",
        howToExercise: "Request through privacy@gate33.net",
        timeframe: "Within 1 month of request"
      },
      objection: {
        description: "Right to object to processing based on legitimate interest",
        howToExercise: "Email privacy@gate33.net with specific objection",
        timeframe: "Immediate cessation where applicable"
      },
      restriction: {
        description: "Right to restrict processing under certain circumstances",
        howToExercise: "Email privacy@gate33.net with restriction request",
        timeframe: "Within 1 month of request"
      },
      withdraw: {
        description: "Right to withdraw consent for consent-based processing",
        howToExercise: "Account settings or email privacy@gate33.net",
        timeframe: "Immediate effect, future processing only"
      }
    },
    security: {
      measures: [
        "End-to-end encryption for sensitive communications",
        "Secure authentication with multi-factor options",
        "Regular security audits and vulnerability assessments",
        "Access controls and staff training",
        "Incident response procedures",
        "Data backup and recovery systems"
      ],
      breachNotification: {
        authority: "Within 72 hours to relevant supervisory authority",
        individuals: "Without undue delay if high risk to rights and freedoms"
      }
    },
    cookies: {
      necessary: {
        purpose: "Essential website functionality",
        types: ["Authentication", "Security", "Load balancing"],
        retention: "Session or up to 1 year"
      },
      functional: {
        purpose: "Enhanced website functionality",
        types: ["Language preferences", "UI customization"],
        retention: "Up to 2 years"
      },
      analytics: {
        purpose: "Website usage analysis",
        types: ["Page views", "User interactions", "Performance metrics"],
        retention: "Up to 26 months"
      },
      marketing: {
        purpose: "Personalized advertising",
        types: ["Ad tracking", "Conversion tracking"],
        retention: "Up to 13 months"
      }
    },
    transfers: {
      international: {
        enabled: true,
        safeguards: [
          "Standard Contractual Clauses (SCCs)",
          "Adequacy decisions where applicable",
          "Additional safeguards for high-risk transfers"
        ],
        countries: ["United States", "Various cloud service locations"]
      }
    },
    supervisoryAuthority: {
      name: "Relevant EU Data Protection Authority based on user location",
      website: "https://edpb.europa.eu/about-edpb/board/members_en",
      complaint: "Right to lodge complaint if unsatisfied with our response"
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, details } = body;

    // Validate request
    if (!type || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Log the privacy request
    // 2. Send confirmation email
    // 3. Queue for processing
    // 4. Update request tracking system

    console.log(`Privacy request received: ${type} for ${email}`);
    
    return NextResponse.json({
      success: true,
      message: "Privacy request received and will be processed within 30 days",
      requestId: `PR-${Date.now()}`,
      expectedResponse: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error("Privacy request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
