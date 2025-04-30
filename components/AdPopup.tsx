'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './adpopup.css'; // Import the CSS file

// Interface for the advertisement object
interface Advertisement {
  id: string;
  imageUrl: string;
  linkUrl: string;
  title: string;
  active: boolean;
  priority: number;
  createdAt: any;
  displayFrequency: number; // In minutes, how long to wait between displays
}

const AdPopup: React.FC = () => {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  
  // Check if the ad should be displayed based on view history
  const shouldShowAd = (): boolean => {
    try {
      const lastShown = localStorage.getItem('lastAdShown');
      if (!lastShown) return true;
      
      const lastShownTime = parseInt(lastShown);
      const currentTime = new Date().getTime();
      
      // If the ad was shown in the last X minutes (defined by displayFrequency), don't show it again
      const minutesSinceLastShown = (currentTime - lastShownTime) / (1000 * 60);
      const requiredWaitTime = ad?.displayFrequency || 30; // Default: 30 minutes
      
      return minutesSinceLastShown >= requiredWaitTime;
    } catch (error) {
      console.error('Error checking ad display time:', error);
      return false;
    }
  };
  
  // Fetch active ads from Firestore
  const fetchAds = async () => {
    try {
      const adsRef = collection(db, 'advertisements');
      
      // A simple query that doesn't require a composite index
      const q = query(
        adsRef,
        where('active', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Convert all docs to Advertisement objects
        const ads: Advertisement[] = [];
        
        querySnapshot.forEach(doc => {
          const data = doc.data() as Omit<Advertisement, 'id'>;
          ads.push({
            ...data,
            id: doc.id
          });
        });
        
        // Sort on the client side (JavaScript) by priority (descending)
        ads.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        // Get the first (highest priority)
        const topAd = ads[0];
        
        if (topAd) {
          setAd(topAd);
          
          // Check if we should show the ad now
          if (shouldShowAd()) {
            // Small delay to show the ad after page load
            setTimeout(() => {
              setIsVisible(true);
              // Record the time when the ad was displayed
              localStorage.setItem('lastAdShown', new Date().getTime().toString());
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching advertisements:', error);
    }
  };
  
  useEffect(() => {
    fetchAds();
    // Check again every 5 minutes for new ads
    const interval = setInterval(fetchAds, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // If there's no ad or it's not visible, don't render anything
  if (!ad || !isVisible) return null;
  
  return (
    <div className="fixed left-4 bottom-4 z-50 w-64 bg-black border-[0.5px] border-orange-500/30 rounded-lg shadow-lg overflow-hidden animate-fadeIn">
      <div className="relative">
        {/* Close button in the upper right corner */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-1 right-1 bg-black/70 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors z-10"
          aria-label="Close advertisement"
        >
          ×
        </button>
        
        {/* Ad title */}
        <div className="bg-gradient-to-r from-orange-700/80 to-orange-500/80 text-white text-sm font-medium p-2">
          {ad.title || 'Gate33 Advertisement'}
        </div>
        
        {/* Image link - when clicked opens URL in new tab */}
        <a 
          href={ad.linkUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <img 
            src={ad.imageUrl} 
            alt={ad.title} 
            className="w-full h-auto object-cover hover:opacity-90 transition-opacity ad-image"
          />
        </a>
      </div>
    </div>
  );
};

export default AdPopup;