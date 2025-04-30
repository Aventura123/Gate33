"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PaymentSettings from "../../../components/admin/PaymentSettings";

export default function PaymentSettingsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Here you can add your logic to verify if the user is admin
    // For example, checking the current user in Firestore or in an authentication context
    const checkIsAdmin = async () => {
      // Logic to verify if the user is admin
      // Simplified code for brevity
      const userIsAdmin = true; // Replace with your real logic
      
      setIsAdmin(userIsAdmin);
      
      if (!userIsAdmin) {
        router.push("/admin/access-denied");
      }
    };
    
    checkIsAdmin();
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Payment Settings</h1>
      <div className="mb-8">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Manage the platform payment system settings, including wallet addresses for receiving funds.
        </p>
      </div>
      
      {/* Changed isAdmin to hasPermission to match the PaymentSettings component interface */}
      <PaymentSettings hasPermission={isAdmin} />
      
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Important Information</h3>
        <ul className="list-disc pl-5 text-sm text-blue-700 dark:text-blue-300">
          <li className="mb-1">Changes to the wallet address affect all future payments.</li>
          <li className="mb-1">Make sure the entered address is correct to avoid loss of funds.</li>
          <li className="mb-1">The new address will be used immediately after the update.</li>
          <li>To modify smart contract addresses, contact technical support.</li>
        </ul>
      </div>
    </div>
  );
}
