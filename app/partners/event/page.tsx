import React from "react";
import Layout from '../../../components/Layout';
import '../../../components/index-page.css';
import '../../../components/global.css';

export default function EventPartnersPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-900">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center py-20 px-4 md:px-0">
            
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h1 className="gate33-h1 mb-6 bg-gradient-to-r from-gate33-orange via-gate33-orange-alt to-blue-400 bg-clip-text text-transparent">Crypto Events & Partners</h1>
            <p className="gate33-body-lg mb-8 text-white/80">Discover the main events and partners driving the crypto ecosystem. Explore opportunities, networking, and innovation in Web3.</p>
          </div>
        </section>

        {/* Partners Section */}
        <section className="relative z-10 py-12 md:py-20 max-w-6xl mx-auto px-4">
          <h2 className="gate33-h2 mb-8 text-gate33-orange text-center">Featured Partners & Events</h2>
          <div className="partners-grid grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Example partner cards - replace with dynamic data later */}
            <div className="card-orange-glow p-6 flex flex-col items-center">
              <img src="/images/partner1-logo.png" alt="Partner 1" className="w-20 h-20 mb-4 rounded-full bg-white/10" />
              <h3 className="gate33-h3 mb-2">Crypto Summit Lisbon</h3>
              <p className="gate33-body-sm mb-4 text-center text-white/80">The largest blockchain event in Portugal, bringing together leaders, innovators, and enthusiasts.</p>
              <a href="#" className="gate33-btn-orange font-bold mt-2">View details</a>
            </div>
            <div className="card-orange-glow p-6 flex flex-col items-center">
              <img src="/images/partner2-logo.png" alt="Partner 2" className="w-20 h-20 mb-4 rounded-full bg-white/10" />
              <h3 className="gate33-h3 mb-2">Web3 Connect</h3>
              <p className="gate33-body-sm mb-4 text-center text-white/80">Networking and events platform for Web3 professionals and companies.</p>
              <a href="#" className="gate33-btn-orange font-bold mt-2">View details</a>
            </div>
            <div className="card-orange-glow p-6 flex flex-col items-center">
              <img src="/images/partner3-logo.png" alt="Partner 3" className="w-20 h-20 mb-4 rounded-full bg-white/10" />
              <h3 className="gate33-h3 mb-2">Blockchain Week</h3>
              <p className="gate33-body-sm mb-4 text-center text-white/80">A week dedicated to education, innovation, and networking in blockchain and crypto assets.</p>
              <a href="#" className="gate33-btn-orange font-bold mt-2">View details</a>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 text-center bg-transparent">
          <h3 className="gate33-h2 mb-4 text-blue-400">Want to become a partner or promote your event?</h3>
          <p className="gate33-body mb-6 text-white/80">Contact us to integrate your event or project with the Gate33 ecosystem.</p>
          <a href="/contact" className="gate33-btn-orange font-bold">Contact Us</a>
        </section>
      </div>
    </Layout>
  );
}
