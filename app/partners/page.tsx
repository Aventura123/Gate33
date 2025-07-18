"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Layout from '../../components/Layout';
import '../../components/index-page.css';
import '../../components/global.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ContactForm from '../../components/ContactForm';

interface Partner {
  id: string;
  logo: string;
  name: string;
  slug?: string;
  description: string;
  type: string;
  website?: string;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'partners'));
        const partnersData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            logo: data.logoUrl || data.logo || '',
            name: data.name || '',
            slug: data.slug || '',
            description: data.description || '',
            type: data.type || '',
            website: data.website || ''
          };
        });
        setPartners(partnersData);
        console.log('Partners loaded:', partnersData); // Debug: verificar dados
      } catch (error) {
        console.error('Error fetching partners:', error);
      }
    };

    fetchPartners();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-900">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center py-20 px-4 md:px-0">
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h1 className="text-gate33-orange text-h1-desktop md:text-h1-desktop mb-6">Featured Partners</h1>
            <p className="text-body-lg text-white/80 mb-8">Discover the main events and partners driving the crypto ecosystem. Explore opportunities, networking, and innovation in Web3.</p>
            
            {/* Quick Navigation */}
            <div className="flex flex-wrap justify-center gap-4 mb-0">
              <Link href="/partners/events" className="gate33-btn-orange">
                View Events
              </Link>
              <button
                onClick={() => setShowContactModal(true)}
                className="gate33-btn-orange"
              >
                Become a Partner
              </button>
            </div>
          </div>
        </section>

        {/* Partners Section */}
        <section className="relative z-10 py-12 md:py-20 max-w-6xl mx-auto px-4">
          <div
            className={`partners-grid grid gap-8 ${partners.length < 3 ? 'grid-cols-1 md:grid-cols-2 justify-center' : 'grid-cols-1 md:grid-cols-3'}`}
          >
            {partners.map(partner => (
              <div key={partner.id} className="card-orange-glow p-6 flex flex-col items-center">
                {partner.logo && (
                  <img src={partner.logo} alt={partner.name} className="w-20 h-20 mb-4 rounded-full bg-white/10 object-cover" />
                )}
                <h3 className="gate33-h3 mb-2">{partner.name}</h3>
                <p className="gate33-body-sm mb-4 text-center text-white/80">{partner.description}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {partner.type.toLowerCase() === 'event' ? (
                    <Link 
                      href={`/partners/events/${partner.slug || partner.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="gate33-btn-orange font-bold text-sm"
                    >
                      Visit Partner
                    </Link>
                  ) : (
                    <a 
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gate33-btn-orange font-bold text-sm"
                    >
                      Visit Partner
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Modal de contato */}
        {showContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
            <div className="bg-black/70 border border-orange-500/30 rounded-2xl p-6 w-full max-w-lg relative">
              <button
                onClick={() => setShowContactModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition"
              >
                ×
              </button>

              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-orange-400">Contact for Partnerships</h3>
              </div>

              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="partnershipType" className="block text-gray-300 mb-1">Type of Partnership <span className="text-red-500">*</span></label>
                  <input
                    id="partnershipType"
                    name="partnershipType"
                    type="text"
                    className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="companyName" className="block text-gray-300 mb-1">Company Name <span className="text-red-500">*</span></label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="website" className="block text-gray-300 mb-1">Website <span className="text-red-500">*</span></label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-gray-300 mb-1">Message <span className="text-red-500">*</span></label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full px-4 py-2 bg-black/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}