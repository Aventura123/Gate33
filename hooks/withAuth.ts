"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Interface for authentication options
interface AuthOptions {
  // User type: 'company', 'seeker'
  userType?: 'company' | 'seeker';
  // Login page URL for redirection, if not specified, it will be determined by userType
  loginPath?: string;
}

export default function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: AuthOptions = {}
) {
  const WithAuth = (props: P) => {
    const router = useRouter();
    
    // Determine which user type and login path to use
    const userType = options.userType || 'seeker';
    
    // Map user types to login paths and token names
    const typeToLoginPath = {
      'company': '/login',
      'seeker': '/login'
    };
    
    const typeToTokenName = {
      'company': 'companyToken',   // specific token for company
      'seeker': 'seekerToken'      // specific token for seeker
    };
    
    // Determine appropriate login path
    const loginPath = options.loginPath || typeToLoginPath[userType];
    
    // Determine token name to be verified
    const tokenName = typeToTokenName[userType];

    useEffect(() => {
      const checkToken = async () => {
        // Check if a token exists for the appropriate user type
        const token = localStorage.getItem(tokenName);

        if (!token || token === "null") {
          console.warn(`No valid ${userType} token found. Redirecting to ${loginPath}.`);
          router.replace(loginPath);
          return;
        }

        try {
          // For seekers, the token is usually just the ID encoded in base64
          if (userType === 'seeker') {
            try {
              const seekerId = atob(token); // Decode base64 token
              
              if (!db) {
                throw new Error("Firestore instance is not initialized.");
              }
              
              const seekerRef = doc(db, "seekers", seekerId);
              const seekerDoc = await getDoc(seekerRef);
              
              if (!seekerDoc.exists()) {
                console.error("Seeker not found in database. Redirecting to login.");
                router.replace(loginPath);
                return;
              }
            } catch (error) {
              console.error("Invalid seeker token:", error);
              router.replace(loginPath);
              return;
            }
          }
          // Company verification
          else if (userType === 'company') {
            // Company token verification - simplified check
            try {
              const companyId = atob(token); // Decode base64 token
              
              if (!db) {
                throw new Error("Firestore instance is not initialized.");
              }
              
              const companyRef = doc(db, "companies", companyId);
              const companyDoc = await getDoc(companyRef);
              
              if (!companyDoc.exists()) {
                console.error("Company not found in database. Redirecting to login.");
                router.replace(loginPath);
                return;
              }
            } catch (error) {
              console.error("Invalid company token:", error);
              router.replace(loginPath);
              return;
            }
          }

          console.log(`${userType} token is valid.`);
        } catch (err) {
          console.error(`Invalid or expired ${userType} token:`, err);
          router.replace(loginPath);
        }
      };

      checkToken();
    }, [router, loginPath, userType, tokenName]);

    if (typeof window !== "undefined" && !localStorage.getItem(tokenName)) {
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };

  WithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

  return WithAuth;
}