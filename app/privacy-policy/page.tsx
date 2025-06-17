"use client";

import React, { useState } from "react";
import Layout from "../../components/Layout";

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState<string>("");

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(sectionId);
    }
  };

  return (    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-900 text-white">
        <div className="container mx-auto p-4 md:p-8 pt-16 md:pt-20">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-orange-400 mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Your privacy is fundamental to our mission. This policy explains how we collect, 
              use, and protect your personal data in compliance with GDPR and other privacy regulations.
            </p>
            <div className="mt-6 text-sm text-gray-400">
              <p>Last updated: January 17, 2025 | Version 1.0</p>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="bg-black/40 rounded-xl p-6 mb-8 backdrop-blur-sm border border-orange-500/20">
            <h2 className="text-xl font-semibold text-orange-400 mb-4">Quick Navigation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: "overview", title: "Overview" },
                { id: "data-collection", title: "Data Collection" },
                { id: "data-use", title: "Data Use" },
                { id: "data-sharing", title: "Data Sharing" },
                { id: "your-rights", title: "Your Rights" },
                { id: "cookies", title: "Cookies" },
                { id: "security", title: "Security" },
                { id: "contact", title: "Contact" }
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="text-left p-2 rounded-lg hover:bg-orange-500/20 transition-colors text-sm"
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* Overview */}
            <section id="overview" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">1. Overview</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  Gate33 is a decentralized Web3 job marketplace that connects talented professionals 
                  with innovative companies in the blockchain and cryptocurrency space. This Privacy 
                  Policy describes how we collect, use, share, and protect your personal information 
                  when you use our platform.
                </p>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-400 mb-2">Key Principles</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>We collect only the data necessary to provide our services</li>
                    <li>We never sell your personal data to third parties</li>
                    <li>You have full control over your data and privacy settings</li>
                    <li>We use blockchain technology responsibly and transparently</li>
                    <li>We comply with GDPR, CCPA, and other applicable privacy laws</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Data Controller Information */}
            <section id="data-controller" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">2. Data Controller</h2>
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-white mb-2">Platform Information</h3>
                    <p className="text-gray-300 text-sm mb-1">Gate33 Platform</p>
                    <p className="text-gray-300 text-sm mb-1">European Operations</p>
                    <p className="text-gray-300 text-sm">
                      Email: <a href="mailto:privacy@gate33.net" className="text-orange-400 hover:underline">privacy@gate33.net</a>
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Data Protection Officer</h3>
                    <p className="text-gray-300 text-sm mb-1">Gate33 DPO</p>
                    <p className="text-gray-300 text-sm">
                      Email: <a href="mailto:dpo@gate33.net" className="text-orange-400 hover:underline">dpo@gate33.net</a>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Data Collection */}
            <section id="data-collection" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">3. Data We Collect</h2>
              <div className="space-y-6">
                {[
                  {
                    title: "Identity Data",
                    items: ["First name, last name", "Email address", "Phone number", "Profile photo"],
                    purpose: "Account creation and user identification"
                  },
                  {
                    title: "Professional Data",
                    items: ["Skills and experience", "CV/Resume", "Portfolio links", "Job preferences"],
                    purpose: "Job matching and profile display to potential employers"
                  },
                  {
                    title: "Blockchain Data",
                    items: ["Wallet addresses", "Transaction hashes", "Token balances", "Smart contract interactions"],
                    purpose: "Web3 functionality, payments, and tokenized rewards"
                  },
                  {
                    title: "Technical Data",
                    items: ["IP address", "Browser information", "Device details", "Usage analytics"],
                    purpose: "Platform functionality, security, and improvement"
                  },
                  {
                    title: "Communication Data",
                    items: ["Messages between users", "Support tickets", "Email communications"],
                    purpose: "Platform communication and customer support"
                  }
                ].map((category, index) => (
                  <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-xl font-semibold text-white mb-3">{category.title}</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-orange-400 mb-2">Data Types:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                          {category.items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-orange-400 mb-2">Purpose:</h4>
                        <p className="text-sm text-gray-300">{category.purpose}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Use */}
            <section id="data-use" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">4. How We Use Your Data</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Core Platform Services",
                    items: [
                      "Account registration and authentication",
                      "Job matching and recruitment",
                      "Payment processing via blockchain",
                      "Profile management and display"
                    ]
                  },
                  {
                    title: "Communication & Support",
                    items: [
                      "Customer support and assistance",
                      "Platform updates and notifications",
                      "Security alerts and important notices",
                      "Community features and messaging"
                    ]
                  },
                  {
                    title: "Platform Improvement",
                    items: [
                      "Usage analytics and optimization",
                      "New feature development",
                      "Security monitoring and enhancement",
                      "Performance optimization"
                    ]
                  },
                  {
                    title: "Legal & Compliance",
                    items: [
                      "Regulatory compliance",
                      "Dispute resolution",
                      "Fraud prevention",
                      "Legal obligations fulfillment"
                    ]
                  }
                ].map((category, index) => (
                  <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-xl font-semibold text-white mb-4">{category.title}</h3>
                    <ul className="space-y-2">
                      {category.items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-orange-400 mr-2">•</span>
                          <span className="text-gray-300 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Sharing */}
            <section id="data-sharing" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">5. Data Sharing</h2>
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-green-400 mb-2">We Never Sell Your Data</h3>
                  <p className="text-gray-300 text-sm">
                    Gate33 does not sell, rent, or trade your personal information to third parties for marketing purposes.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">When We Share Data:</h3>
                  
                  {[
                    {
                      title: "With Employers (Your Choice)",
                      description: "Your profile information is shared with potential employers only with your explicit consent through the job application process.",
                      icon: "👥"
                    },
                    {
                      title: "Blockchain Networks",
                      description: "Transaction data is recorded on public blockchains as part of our Web3 functionality. This data is pseudonymous but publicly accessible.",
                      icon: "⛓️"
                    },
                    {
                      title: "Service Providers",
                      description: "We share limited data with trusted service providers for hosting, analytics, and support services under strict data processing agreements.",
                      icon: "🔧"
                    },
                    {
                      title: "Legal Requirements",
                      description: "We may disclose data when required by law, court order, or to protect our rights and the safety of our users.",
                      icon: "⚖️"
                    }
                  ].map((item, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                      <div className="flex items-start space-x-4">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <h4 className="font-semibold text-white mb-2">{item.title}</h4>
                          <p className="text-gray-300 text-sm">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Your Rights */}
            <section id="your-rights" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">6. Your Privacy Rights</h2>
              <div className="space-y-4">
                {[
                  {
                    right: "Access",
                    description: "Get a copy of your personal data we hold",
                    action: "Request through your account dashboard or email us"
                  },
                  {
                    right: "Rectification",
                    description: "Correct inaccurate or incomplete information",
                    action: "Update directly in your account settings"
                  },
                  {
                    right: "Erasure (Right to be Forgotten)",
                    description: "Request deletion of your personal data",
                    action: "Account deletion option or contact us",
                    note: "Note: Blockchain data cannot be deleted due to technical constraints"
                  },
                  {
                    right: "Data Portability",
                    description: "Receive your data in a machine-readable format",
                    action: "Request data export through privacy@gate33.net"
                  },
                  {
                    right: "Object to Processing",
                    description: "Object to processing based on legitimate interest",
                    action: "Contact us with your specific objection"
                  },
                  {
                    right: "Restrict Processing",
                    description: "Limit how we process your data",
                    action: "Submit a restriction request to privacy@gate33.net"
                  },
                  {
                    right: "Withdraw Consent",
                    description: "Withdraw consent for consent-based processing",
                    action: "Update preferences in your account or contact us"
                  }
                ].map((right, index) => (
                  <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">{right.right}</h3>
                        <p className="text-gray-300 text-sm mb-2">{right.description}</p>
                        <p className="text-orange-400 text-sm">{right.action}</p>
                        {right.note && (
                          <p className="text-yellow-400 text-xs mt-2 italic">{right.note}</p>
                        )}
                      </div>
                      <div className="mt-4 md:mt-0 md:ml-4">
                        <button 
                          onClick={() => window.location.href = 'mailto:privacy@gate33.net?subject=Privacy%20Right%20Request'}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                        >
                          Exercise Right
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Cookies */}
            <section id="cookies" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">7. Cookies & Tracking</h2>
              <div className="space-y-6">
                <p className="text-gray-300">
                  We use cookies and similar technologies to enhance your experience and understand how you use our platform.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    {
                      type: "Strictly Necessary",
                      description: "Essential for website functionality",
                      examples: ["Authentication", "Security", "Load balancing"],
                      control: "Cannot be disabled"
                    },
                    {
                      type: "Functional",
                      description: "Enhanced website functionality",
                      examples: ["Language preferences", "UI customization"],
                      control: "Can be disabled in cookie settings"
                    },
                    {
                      type: "Analytics",
                      description: "Website usage analysis",
                      examples: ["Page views", "User interactions", "Performance metrics"],
                      control: "Can be disabled in cookie settings"
                    },
                    {
                      type: "Marketing",
                      description: "Personalized advertising",
                      examples: ["Ad tracking", "Conversion tracking"],
                      control: "Can be disabled in cookie settings"
                    }
                  ].map((cookie, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                      <h3 className="text-lg font-semibold text-white mb-3">{cookie.type}</h3>
                      <p className="text-gray-300 text-sm mb-3">{cookie.description}</p>
                      <div className="mb-3">
                        <h4 className="font-medium text-orange-400 text-sm mb-1">Examples:</h4>
                        <ul className="list-disc list-inside text-xs text-gray-400">
                          {cookie.examples.map((example, idx) => (
                            <li key={idx}>{example}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-xs text-yellow-400">{cookie.control}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-400 mb-2">Manage Your Cookie Preferences</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    You can update your cookie preferences at any time using our cookie management tool.
                  </p>
                  <button 
                    onClick={() => localStorage.removeItem('gate33-cookie-consent')}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                  >
                    Update Cookie Preferences
                  </button>
                </div>
              </div>
            </section>

            {/* Security */}
            <section id="security" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">8. Data Security</h2>
              <div className="space-y-6">
                <p className="text-gray-300">
                  We implement comprehensive security measures to protect your personal data from unauthorized access, 
                  alteration, disclosure, or destruction.
                </p>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      title: "Technical Safeguards",
                      items: [
                        "End-to-end encryption",
                        "Secure authentication",
                        "Regular security audits",
                        "Vulnerability assessments"
                      ]
                    },
                    {
                      title: "Organizational Measures",
                      items: [
                        "Staff security training",
                        "Access controls",
                        "Data handling procedures",
                        "Incident response plan"
                      ]
                    },
                    {
                      title: "Infrastructure Security",
                      items: [
                        "Secure hosting environment",
                        "Data backup systems",
                        "Disaster recovery",
                        "Network monitoring"
                      ]
                    }
                  ].map((category, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                      <h3 className="text-lg font-semibold text-white mb-4">{category.title}</h3>
                      <ul className="space-y-2">
                        {category.items.map((item, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-green-400 mr-2">✓</span>
                            <span className="text-gray-300 text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-red-400 mb-2">Data Breach Notification</h3>
                  <p className="text-gray-300 text-sm">
                    In the unlikely event of a data breach, we will notify relevant authorities within 72 hours 
                    and affected users without undue delay if there is a high risk to your rights and freedoms.
                  </p>
                </div>
              </div>
            </section>

            {/* International Transfers */}
            <section id="transfers" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">9. International Data Transfers</h2>
              <div className="space-y-6">
                <p className="text-gray-300">
                  As a global platform, we may transfer your data to countries outside the European Economic Area (EEA). 
                  We ensure appropriate safeguards are in place for all international transfers.
                </p>
                
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Transfer Safeguards</h3>
                  <ul className="space-y-2">
                    {[
                      "Standard Contractual Clauses (SCCs) approved by the European Commission",
                      "Adequacy decisions for countries with equivalent data protection laws",
                      "Additional safeguards for high-risk transfers",
                      "Regular assessment of transfer mechanisms"
                    ].map((safeguard, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-orange-400 mr-2">•</span>
                        <span className="text-gray-300 text-sm">{safeguard}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section id="contact" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">10. Contact Us</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Privacy Inquiries</h3>
                  <div className="space-y-2 text-gray-300 text-sm">
                    <p>For any privacy-related questions or requests:</p>
                    <p>
                      Email: <a href="mailto:privacy@gate33.net" className="text-orange-400 hover:underline">privacy@gate33.net</a>
                    </p>
                    <p>Response time: Within 30 days</p>
                  </div>
                </div>
                
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Data Protection Officer</h3>
                  <div className="space-y-2 text-gray-300 text-sm">
                    <p>For data protection concerns:</p>
                    <p>
                      Email: <a href="mailto:dpo@gate33.net" className="text-orange-400 hover:underline">dpo@gate33.net</a>
                    </p>
                    <p>Response time: Within 72 hours</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-400 mb-2">Supervisory Authority</h3>
                <p className="text-gray-300 text-sm">
                  If you are not satisfied with our response to your privacy concerns, you have the right to 
                  lodge a complaint with your local data protection authority. You can find your relevant 
                  authority at{" "}
                  <a 
                    href="https://edpb.europa.eu/about-edpb/board/members_en" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    https://edpb.europa.eu/about-edpb/board/members_en
                  </a>
                </p>
              </div>
            </section>

            {/* Updates */}
            <section id="updates" className="scroll-mt-8">
              <h2 className="text-3xl font-bold text-orange-400 mb-6">11. Policy Updates</h2>
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                <p className="text-gray-300 mb-4">
                  We may update this Privacy Policy from time to time to reflect changes in our practices, 
                  technology, legal requirements, or other factors.
                </p>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>• We will notify users of material changes via email or platform notification</p>
                  <p>• Updated policies will be posted on this page with a new "last updated" date</p>
                  <p>• Continued use of the platform after updates constitutes acceptance</p>
                  <p>• Previous versions will be archived and available upon request</p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer CTA */}
          <div className="text-center mt-16 py-12 border-t border-orange-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">
              Questions About Your Privacy?
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              We're committed to transparency and protecting your privacy rights. 
              Don't hesitate to reach out if you have any questions or concerns.
            </p>
            <button 
              onClick={() => window.location.href = 'mailto:privacy@gate33.net?subject=Privacy%20Policy%20Question'}
              className="px-8 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors font-semibold"
            >
              Contact Privacy Team
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
