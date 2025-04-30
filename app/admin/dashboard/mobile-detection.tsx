"use client";

import React, { useState, useEffect } from "react";

/**
 * Componente que detecta se o dispositivo é móvel e mostra uma mensagem
 * para usar o desktop quando necessário.
 */
export const MobileDetection = ({ children }: { children: React.ReactNode }) => {
  // Use null initially to prevent hydration mismatch
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect mobile devices both by screen width and user agent
    const detectMobile = () => {
      const byWidth = window.innerWidth < 768;
      const byUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      return byWidth || byUserAgent;
    };

    // Set initial value
    setIsMobile(detectMobile());
    
    // Add resize listener
    const handleResize = () => {
      setIsMobile(detectMobile());
    };

    window.addEventListener("resize", handleResize);
    
    // Clean up listener
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Show nothing during initial load to prevent hydration mismatch
  if (isMobile === null) {
    return null;
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-orange-500 p-4">
        <div className="bg-black/80 p-6 rounded-lg text-center max-w-md">
          <h2 className="text-xl font-bold text-orange-500 mb-4">Desktop Required</h2>
          <p className="text-white mb-6">
            The Admin Dashboard is optimized for desktop viewing. Please open this page on a computer for the best experience.
          </p>
          <div className="animate-pulse text-orange-400 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Desktop view
  return <>{children}</>;
};

// Add a default export for easier importing
export default MobileDetection;