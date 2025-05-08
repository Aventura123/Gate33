"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import jwt from "jsonwebtoken";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Interface for authentication options
interface AuthOptions {
  // User type: 'admin', 'company', 'seeker', 'support'
  userType?: 'admin' | 'company' | 'seeker' | 'support';
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
    // Changed the default to 'seeker' instead of 'admin' when not specified
    const userType = options.userType || 'seeker';
    
    // Map user types to login paths and token names
    const typeToLoginPath = {
      'admin': '/admin-login',
      'company': '/login',
      'seeker': '/login',
      'support': '/support-login'
    };
    
    const typeToTokenName = {
      'admin': 'token',            // JWT token for admin
      'company': 'companyToken',   // specific token for company
      'seeker': 'seekerToken',     // specific token for seeker
      'support': 'supportToken'    // specific token for support
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
          // Admin uses JWT token that needs verification
          if (userType === 'admin') {
            if (!process.env.JWT_SECRET) {
              throw new Error("JWT_SECRET is not defined in the environment variables.");
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const adminId = typeof decoded !== "string" && "id" in decoded ? decoded.id : null;

            if (!adminId) {
              console.error("Invalid admin token payload. Redirecting to login.");
              router.replace(loginPath);
              return;
            }

            // Verify admin token in Firestore
            if (!db) {
              throw new Error("Firestore instance is not initialized.");
            }
            const adminRef = doc(db, "admins", adminId);
            const adminDoc = await getDoc(adminRef);

            if (!adminDoc.exists() || adminDoc.data().token !== token) {
              console.error("Token mismatch or admin not found. Redirecting to login.");
              router.replace(loginPath);
              return;
            }
          } 
          // For other user types, we can implement specific verifications
          // For example, for seekers and companies, we can check if the decoded ID exists in Firestore
          else if (userType === 'seeker') {
            // For seekers, the token is usually just the ID encoded in base64
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
          // Similar verification for companies and support
          else if (userType === 'company' || userType === 'support') {
            // Implement specific checks as needed
            // This is a simplified check that only verifies if the token exists
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