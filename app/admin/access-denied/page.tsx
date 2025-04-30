"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminPermissions } from '../../../hooks/useAdminPermissions';

const AccessDeniedPage: React.FC = () => {
  const router = useRouter();
  const { role, loading } = useAdminPermissions();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-black to-orange-500 p-4">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full">
        <div className="bg-red-600 p-1"></div>
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center text-red-600 mb-6">Access Denied</h1>
          
          <div className="bg-red-100 border-l-4 border-red-600 p-4 mb-6">
            <p className="text-red-800">
              You don't have permission to access the requested page.
            </p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Current permissions:</h2>
            {loading ? (
              <p className="text-gray-500">Loading your permissions...</p>
            ) : (
              <p className="text-gray-700">
                Your role: <span className="font-semibold">{role || 'Unknown'}</span>
              </p>
            )}
          </div>
          
          <div className="flex flex-col space-y-3">
            <Link 
              href="/admin/dashboard"
              className="w-full py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-600 text-center"
            >
              Return to Dashboard
            </Link>
            
            <button
              onClick={() => router.back()}
              className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Go Back
            </button>
            
            <Link 
              href="/login"
              className="w-full py-2 px-4 bg-black text-white rounded hover:bg-gray-800 text-center"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;