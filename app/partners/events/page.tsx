"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Layout from '../../../components/Layout';
import '../../../components/index-page.css';
import '../../../components/global.css';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface EventPartner {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  website?: string;
  eventDetails?: {
    startDate: any;
    endDate: any;
    location: string;
    city: string;
    country: string;
    ticketUrl?: string;
    affiliateLink?: string;
    priceRange?: string;
    discountCode?: string;
    heroImage?: string;
    expectedAttendees?: number;
    categories?: string[];
  };
}

export default function EventsListPage() {
  const [events, setEvents] = useState<EventPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Buscar apenas parceiros do tipo "event"
        const eventsQuery = query(
          collection(db, 'partners'),
          where('type', '==', 'event'),
          where('active', '==', true)
        );
        
        const querySnapshot = await getDocs(eventsQuery);
        const eventsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            slug: data.slug || doc.id,
            logo: data.logo || '',
            description: data.description || '',
            website: data.website || '',
            eventDetails: data.eventDetails || null
          };
        });
        
        // Ordenar por data de início (mais próximos primeiro)
        eventsData.sort((a, b) => {
          if (!a.eventDetails?.startDate || !b.eventDetails?.startDate) return 0;
          return new Date(a.eventDetails.startDate.seconds * 1000).getTime() - 
                 new Date(b.eventDetails.startDate.seconds * 1000).getTime();
        });
        
        setEvents(eventsData);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const isUpcoming = (timestamp: any) => {
    if (!timestamp) return false;
    const eventDate = new Date(timestamp.seconds * 1000);
    const now = new Date();
    return eventDate > now;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-black to-orange-900">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center py-20 px-4 md:px-0">
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h1 className="gate33-h1 mb-6 bg-gradient-to-r from-gate33-orange via-gate33-orange-alt to-blue-400 bg-clip-text text-transparent">
              Crypto Events
            </h1>
            <p className="gate33-body-lg mb-8 text-white/80">
              Discover the most important blockchain and cryptocurrency events. 
              Get exclusive discounts and networking opportunities through Gate33.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Link 
                href="/partners" 
                className="gate33-btn-secondary"
              >
                All Partners
              </Link>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section className="relative z-10 py-12 md:py-20 max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gate33-orange"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="gate33-btn-orange"
              >
                Try Again
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="gate33-h3 mb-4 text-white/80">No events found</h3>
              <p className="gate33-body text-white/60">
                Check back soon for upcoming crypto events and conferences.
              </p>
            </div>
          ) : (
            <>
              <h2 className="gate33-h2 mb-12 text-gate33-orange text-center">
                Featured Events ({events.length})
              </h2>
              
              <div className="grid gap-8 md:gap-12">
                {events.map((event) => (
                  <div key={event.id} className="card-orange-glow overflow-hidden">
                    <div className="grid md:grid-cols-3 gap-6 p-6">
                      {/* Event Image */}
                      <div className="relative">
                        <img 
                          src={event.eventDetails?.heroImage || event.logo || '/images/default-event.jpg'} 
                          alt={event.name}
                          className="w-full h-48 md:h-full object-cover rounded-lg"
                        />
                        {event.eventDetails?.startDate && isUpcoming(event.eventDetails.startDate) && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            Upcoming
                          </div>
                        )}
                      </div>
                      
                      {/* Event Info */}
                      <div className="md:col-span-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <img 
                              src={event.logo} 
                              alt={`${event.name} logo`}
                              className="w-8 h-8 rounded-full bg-white/10"
                            />
                            <span className="text-gate33-orange text-sm font-medium">
                              {event.eventDetails?.city}, {event.eventDetails?.country}
                            </span>
                          </div>
                          
                          <h3 className="gate33-h3 mb-3">{event.name}</h3>
                          <p className="gate33-body-sm text-white/80 mb-4">
                            {event.description}
                          </p>
                          
                          {/* Event Details */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {event.eventDetails?.startDate && (
                              <div>
                                <span className="text-gate33-orange text-xs font-medium block">Date</span>
                                <span className="text-white text-sm">
                                  {formatDate(event.eventDetails.startDate)}
                                  {event.eventDetails.endDate && 
                                    formatDate(event.eventDetails.startDate) !== formatDate(event.eventDetails.endDate) &&
                                    ` - ${formatDate(event.eventDetails.endDate)}`
                                  }
                                </span>
                              </div>
                            )}
                            
                            {event.eventDetails?.location && (
                              <div>
                                <span className="text-gate33-orange text-xs font-medium block">Venue</span>
                                <span className="text-white text-sm">{event.eventDetails.location}</span>
                              </div>
                            )}
                            
                            {event.eventDetails?.expectedAttendees && (
                              <div>
                                <span className="text-gate33-orange text-xs font-medium block">Expected Attendees</span>
                                <span className="text-white text-sm">{event.eventDetails.expectedAttendees}+</span>
                              </div>
                            )}
                            
                            {event.eventDetails?.priceRange && (
                              <div>
                                <span className="text-gate33-orange text-xs font-medium block">Price Range</span>
                                <span className="text-white text-sm">{event.eventDetails.priceRange}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Categories */}
                          {event.eventDetails?.categories && event.eventDetails.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {event.eventDetails.categories.map((category, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 bg-gate33-orange/20 text-gate33-orange rounded-full text-xs"
                                >
                                  {category}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 mt-4">
                          <Link 
                            href={`/partners/events/${event.slug}`}
                            className="gate33-btn-orange flex-1 min-w-[120px] text-center"
                          >
                            View Event Details
                          </Link>
                          
                          {event.eventDetails?.affiliateLink && (
                            <a 
                              href={event.eventDetails.affiliateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gate33-btn-secondary flex-1 min-w-[120px] text-center"
                            >
                              Get Tickets
                              {event.eventDetails.discountCode && (
                                <span className="ml-2 text-xs bg-green-500 px-2 py-1 rounded">
                                  {event.eventDetails.discountCode}
                                </span>
                              )}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
