"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import jwt from "jsonwebtoken";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const WithAuth = (props: P) => {
    const router = useRouter();

    useEffect(() => {
      const checkToken = async () => {
        const token = localStorage.getItem("token");

        if (!token || token === "null") {
          console.warn("No valid token found. Redirecting to login.");
          router.replace("/admin-login");
          return;
        }

        try {
          // Decode the token to get the user ID
          if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in the environment variables.");
          }
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const companyId = typeof decoded !== "string" && "id" in decoded ? decoded.id : null;

          if (!companyId) {
            console.error("Invalid token payload. Redirecting to login.");
            router.replace("/admin-login");
            return;
          }

          // Fetch the token from Firestore
          if (!db) {
            throw new Error("Firestore instance is not initialized.");
          }
          const companyRef = doc(db, "companies", companyId);
          const companyDoc = await getDoc(companyRef);

          if (!companyDoc.exists() || companyDoc.data().token !== token) {
            console.error("Token mismatch or company not found. Redirecting to login.");
            router.replace("/admin-login");
            return;
          }

          console.log("Token is valid and matches Firestore record.");
        } catch (err) {
          console.error("Invalid or expired token:", err);
          router.replace("/admin-login");
        }
      };

      checkToken();
    }, [router]);

    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };

  WithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

  return WithAuth;
}