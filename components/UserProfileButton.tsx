"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserProfileButtonProps {
  className?: string;
}

const UserProfileButton: React.FC<UserProfileButtonProps> = ({ className = "" }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    photo: string;
    role: string;
    type: 'seeker' | 'company' | 'admin' | 'support';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect if it's a mobile version to adjust the dropdown behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Reference for the dropdown container to detect mouse leave
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Reference for the dropdown close timer
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();

  // Function to fetch user data from Firebase
  const fetchUserDataFromFirebase = async (type: string, id: string) => {
    try {
      if (!db) return null;
      
      let collection = '';
      
      switch(type) {
        case 'company':
          collection = 'companies';
          break;
        case 'seeker':
          collection = 'seekers';
          break;
        case 'admin':
          collection = 'admins';
          console.log(`Attempting to fetch admin data from 'admins' collection with ID: ${id}`);
          break;
        case 'support':
          collection = 'support';
          console.log(`Attempting to fetch support data from 'support' collection with ID: ${id}`);
          break;
        default:
          console.warn(`Unknown user type: ${type}`);
          return null;
      }
      
      const docRef = doc(db, collection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log(`${type} document found:`, docSnap.data());
        return docSnap.data();
      } else {
        console.log(`No ${type} document found for ID: ${id}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
      return null;
    }
  };

  // Function to check the logged-in user type based on localStorage values
  useEffect(() => {
    const checkLoggedInUser = async () => {
      setIsLoading(true);
      
      // Check and debug all localStorage values
      console.log("UserProfileButton checking localStorage:");
      console.log("- seekerId:", localStorage.getItem("seekerId"));
      console.log("- seekerName:", localStorage.getItem("seekerName"));
      console.log("- seekerPhoto:", localStorage.getItem("seekerPhoto"));
      console.log("- userId:", localStorage.getItem("userId"));
      console.log("- userName:", localStorage.getItem("userName"));
      console.log("- userRole:", localStorage.getItem("userRole"));
      console.log("- companyId:", localStorage.getItem("companyId"));
      console.log("- companyName:", localStorage.getItem("companyName"));
      console.log("- token:", localStorage.getItem("token"));
      
      try {
        // First priority: Check if we have admin/superadmin credentials
        if (localStorage.getItem("userId") && localStorage.getItem("userRole")) {
          const userId = localStorage.getItem("userId");
          const userRole = localStorage.getItem("userRole") || "";
          const userName = localStorage.getItem("userName");
          
          console.log("Found user credentials:", { userId, userRole, userName });
          
          // Handle admin users with highest priority
          if (userRole === "super_admin" || userRole === "admin") {
            console.log("Processing as admin account");
            const adminData = await fetchUserDataFromFirebase('admin', userId || "");
            const formattedRole = userRole === "super_admin" ? "Super Admin" : 
                             userRole.charAt(0).toUpperCase() + userRole.slice(1);

            // For admins, we need to be careful about the name
            // Check if userName is "suporte" and avoid using it for admin accounts
            let adminName;
            
            if (userName && userName.toLowerCase() !== "suporte") {
              adminName = userName;
              console.log("Using userName from localStorage:", adminName);
            } else if (adminData?.name) {
              adminName = adminData.name;
              console.log("Using name from adminData:", adminName);
              
              // Update localStorage with correct name from Firebase
              console.log("Updating localStorage userName with correct admin name from Firebase");
              localStorage.setItem("userName", adminData.name);
            } else {
              adminName = "Admin";
              console.log("Using fallback admin name");
            }
            
            console.log("Final admin name:", adminName);
                             
            return {
              name: adminName,
              photo: adminData?.photoURL || localStorage.getItem("userPhoto") || "/images/default-avatar.png",
              role: formattedRole,
              type: 'admin' as const
            };
          }
          
          // Handle support users only if clearly identified as support
          else if (userRole === "support" && userId) {
            console.log("Processing as support account");
            const supportData = await fetchUserDataFromFirebase('support', userId);
            return {
              name: supportData?.name || userName || "Support",
              photo: supportData?.photoURL || localStorage.getItem("userPhoto") || "/images/default-avatar.png",
              role: "Support",
              type: 'support' as const
            };
          }
        }
        
        // Check seeker
        if (localStorage.getItem("seekerToken")) {
          const seekerId = localStorage.getItem("seekerToken") 
            ? atob(localStorage.getItem("seekerToken") || "")
            : null;
            
          if (seekerId) {
            const seekerData = await fetchUserDataFromFirebase('seeker', seekerId);
            
            if (seekerData) {
              return {
                name: seekerData.name || "User",
                photo: seekerData.photoURL || "/images/default-avatar.png",
                role: "Job Seeker",
                type: 'seeker' as const
              };
            }
          }
        }
        
        // Check company
        const companyId = localStorage.getItem("companyId") || 
          (localStorage.getItem("token") ? atob(localStorage.getItem("token") || "") : null);
          
        if (companyId) {
          console.log("Fetching company data from Firebase, ID:", companyId);
          const companyData = await fetchUserDataFromFirebase('company', companyId);
          
          if (companyData) {
            console.log("Company data obtained from Firebase:", companyData);
            return {
              name: companyData.name || "Company",
              photo: companyData.photoURL || companyData.photo || "/images/default-avatar.png",
              role: "Company",
              type: 'company' as const
            };
          } else {
            // Fallback to localStorage data if Firebase fails
            return {
              name: localStorage.getItem("companyName") || "Company",
              photo: localStorage.getItem("companyPhoto") || "/images/default-avatar.png",
              role: "Company",
              type: 'company' as const
            };
          }
        }
      } catch (error) {
        console.error("Error checking logged in user:", error);
      } finally {
        setIsLoading(false);
      }
      
      setIsLoading(false);
      return null;
    };

    // Only run on client
    if (typeof window !== 'undefined') {
      checkLoggedInUser().then(user => {
        setUserInfo(user);
        setIsLoading(false);
      });
    }
  }, []);

  // Add event listener to handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Functions to handle opening and closing the dropdown with delay
  const handleMouseEnter = () => {
    // Cancel any pending close timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    // Set a timer to close the dropdown after 1.5 seconds
    closeTimerRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 1500); // 1.5 seconds delay to allow cursor movement
  };

  // Clear the timer when the component is unmounted
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    // Clear all possible authentication tokens
    localStorage.removeItem("seekerId");
    localStorage.removeItem("seekerName");
    localStorage.removeItem("seekerPhoto");
    localStorage.removeItem("seekerToken");
    
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhoto");
    localStorage.removeItem("userRole");
    localStorage.removeItem("token");
    
    localStorage.removeItem("companyId");
    localStorage.removeItem("companyName");
    localStorage.removeItem("companyPhoto");
    
    document.cookie = "isAuthenticated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirect to home page
    router.push("/");
    
    // Reload the page to ensure the component state is updated
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleGoToDashboard = () => {
    if (!userInfo) return;
    switch (userInfo.type) {
      case 'seeker':
        router.push("/seeker-dashboard");
        break;
      case 'company':
        router.push("/company-dashboard");
        break;
      case 'admin':
        router.push("/admin/dashboard");
        break;
      case 'support':
        router.push("/support-dashboard");
        break;
      default:
        // Fallback: go to a generic dashboard or home
        router.push("/");
        break;
    }
  };

  // If not logged in, render nothing
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-orange-500 bg-black/20 flex items-center justify-center">
            <div className="animate-pulse w-4 h-4 bg-orange-500 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }
  return (
    <div 
      className={`relative ${className}`}
      ref={dropdownRef}
      onMouseEnter={isMobile ? undefined : handleMouseEnter}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
    >      <div
        className="flex items-center gap-2 cursor-pointer whitespace-nowrap"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-orange-500">
          <img
            src={userInfo.photo}
            alt={`${userInfo.name}'s profile`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/images/default-avatar.png';
            }}
          />
        </div>        <span className={`text-sm font-medium text-white flex-shrink-0 ${isMobile ? 'inline' : 'hidden md:inline'}`}>
          My Profile
        </span>
      </div>
      
      {isDropdownOpen && (
        <div 
          className={`${isMobile ? 'relative left-0 w-full' : 'absolute right-0 w-48'} mt-2 bg-black/95 border border-gray-700 rounded-md shadow-lg py-1 z-50`}
          onMouseEnter={isMobile ? undefined : handleMouseEnter}
          onMouseLeave={isMobile ? undefined : handleMouseLeave}
        >
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="text-orange-400 font-semibold">{userInfo.name}</p>
            <p className="text-gray-400 text-xs">{userInfo.role}</p>
          </div>
          
          <button 
            onClick={handleGoToDashboard}
            className="px-4 py-2 text-gray-200 hover:bg-orange-500 hover:text-white w-full text-left"
          >
            Dashboard
          </button>
          
          <button 
            onClick={handleLogout}
            className="px-4 py-2 text-gray-200 hover:bg-red-600 hover:text-white w-full text-left"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfileButton;
