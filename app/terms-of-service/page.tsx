"use client";

import React from "react";
import Layout from "../../components/Layout";

export default function TermsOfServicePage() {
  return (    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-900 text-white">
        <div className="container mx-auto p-4 md:p-8 pt-16 md:pt-20">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-orange-400 mb-4">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              These terms govern your use of Gate33's platform and services. 
              Please read them carefully before using our platform.
            </p>
            <div className="mt-6 text-sm text-gray-400">
              <p>Last updated: January 17, 2025 | Version 1.0</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* Agreement to Terms */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">1. Agreement to Terms</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  By accessing or using Gate33 ("Platform," "Service," "we," "us," or "our"), 
                  you agree to be bound by these Terms of Service ("Terms"). If you disagree 
                  with any part of these terms, you may not access the Service.
                </p>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-400 mb-2">Important Notice</h3>
                  <p className="text-sm">
                    Gate33 is a Web3 platform that involves blockchain technology and cryptocurrency transactions. 
                    By using our services, you acknowledge the inherent risks associated with blockchain technology.
                  </p>
                </div>
              </div>
            </section>

            {/* Platform Description */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">2. Platform Description</h2>
              <div className="space-y-4 text-gray-300">
                <p>
                  Gate33 is a decentralized job marketplace that connects Web3 professionals with 
                  companies in the blockchain and cryptocurrency space. Our platform offers:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Job posting and application services</li>
                  <li>Professional profile creation and management</li>
                  <li>Blockchain-based payment processing</li>
                  <li>Cryptocurrency tools and analytics</li>
                  <li>Learn-to-earn opportunities</li>
                  <li>NFT and token-based features</li>
                </ul>
              </div>
            </section>

            {/* Eligibility */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">3. Eligibility</h2>
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                <h3 className="text-xl font-semibold text-white mb-4">To use Gate33, you must:</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-orange-400 mr-2">•</span>
                    <span>Be at least 18 years old</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-400 mr-2">•</span>
                    <span>Have the legal capacity to enter into contracts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-400 mr-2">•</span>
                    <span>Not be prohibited from using our services under applicable law</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-400 mr-2">•</span>
                    <span>Comply with all local, state, national, and international laws</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">4. User Accounts</h2>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Account Registration</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Provide accurate and complete information</li>
                      <li>• Maintain and update your information</li>
                      <li>• Keep your account credentials secure</li>
                      <li>• Not share your account with others</li>
                    </ul>
                  </div>
                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Account Security</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• You are responsible for account security</li>
                      <li>• Report suspicious activity immediately</li>
                      <li>• Use strong, unique passwords</li>
                      <li>• Enable two-factor authentication when available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Platform Use */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">5. Acceptable Use</h2>
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-green-400 mb-2">Permitted Uses</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    <li>Create and maintain professional profiles</li>
                    <li>Search and apply for job opportunities</li>
                    <li>Post legitimate job opportunities (for employers)</li>
                    <li>Use platform tools and features as intended</li>
                    <li>Engage in professional networking and communication</li>
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-red-400 mb-2">Prohibited Activities</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      <li>Posting false or misleading information</li>
                      <li>Harassment or discriminatory behavior</li>
                      <li>Spam or unsolicited communications</li>
                      <li>Attempting to circumvent platform fees</li>
                      <li>Reverse engineering or hacking attempts</li>
                    </ul>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      <li>Posting illegal job opportunities</li>
                      <li>Infringing on intellectual property rights</li>
                      <li>Creating multiple accounts to evade restrictions</li>
                      <li>Using the platform for money laundering</li>
                      <li>Violating applicable laws or regulations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Blockchain and Web3 Features */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">6. Blockchain & Web3 Features</h2>
              <div className="space-y-6">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-400 mb-2">⚠️ Important Blockchain Disclaimer</h3>
                  <p className="text-gray-300 text-sm">
                    Blockchain transactions are irreversible. You are responsible for ensuring 
                    accuracy of all transaction details before confirmation. Gate33 cannot reverse 
                    or modify blockchain transactions once they are confirmed.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Wallet Connection</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• You maintain control of your private keys</li>
                      <li>• Gate33 never accesses your private keys</li>
                      <li>• Ensure wallet security and backup</li>
                      <li>• Verify transaction details before signing</li>
                    </ul>
                  </div>
                  <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                    <h3 className="text-lg font-semibold text-white mb-3">Smart Contracts</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Smart contracts are immutable once deployed</li>
                      <li>• Review contract terms before interaction</li>
                      <li>• Gas fees are required for transactions</li>
                      <li>• Network congestion may affect execution</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Payments and Fees */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">7. Payments & Fees</h2>
              <div className="space-y-6">
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3">Platform Fees</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Gate33 charges fees for certain platform services, including job posting fees and transaction processing fees.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Fees are clearly displayed before payment</li>
                    <li>• Cryptocurrency transaction fees (gas) are additional</li>
                    <li>• Fees are non-refundable unless explicitly stated</li>
                    <li>• Fee structures may change with 30 days notice</li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-400 mb-2">Payment Methods</h3>
                  <p className="text-gray-300 text-sm mb-2">We accept payments via:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                    <li>Cryptocurrency (ETH, USDT, and other supported tokens)</li>
                    <li>Native blockchain tokens on supported networks</li>
                    <li>Traditional payment methods where available</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">8. Intellectual Property</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3">Platform Content</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    All Gate33 platform content, including design, code, logos, and documentation, 
                    is owned by Gate33 and protected by intellectual property laws.
                  </p>
                </div>
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3">User Content</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    You retain ownership of content you post but grant Gate33 a license 
                    to use, display, and distribute it as necessary for platform operation.
                  </p>
                </div>
              </div>
            </section>

            {/* Privacy and Data */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">9. Privacy & Data Protection</h2>
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                <p className="text-gray-300 mb-4">
                  Your privacy is important to us. Our data collection and processing practices 
                  are governed by our Privacy Policy, which complies with GDPR and other applicable 
                  privacy regulations.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white mb-2">Key Privacy Rights:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      <li>Access and portability of your data</li>
                      <li>Correction of inaccurate information</li>
                      <li>Deletion of personal data (subject to limitations)</li>
                      <li>Objection to certain processing activities</li>
                    </ul>
                  </div>
                  <div className="ml-6">
                    <a 
                      href="/privacy-policy" 
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                    >
                      View Privacy Policy
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">10. Disclaimers</h2>
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-red-400 mb-2">Service Availability</h3>
                  <p className="text-gray-300 text-sm">
                    Gate33 is provided "as is" without warranties of any kind. We do not guarantee 
                    uninterrupted access or freedom from errors, bugs, or security vulnerabilities.
                  </p>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-400 mb-2">Investment Disclaimer</h3>
                  <p className="text-gray-300 text-sm">
                    Gate33 does not provide investment advice. Cryptocurrency and blockchain 
                    investments carry significant risk. You should conduct your own research 
                    and consult with financial advisors before making investment decisions.
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-400 mb-2">Third-Party Services</h3>
                  <p className="text-gray-300 text-sm">
                    Gate33 integrates with third-party services including blockchain networks, 
                    wallet providers, and external APIs. We are not responsible for the 
                    availability or functionality of these external services.
                  </p>
                </div>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">11. Limitation of Liability</h2>
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                <p className="text-gray-300 mb-4">
                  To the maximum extent permitted by law, Gate33 and its affiliates shall not be 
                  liable for any indirect, incidental, special, consequential, or punitive damages, 
                  including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-300 mb-4">
                  <li>Loss of profits, data, or business opportunities</li>
                  <li>Damages resulting from blockchain network issues</li>
                  <li>Security breaches or unauthorized access</li>
                  <li>Third-party actions or omissions</li>
                  <li>Investment losses or cryptocurrency volatility</li>
                </ul>
                <p className="text-sm text-yellow-400">
                  In jurisdictions where liability limitations are not permitted, our liability 
                  is limited to the maximum extent allowed by law.
                </p>
              </div>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">12. Indemnification</h2>
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                <p className="text-gray-300 text-sm">
                  You agree to indemnify and hold harmless Gate33, its affiliates, officers, 
                  directors, employees, and agents from and against any claims, liabilities, 
                  damages, losses, and expenses arising from:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-300 mt-3">
                  <li>Your use of the platform</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any rights of another party</li>
                  <li>Your breach of applicable laws or regulations</li>
                </ul>
              </div>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">13. Termination</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3">By You</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    You may terminate your account at any time through your account settings 
                    or by contacting our support team.
                  </p>
                  <p className="text-xs text-gray-400">
                    Note: Blockchain transactions cannot be reversed upon account termination.
                  </p>
                </div>
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3">By Gate33</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    We may terminate or suspend your account for violations of these Terms, 
                    illegal activity, or at our discretion with reasonable notice.
                  </p>
                  <p className="text-xs text-gray-400">
                    Serious violations may result in immediate termination without notice.
                  </p>
                </div>
              </div>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">14. Governing Law & Disputes</h2>
              <div className="space-y-6">
                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3">Jurisdiction</h3>
                  <p className="text-gray-300 text-sm">
                    These Terms are governed by the laws of the European Union and the laws 
                    of the jurisdiction where the user is located, without regard to conflict 
                    of law principles.
                  </p>
                </div>

                <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3">Dispute Resolution</h3>
                  <div className="space-y-3 text-sm text-gray-300">
                    <p><strong>Step 1:</strong> Contact our support team to resolve disputes informally</p>
                    <p><strong>Step 2:</strong> Mediation through a mutually agreed mediator</p>
                    <p><strong>Step 3:</strong> Arbitration or court proceedings as appropriate</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">15. Changes to Terms</h2>
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                <p className="text-gray-300 mb-4">
                  We may update these Terms from time to time. When we make material changes:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
                  <li>We will notify users via email and platform notifications</li>
                  <li>Changes will be posted on this page with a new "last updated" date</li>
                  <li>Continued use after changes constitutes acceptance</li>
                  <li>You may terminate your account if you disagree with changes</li>
                </ul>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-3xl font-bold text-orange-400 mb-6">16. Contact Information</h2>
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-orange-500/20">
                <p className="text-gray-300 mb-4">
                  If you have questions about these Terms of Service, please contact us:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-white mb-2">General Inquiries</h3>
                    <p className="text-gray-300 text-sm">
                      Email: <a href="mailto:info@gate33.net" className="text-orange-400 hover:underline">info@gate33.net</a>
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">Support Team</h3>
                    <p className="text-gray-300 text-sm">
                      Email: <a href="mailto:support@gate33.net" className="text-orange-400 hover:underline">support@gate33.net</a>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="text-center mt-16 py-12 border-t border-orange-500/30">
            <p className="text-gray-400 text-sm">
              By using Gate33, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
