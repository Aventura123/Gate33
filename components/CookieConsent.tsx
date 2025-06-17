"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('gate33-cookie-consent');
    if (!consent) {
      // Show banner after a small delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consentData = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
    
    localStorage.setItem('gate33-cookie-consent', JSON.stringify(consentData));
    setIsVisible(false);
    onAccept?.();
  };

  const handleDeclineAll = () => {
    const consentData = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
    
    localStorage.setItem('gate33-cookie-consent', JSON.stringify(consentData));
    setIsVisible(false);
    onDecline?.();
  };

  const handleSavePreferences = () => {
    const consentData = {
      ...preferences,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
    
    localStorage.setItem('gate33-cookie-consent', JSON.stringify(consentData));
    setIsVisible(false);
    
    // Trigger appropriate callback based on preferences
    if (preferences.analytics || preferences.marketing || preferences.functional) {
      onAccept?.();
    } else {
      onDecline?.();
    }
  };

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-orange-500/30"
      >
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {!showDetails ? (
            // Simple banner
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-2">Cookie Preferences</h3>
                <p className="text-gray-300 text-sm">
                  We use cookies to enhance your experience, provide personalized content, and analyze our traffic. 
                  Choose your preferences or accept all cookies to continue.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 min-w-fit">
                <button
                  onClick={() => setShowDetails(true)}
                  className="px-4 py-2 text-orange-400 border border-orange-400 rounded-lg hover:bg-orange-400 hover:text-black transition-colors text-sm"
                >
                  Customize
                </button>
                <button
                  onClick={handleDeclineAll}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-colors text-sm"
                >
                  Decline All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            // Detailed preferences
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-lg">Cookie Preferences</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="grid gap-4">
                {/* Necessary Cookies */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">Strictly Necessary</h4>
                    <div className="bg-orange-500 rounded-full w-5 h-5 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">
                    These cookies are essential for the website to function properly. They enable basic features like page navigation, access to secure areas, and authentication.
                  </p>
                </div>

                {/* Functional Cookies */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">Functional</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        onChange={() => togglePreference('functional')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm">
                    These cookies enable enhanced functionality and personalization, such as remembering your wallet preferences and customization settings.
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">Analytics</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={() => togglePreference('analytics')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm">
                    These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">Marketing</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={() => togglePreference('marketing')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm">
                    These cookies are used to deliver personalized advertisements and measure their effectiveness. They may track your browsing activity across websites.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-gray-700">
                <button
                  onClick={handleDeclineAll}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
                >
                  Decline All
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
