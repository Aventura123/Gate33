"use client";

import React, { useState } from "react";
import Layout from "../../components/Layout";

export default function LegalCompliancePage() {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const tabs = [
    { id: "overview", title: "Overview", icon: "📋" },
    { id: "gdpr", title: "GDPR", icon: "🇪🇺" },
    { id: "cookies", title: "Cookies", icon: "🍪" },
    { id: "data-processing", title: "Data Processing", icon: "⚙️" },
    { id: "user-rights", title: "User Rights", icon: "👥" },
    { id: "security", title: "Security", icon: "🔒" }
  ];
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-900 text-white">
        <div className="container mx-auto p-4 md:p-8 pt-16 md:pt-20">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-orange-400 mb-4">
              Legal Compliance Center
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Comprehensive information about Gate33's compliance with European data protection 
              laws, privacy regulations, and user rights.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white"
                    : "bg-black/40 text-gray-300 hover:bg-orange-500/20"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.title}
              </button>
            ))}
          </div>

          {/* Content Sections */}
          <div className="max-w-6xl mx-auto">
            
            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h2 className="text-2xl font-bold text-orange-400 mb-4">
                      🇪🇺 European Compliance
                    </h2>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>GDPR Compliant</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>Cookie Law Compliance</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>Digital Services Act Ready</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>Data Protection by Design</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h2 className="text-2xl font-bold text-orange-400 mb-4">
                      🌍 Global Standards
                    </h2>
                    <ul className="space-y-2 text-gray-300">
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>CCPA (California)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>LGPD (Brazil)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>PIPEDA (Canada)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>ISO 27001 Principles</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-blue-400 mb-4">Key Compliance Features</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="font-semibold text-white mb-2">Privacy by Design</h3>
                      <p className="text-gray-300 text-sm">
                        Data protection principles built into every feature from the ground up.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">User Control</h3>
                      <p className="text-gray-300 text-sm">
                        Comprehensive privacy controls and consent management.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">Transparency</h3>
                      <p className="text-gray-300 text-sm">
                        Clear information about data processing and user rights.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GDPR */}
            {activeTab === "gdpr" && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-orange-400 mb-4">
                    GDPR Compliance Overview
                  </h2>
                  <p className="text-gray-300 max-w-3xl mx-auto">
                    Gate33 fully complies with the General Data Protection Regulation (GDPR), 
                    ensuring your personal data is processed lawfully, fairly, and transparently.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-xl font-bold text-white mb-4">Legal Bases for Processing</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-orange-400">Contract Performance</h4>
                        <p className="text-gray-300 text-sm">
                          Account management, job matching, payment processing
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-400">Legitimate Interest</h4>
                        <p className="text-gray-300 text-sm">
                          Platform improvement, fraud prevention, analytics
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-400">Consent</h4>
                        <p className="text-gray-300 text-sm">
                          Marketing communications, optional features
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-400">Legal Obligation</h4>
                        <p className="text-gray-300 text-sm">
                          Regulatory compliance, tax requirements
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-xl font-bold text-white mb-4">Data Protection Principles</h3>
                    <div className="space-y-3">
                      {[
                        "Lawfulness, fairness and transparency",
                        "Purpose limitation",
                        "Data minimisation",
                        "Accuracy",
                        "Storage limitation",
                        "Integrity and confidentiality",
                        "Accountability"
                      ].map((principle, index) => (
                        <div key={index} className="flex items-start">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-gray-300 text-sm">{principle}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-orange-400 mb-4">Special Considerations</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-white mb-2">Blockchain Technology</h4>
                      <p className="text-gray-300 text-sm mb-2">
                        Blockchain data is immutable and cannot be deleted. We implement:
                      </p>
                      <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                        <li>Pseudonymization of blockchain data</li>
                        <li>Minimal data storage on-chain</li>
                        <li>Clear user consent for blockchain transactions</li>
                        <li>Alternative deletion methods where possible</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">International Transfers</h4>
                      <p className="text-gray-300 text-sm mb-2">
                        We transfer data outside the EU with appropriate safeguards:
                      </p>
                      <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                        <li>Standard Contractual Clauses (SCCs)</li>
                        <li>Adequacy decisions where applicable</li>
                        <li>Additional security measures</li>
                        <li>Regular transfer impact assessments</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cookies */}
            {activeTab === "cookies" && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-orange-400 mb-4">
                    Cookie Management
                  </h2>
                  <p className="text-gray-300 max-w-3xl mx-auto">
                    We use cookies and similar technologies to enhance your experience. 
                    You have full control over your cookie preferences.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {[
                    {
                      type: "Strictly Necessary",
                      color: "red",
                      canOptOut: false,
                      description: "Essential for website functionality",
                      examples: ["Authentication", "Security", "Load balancing", "Session management"],
                      retention: "Session or up to 1 year"
                    },
                    {
                      type: "Functional",
                      color: "blue",
                      canOptOut: true,
                      description: "Enhanced website functionality",
                      examples: ["Language preferences", "UI customization", "Wallet preferences"],
                      retention: "Up to 2 years"
                    },
                    {
                      type: "Analytics",
                      color: "green",
                      canOptOut: true,
                      description: "Website usage analysis",
                      examples: ["Page views", "User interactions", "Performance metrics"],
                      retention: "Up to 26 months"
                    },
                    {
                      type: "Marketing",
                      color: "purple",
                      canOptOut: true,
                      description: "Personalized advertising",
                      examples: ["Ad tracking", "Conversion tracking", "Behavioral targeting"],
                      retention: "Up to 13 months"
                    }
                  ].map((cookie, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white">{cookie.type}</h3>
                        <div className={`px-2 py-1 rounded text-xs ${
                          cookie.canOptOut 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {cookie.canOptOut ? "Optional" : "Required"}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{cookie.description}</p>
                      <div className="mb-3">
                        <h4 className="font-medium text-orange-400 text-sm mb-2">Examples:</h4>
                        <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                          {cookie.examples.map((example, idx) => (
                            <li key={idx}>{example}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-xs text-yellow-400">
                        <strong>Retention:</strong> {cookie.retention}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-orange-400 mb-4">Manage Your Preferences</h3>
                  <p className="text-gray-300 mb-4">
                    You can update your cookie preferences at any time. Changes will take effect immediately.
                  </p>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('gate33-cookie-consent');
                      window.location.reload();
                    }}
                    className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Update Cookie Preferences
                  </button>
                </div>
              </div>
            )}

            {/* Data Processing */}
            {activeTab === "data-processing" && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-orange-400 mb-4">
                    Data Processing Activities
                  </h2>
                  <p className="text-gray-300 max-w-3xl mx-auto">
                    Detailed information about how we process your personal data, 
                    including purposes, legal bases, and retention periods.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      title: "User Authentication & Account Management",
                      purpose: "Create and manage user accounts, authenticate users",
                      legalBasis: "Contract Performance (GDPR Art. 6(1)(b))",
                      dataTypes: ["Name", "Email", "Password hash", "Phone number"],
                      retention: "Account lifetime + 3 years",
                      recipients: ["Internal staff", "Hosting providers"],
                      security: ["Encryption", "Access controls", "Authentication"]
                    },
                    {
                      title: "Job Matching & Recruitment",
                      purpose: "Match job seekers with employers, facilitate recruitment",
                      legalBasis: "Contract Performance (GDPR Art. 6(1)(b))",
                      dataTypes: ["Professional profile", "Skills", "Experience", "Preferences"],
                      retention: "Account lifetime + 1 year",
                      recipients: ["Matched employers", "Internal staff"],
                      security: ["Consent management", "Visibility controls"]
                    },
                    {
                      title: "Blockchain Transactions",
                      purpose: "Process payments and token transactions",
                      legalBasis: "Contract Performance (GDPR Art. 6(1)(b))",
                      dataTypes: ["Wallet addresses", "Transaction hashes", "Token amounts"],
                      retention: "Permanent (blockchain immutability)",
                      recipients: ["Blockchain networks", "Wallet providers"],
                      security: ["Cryptographic security", "Pseudonymization"]
                    },
                    {
                      title: "Platform Analytics",
                      purpose: "Improve platform performance and user experience",
                      legalBasis: "Legitimate Interest (GDPR Art. 6(1)(f))",
                      dataTypes: ["Usage data", "Performance metrics", "Error logs"],
                      retention: "26 months maximum",
                      recipients: ["Analytics providers", "Internal staff"],
                      security: ["Data anonymization", "Aggregation"]
                    }
                  ].map((activity, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                      <h3 className="text-xl font-bold text-white mb-4">{activity.title}</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-orange-400 text-sm">Purpose</h4>
                            <p className="text-gray-300 text-sm">{activity.purpose}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-orange-400 text-sm">Legal Basis</h4>
                            <p className="text-gray-300 text-sm">{activity.legalBasis}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-orange-400 text-sm">Data Types</h4>
                            <ul className="list-disc list-inside text-gray-300 text-sm">
                              {activity.dataTypes.map((type, idx) => (
                                <li key={idx}>{type}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-orange-400 text-sm">Retention Period</h4>
                            <p className="text-gray-300 text-sm">{activity.retention}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-orange-400 text-sm">Recipients</h4>
                            <ul className="list-disc list-inside text-gray-300 text-sm">
                              {activity.recipients.map((recipient, idx) => (
                                <li key={idx}>{recipient}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-orange-400 text-sm">Security Measures</h4>
                            <ul className="list-disc list-inside text-gray-300 text-sm">
                              {activity.security.map((measure, idx) => (
                                <li key={idx}>{measure}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Rights */}
            {activeTab === "user-rights" && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-orange-400 mb-4">
                    Your Privacy Rights
                  </h2>
                  <p className="text-gray-300 max-w-3xl mx-auto">
                    You have comprehensive rights regarding your personal data. 
                    Learn about your rights and how to exercise them.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    {
                      right: "Right of Access",
                      icon: "👁️",
                      description: "Get a copy of your personal data we hold",
                      howTo: "Request through your account dashboard or email privacy@gate33.net",
                      timeframe: "Within 1 month"
                    },
                    {
                      right: "Right to Rectification",
                      icon: "✏️",
                      description: "Correct inaccurate or incomplete information",
                      howTo: "Update directly in your account settings",
                      timeframe: "Immediate for account data"
                    },
                    {
                      right: "Right to Erasure",
                      icon: "🗑️",
                      description: "Request deletion of your personal data",
                      howTo: "Account deletion option or contact privacy@gate33.net",
                      timeframe: "Within 1 month",
                      note: "Blockchain data cannot be deleted due to technical constraints"
                    },
                    {
                      right: "Right to Data Portability",
                      icon: "📦",
                      description: "Receive your data in machine-readable format",
                      howTo: "Request data export through privacy@gate33.net",
                      timeframe: "Within 1 month"
                    },
                    {
                      right: "Right to Object",
                      icon: "🚫",
                      description: "Object to processing based on legitimate interest",
                      howTo: "Contact privacy@gate33.net with specific objection",
                      timeframe: "Immediate cessation where applicable"
                    },
                    {
                      right: "Right to Restrict Processing",
                      icon: "⏸️",
                      description: "Limit how we process your data",
                      howTo: "Submit restriction request to privacy@gate33.net",
                      timeframe: "Within 1 month"
                    },
                    {
                      right: "Right to Withdraw Consent",
                      icon: "↩️",
                      description: "Withdraw consent for consent-based processing",
                      howTo: "Update preferences in account or contact us",
                      timeframe: "Immediate effect"
                    },
                    {
                      right: "Right to Lodge a Complaint",
                      icon: "📝",
                      description: "File complaint with supervisory authority",
                      howTo: "Contact your local data protection authority",
                      timeframe: "No time limit"
                    }
                  ].map((right, index) => (
                    <div key={index} className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                      <div className="flex items-center mb-3">
                        <span className="text-2xl mr-3">{right.icon}</span>
                        <h3 className="text-lg font-bold text-white">{right.right}</h3>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{right.description}</p>
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-medium text-orange-400 text-xs">How to Exercise:</h4>
                          <p className="text-gray-300 text-xs">{right.howTo}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-orange-400 text-xs">Response Time:</h4>
                          <p className="text-gray-300 text-xs">{right.timeframe}</p>
                        </div>
                        {right.note && (
                          <div>
                            <h4 className="font-medium text-yellow-400 text-xs">Important Note:</h4>
                            <p className="text-yellow-400 text-xs italic">{right.note}</p>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => window.location.href = `mailto:privacy@gate33.net?subject=${encodeURIComponent(right.right + ' Request')}`}
                        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm w-full"
                      >
                        Exercise This Right
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-orange-400 mb-4">
                    Security & Data Protection
                  </h2>
                  <p className="text-gray-300 max-w-3xl mx-auto">
                    We implement comprehensive security measures to protect your personal data 
                    from unauthorized access, alteration, disclosure, or destruction.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-xl font-bold text-white mb-4">
                      🔒 Technical Safeguards
                    </h3>
                    <ul className="space-y-2">
                      {[
                        "End-to-end encryption",
                        "TLS/SSL for data transmission",
                        "Secure authentication",
                        "Regular security audits",
                        "Vulnerability scanning",
                        "Secure coding practices"
                      ].map((measure, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-gray-300 text-sm">{measure}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-xl font-bold text-white mb-4">
                      👥 Organizational Measures
                    </h3>
                    <ul className="space-y-2">
                      {[
                        "Staff security training",
                        "Access controls",
                        "Data handling procedures",
                        "Incident response plan",
                        "Vendor assessments",
                        "Policy reviews"
                      ].map((measure, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-gray-300 text-sm">{measure}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-xl font-bold text-white mb-4">
                      🛡️ Infrastructure Security
                    </h3>
                    <ul className="space-y-2">
                      {[
                        "Secure hosting environment",
                        "Data backup systems",
                        "Disaster recovery",
                        "Network monitoring",
                        "Intrusion detection",
                        "Physical security"
                      ].map((measure, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-400 mr-2">✓</span>
                          <span className="text-gray-300 text-sm">{measure}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-red-400 mb-4">
                    🚨 Data Breach Response
                  </h3>
                  <p className="text-gray-300 mb-4">
                    In the unlikely event of a data breach, we have comprehensive procedures in place:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-white mb-2">Immediate Response</h4>
                      <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                        <li>Immediate containment and assessment</li>
                        <li>Risk evaluation and impact analysis</li>
                        <li>Security team activation</li>
                        <li>Evidence preservation</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Notification Requirements</h4>
                      <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                        <li>Authority notification within 72 hours</li>
                        <li>Individual notification if high risk</li>
                        <li>Clear communication about impact</li>
                        <li>Remediation measures provided</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">
                    🌍 International Transfers
                  </h3>
                  <p className="text-gray-300 mb-4">
                    When we transfer data outside the European Economic Area, we ensure adequate protection:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-white mb-2">Transfer Safeguards</h4>
                      <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                        <li>Standard Contractual Clauses (SCCs)</li>
                        <li>Adequacy decisions</li>
                        <li>Additional security measures</li>
                        <li>Regular transfer assessments</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Key Transfer Partners</h4>
                      <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                        <li>Google (Firebase, Analytics) - US</li>
                        <li>Vercel (Hosting) - US</li>
                        <li>Blockchain networks - Global</li>
                        <li>All with appropriate safeguards</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Section */}
          <div className="mt-16 text-center">
            <div className="bg-black/40 rounded-xl p-8 backdrop-blur-sm border border-orange-500/20 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-orange-400 mb-4">
                Need Help with Compliance?
              </h2>
              <p className="text-gray-300 mb-6">
                Our privacy team is here to help with any compliance questions or requests.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <button 
                  onClick={() => window.location.href = 'mailto:privacy@gate33.net'}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Privacy Team
                </button>
                <button 
                  onClick={() => window.location.href = 'mailto:dpo@gate33.net'}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Data Protection Officer
                </button>
                <button 
                  onClick={() => window.location.href = 'mailto:legal@gate33.net'}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Legal Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
