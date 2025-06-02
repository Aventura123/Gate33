'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ContactForm from '../components/ContactForm';
import DevNoticePopup from '../components/DevNoticePopup';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item border border-orange-500 rounded-lg overflow-hidden mb-4 ${isOpen ? 'active' : ''}`}>
      <div
        className="faq-question p-4 bg-black/5 text-gray-300 font-medium cursor-pointer flex justify-between items-center hover:bg-black/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        {question}
        <span className="text-orange-500 text-xl">{isOpen ? '-' : '+'}</span>
      </div>
      <div
        className={`faq-answer max-h-0 overflow-hidden transition-all duration-300 ${
          isOpen ? 'p-4 max-h-[500px]' : ''
        }`}
      >
        <p className="text-gray-300 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

function Home() {
  const [showDevNotice, setShowDevNotice] = useState(true);

  return (
    <>
      {showDevNotice && (
        <DevNoticePopup onClose={() => setShowDevNotice(false)} />
      )}
      <main className="min-h-screen bg-gradient-to-b from-black to-orange-500 to-black text-white relative">
        <section
          id="home"
          className="hero pt-24 pb-20 text-center px-4 bg-gradient-to-b from-black to-orange-800/50 to-black bg-no-repeat bg-center bg-cover relative"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-black/70 z-10"></div>
          <div className="hero-content relative z-20">
            <Image
              src="/logo2.png"
              alt="Gate33 Logo"
              width={300}
              height={300}
              className="mx-auto mb-4"
              priority
              style={{ width: 'auto', height: 'auto' }}
            />
            <h2 className="text-4xl md:text-6xl font-bold text-orange-500 text-shadow-glow mb-6 animate-glow">
              Connecting Talent with Trusted Opportunities
            </h2>
            <p className="text-gray-200 max-w-4xl mx-auto mb-8 text-lg leading-relaxed">
              Gate33 is a secure platform that connects job seekers with quality employment opportunities from verified 
              and trustworthy companies. Our mission is to create a safe environment where trust between companies and candidates is the priority.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/seeker-signup" className="button bg-orange-500 text-white py-3 px-8 rounded-full font-semibold text-lg cursor-pointer transition-colors hover:bg-orange-300 border-none shadow-md shadow-orange-500/50">
                I'm a Job Seeker
              </Link>
              <Link href="/company-register" className="button bg-black/50 text-white py-3 px-8 rounded-full font-semibold text-lg cursor-pointer transition-colors hover:bg-black/70 border border-orange-500 shadow-md">
                I'm an Employer
              </Link>
            </div>
          </div>
        </section>

        <section id="about" className="about py-20 text-center bg-black/70 px-4">
          <h2 className="text-3xl font-bold text-orange-500 mb-8">Why Choose Gate33?</h2>
          <p className="text-gray-200 mb-10 max-w-5xl mx-auto text-base leading-relaxed">
            We offer a secure environment where verified companies post genuine job opportunities and qualified candidates can 
            find real opportunities. Our platform uses blockchain technology to ensure greater transparency and security throughout the process.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left mt-10 px-5 max-w-6xl mx-auto">
            <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
              <h3 className="text-xl text-orange-500 mb-4">Verified Companies</h3>
              <p className="text-gray-200 text-sm">
                All companies on our platform undergo a rigorous verification process to ensure 
                legitimacy and reliability in job postings.
              </p>
            </div>
            <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
              <h3 className="text-xl text-orange-500 mb-4">Quality Opportunities</h3>
              <p className="text-gray-200 text-sm">
                Curated high-quality job listings with detailed descriptions, clear benefits, and 
                transparent selection processes.
              </p>
            </div>
            <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
              <h3 className="text-xl text-orange-500 mb-4">Data Security</h3>
              <p className="text-gray-200 text-sm">
                We use blockchain technology to protect your personal information and ensure that your 
                profile and application data remain secure.
              </p>
            </div>
            <div className="bg-black/10 rounded-lg p-8 backdrop-blur-sm border border-orange-500/20 hover:-translate-y-2 hover:shadow-lg transition-all">
              <h3 className="text-xl text-orange-500 mb-4">Learn2Earn</h3>
              <p className="text-gray-200 text-sm">
                Enhance your skills and earn rewards by participating in our Learn2Earn program, 
                where learning converts into real opportunities.
              </p>
            </div>
          </div>
        </section>

        <section id="coming-soon" className="py-16 text-center bg-gradient-to-r from-black via-orange-900/20 to-black px-4">
          <div className="max-w-4xl mx-auto bg-black/40 p-8 rounded-lg border border-orange-500/30 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-orange-500 mb-4">Something Revolutionary is Coming</h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
            <p className="text-gray-200 mb-6 text-lg leading-relaxed">
              We're developing a groundbreaking feature that will transform how talent connects with opportunities.
            </p>
            <div className="bg-black/50 p-4 rounded-lg inline-block">
              <span className="text-2xl font-mono tracking-wider text-orange-400">Coming Soon</span>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="bg-black/30 p-4 rounded-lg">
                <h3 className="text-lg text-orange-400 mb-2">Instant Matching</h3>
                <p className="text-gray-300 text-sm">Connect with opportunities that match your skills immediately.</p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <h3 className="text-lg text-orange-400 mb-2">Smart Contracts</h3>
                <p className="text-gray-300 text-sm">Secure, transparent agreements between all parties.</p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <h3 className="text-lg text-orange-400 mb-2">Verified Payments</h3>
                <p className="text-gray-300 text-sm">Guaranteed compensation for your time and expertise.</p>
              </div>
            </div>
            <div className="mt-8">
              <Link href="/waitlist" className="bg-orange-500/80 text-white py-2 px-6 rounded-lg hover:bg-orange-500 transition-colors">
                Join the Waitlist
              </Link>
            </div>
          </div>
        </section>

        <section id="services" className="services py-20 text-center bg-gradient-to-b from-black/80 to-black/90 px-4">
          <h2 className="text-3xl font-bold text-orange-500 mb-8">Our Services</h2>
          <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
            Gate33 offers a complete platform to connect companies and candidates securely and efficiently.
          </p>
          <div className="services-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="service-card bg-black/5 rounded-lg p-8 text-left border border-orange-500/10 hover:translate-y-[-10px] hover:bg-black/10 hover:border-orange-500/30 transition-all">
              <div className="service-icon text-orange-500 text-5xl mb-4">🔎</div>
              <h3 className="text-xl text-orange-500 mb-4">For Job Seekers</h3>
              <p className="text-gray-200 text-sm mb-4 text-left">
                Access quality jobs from verified companies, create a standout professional profile, and 
                track your applications in one place.
              </p>
              <Link href="/seeker-signup" className="text-orange-400 text-sm hover:underline">Register as a job seeker →</Link>
            </div>
            <div className="service-card bg-black/5 rounded-lg p-8 text-left border border-orange-500/10 hover:translate-y-[-10px] hover:bg-black/10 hover:border-orange-500/30 transition-all">
              <div className="service-icon text-orange-500 text-5xl mb-4">💼</div>
              <h3 className="text-xl text-orange-500 mb-4">For Companies</h3>
              <p className="text-gray-200 text-sm mb-4 text-left">
                Post jobs for qualified professionals, manage applications, and maintain a 
                corporate profile that highlights your culture and values.
              </p>
              <Link href="/company-register" className="text-orange-400 text-sm hover:underline">Register as a company →</Link>
            </div>
            <div className="service-card bg-black/5 rounded-lg p-8 text-left border border-orange-500/10 hover:translate-y-[-10px] hover:bg-black/10 hover:border-orange-500/30 transition-all">
              <div className="service-icon text-orange-500 text-5xl mb-4">🧠</div>
              <h3 className="text-xl text-orange-500 mb-4">Learn2Earn</h3>
              <p className="text-gray-200 text-sm mb-4 text-left">
                Participate in educational programs offered by partner companies, learn new 
                skills, and receive token rewards for completing courses.
              </p>
              <Link href="/learn2earn" className="text-orange-400 text-sm hover:underline">Discover Learn2Earn →</Link>
            </div>
          </div>
        </section>

        <section id="jobs" className="jobs py-20 text-center bg-black/80 px-4">
          <h2 className="text-3xl font-bold text-orange-500 mb-8">Featured Jobs</h2>
          <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
            Explore some of the current opportunities available on our platform.
          </p>
          <div className="jobs-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Example job cards */}
            <div className="job-card bg-black/30 rounded-lg p-6 border border-orange-500/10 hover:border-orange-500/30 transition-all">
              <h3 className="text-xl font-medium text-orange-500 mb-2">Blockchain Developer</h3>
              <p className="text-gray-500 text-sm mb-4">TechFinance • Remote</p>
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                Develop and maintain decentralized applications (DApps) using Solidity. Experience with smart contracts and Web3.js.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Full-time</span>
                <Link href="/jobs" className="text-orange-400 text-sm hover:underline">View job</Link>
              </div>
            </div>
            <div className="job-card bg-black/30 rounded-lg p-6 border border-orange-500/10 hover:border-orange-500/30 transition-all">
              <h3 className="text-xl font-medium text-orange-500 mb-2">Digital Marketing Analyst</h3>
              <p className="text-gray-500 text-sm mb-4">CryptoMedia • São Paulo</p>
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                Develop digital marketing strategies focused on cryptocurrency and blockchain markets. SEO, SEM, and social media.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Full-time</span>
                <Link href="/jobs" className="text-orange-400 text-sm hover:underline">View job</Link>
              </div>
            </div>
            <div className="job-card bg-black/30 rounded-lg p-6 border border-orange-500/10 hover:border-orange-500/30 transition-all">
              <h3 className="text-xl font-medium text-orange-500 mb-2">Security Specialist</h3>
              <p className="text-gray-500 text-sm mb-4">SecureChain • Lisbon</p>
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                Audit smart contracts and implement security protocols in blockchain-based applications.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Full-time</span>
                <Link href="/jobs" className="text-orange-400 text-sm hover:underline">View job</Link>
              </div>
            </div>
          </div>
          <div className="mt-10">
            <Link href="/jobs" className="bg-orange-500 text-white py-3 px-8 rounded-full font-semibold text-lg cursor-pointer transition-colors hover:bg-orange-300 border-none">
              View all jobs
            </Link>
          </div>
        </section>

        <section id="companies" className="companies py-20 text-center bg-black/70 px-4">
          <h2 className="text-3xl font-bold text-orange-500 mb-8">Trusted Companies</h2>
          <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
            All companies on our platform undergo a verification process to ensure a safe environment for candidates.
          </p>
          <div className="company-logos flex flex-wrap justify-center items-center gap-10 mx-auto max-w-5xl mb-10">
            <div className="company-logo bg-black/30 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all">
              <Image src="/logo2.png" alt="Company Logo" width={120} height={40} style={{ width: 'auto', height: 'auto' }} />
            </div>
            <div className="company-logo bg-black/30 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all">
              <Image src="/logo2.png" alt="Company Logo" width={120} height={40} style={{ width: 'auto', height: 'auto' }} />
            </div>
            <div className="company-logo bg-black/30 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all">
              <Image src="/logo2.png" alt="Company Logo" width={120} height={40} style={{ width: 'auto', height: 'auto' }} />
            </div>
            <div className="company-logo bg-black/30 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all">
              <Image src="/logo2.png" alt="Company Logo" width={120} height={40} style={{ width: 'auto', height: 'auto' }} />
            </div>
            <div className="company-logo bg-black/30 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all">
              <Image src="/logo2.png" alt="Company Logo" width={120} height={40} style={{ width: 'auto', height: 'auto' }} />
            </div>
            <div className="company-logo bg-black/30 rounded-lg p-5 w-40 h-24 flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all">
              <Image src="/logo2.png" alt="Company Logo" width={120} height={40} style={{ width: 'auto', height: 'auto' }} />
            </div>
          </div>
          <Link href="/crypto-tools" className="text-orange-400 text-sm hover:underline">
            View all verified companies →
          </Link>
        </section>

        <section id="partners" className="partners py-20 text-center bg-gradient-to-r from-black via-orange-900/20 to-black px-4">
          <h2 className="text-3xl font-bold text-orange-500 mb-8">Our Partners</h2>
          <p className="text-gray-200 max-w-4xl mx-auto mb-10 text-base leading-relaxed">
            We collaborate with industry leaders to bring you the best opportunities and resources in the blockchain and tech space.
          </p>
          
          <div className="partners-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="partner-card bg-black/20 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/50 transition-all">
              <div className="partner-logo w-full h-20 flex items-center justify-center mb-4">
                <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" title="Visit CoinGecko">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-orange-500 overflow-hidden">
                    <Image 
                      src="/images/1_M4pePOxyzZ5BfowWxLlsfg.webp"
                      alt="CoinGecko Logo"
                      width={90}
                      height={90}
                      style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                    />
                  </div>
                </a>
              </div>
              <h3 className="text-xl text-orange-500 mb-2">CoinGecko</h3>
              <p className="text-gray-300 text-sm mb-4">
                Our first official partner! CoinGecko is a leading cryptocurrency data aggregator, providing reliable market data and insights for the blockchain ecosystem.
              </p>
              <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" className="text-orange-400 text-sm hover:underline">Visit CoinGecko →</a>
            </div>
            
            <div className="partner-card bg-black/20 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/50 transition-all">
              <div className="partner-logo w-full h-20 flex items-center justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-orange-500 overflow-hidden">
                  <Image 
                    src="/logo2.png"
                    alt="Partner Logo"
                    width={90}
                    height={90}
                    style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                  />
                </div>
              </div>
              <h3 className="text-xl text-orange-500 mb-2">CryptoVentures</h3>
              <p className="text-gray-300 text-sm mb-4">
                Investment partner connecting promising blockchain startups with capital and resources.
              </p>
              <Link href="#" className="text-orange-400 text-sm hover:underline">Learn more →</Link>
            </div>
            
            <div className="partner-card bg-black/20 rounded-lg p-6 border border-orange-500/20 hover:border-orange-500/50 transition-all">
              <div className="partner-logo w-full h-20 flex items-center justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-orange-500 overflow-hidden">
                  <Image 
                    src="/logo2.png"
                    alt="Partner Logo"
                    width={90}
                    height={90}
                    style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                  />
                </div>
              </div>
              <h3 className="text-xl text-orange-500 mb-2">TechTalent Network</h3>
              <p className="text-gray-300 text-sm mb-4">
                Global recruitment network specializing in blockchain and emerging technology talent.
              </p>
              <Link href="#" className="text-orange-400 text-sm hover:underline">Learn more →</Link>
            </div>
          </div>
          
          <div className="mt-10">
            <Link href="/partners" className="bg-orange-500/80 text-white py-2 px-6 rounded-lg hover:bg-orange-500 transition-colors">
              Become a Partner
            </Link>
          </div>
        </section>

        <section id="faq" className="faq py-20 bg-black/80 px-4">
          <h2 className="text-3xl font-bold text-orange-500 mb-10 text-center">Frequently Asked Questions</h2>
          <div className="faq-container max-w-4xl mx-auto">
            <FAQItem
              question="How does Gate33 ensure companies are trustworthy?"
              answer="All companies undergo a rigorous verification process before they can post jobs on our platform. We verify business documents, assess market reputation, and continuously monitor the quality of published jobs to ensure a safe environment for candidates."
            />
            <FAQItem
              question="What makes Gate33 different from other job platforms?"
              answer="Gate33 differentiates itself through three main factors: (1) Rigorous company verification; (2) Use of blockchain technology to ensure data security; (3) Learn2Earn system that allows candidates to earn tokens while improving their professional skills. Additionally, we're developing a revolutionary new feature that will transform how talent connects with opportunities."
            />
            <FAQItem
              question="How does the Learn2Earn program work?"
              answer="Learn2Earn is an exclusive program where partner companies create educational content about their technologies and processes. Candidates who complete this content earn tokens as rewards and increase their chances of being hired by demonstrating interest and knowledge in specific company areas."
            />
            <FAQItem
              question="Is it free for candidates to register on the platform?"
              answer="Yes, registration and job applications are completely free for candidates. Our business model is based on services offered to companies that want to post jobs and access our qualified talent pool."
            />
            <FAQItem
              question="How does Gate33 use blockchain to improve the recruitment process?"
              answer="We use blockchain to: (1) Verify the authenticity of certificates and qualifications; (2) Protect personal data against leaks; (3) Ensure that companies keep their promises during the recruitment process; (4) Enable secure token reward payments through the Learn2Earn program."
            />
            <FAQItem
              question="What is this new feature coming soon?"
              answer="We're developing a groundbreaking new way to connect talent with opportunities that will fundamentally change how work is discovered, agreed upon, and compensated. While we can't reveal all the details yet, it will combine instant matching with verified payments and smart contracts to create a seamless, secure experience for both talent and employers."
            />
          </div>
        </section>

        <section id="contact" className="contact bg-black py-20 text-center px-4">
          <h2 className="text-3xl font-bold text-orange-500 mb-6">Contact Us</h2>
          <p className="text-gray-200 max-w-xl mx-auto mb-10 text-base leading-relaxed">
            Have a question or need help? Contact us and we'll respond as quickly as possible.
          </p>
          <div className="max-w-md mx-auto">
            <ContactForm 
              title="" 
              submitButtonText="Send Message"
              className="border border-orange-500/20"
              defaultSubject="Contact from Gate33 Website"
              showSubjectField={false}
            />
          </div>
        </section>
      </main>
    </>
  );
}

export default Home;

