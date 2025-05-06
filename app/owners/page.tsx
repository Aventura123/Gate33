"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../lib/firebase';
import { logSystem } from '../../utils/logSystem';

// Minimum ABI for NFT ownership verification (ERC-721)
const NFT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
];

// General configuration for NFT verification
const NFT_VERIFICATION_CONFIG = {
  enabled: true, // Flag to enable/disable verification
  contractAddress: "" // Empty address - will be verified by the backend
};

// Constant with the NFT ownership address - used for verification but hidden from the UI
const NFT_CONTRACT_ADDRESS = "0xF5C5e0C7A6EFe220B04857C2E4066ff7a005C354";

// Interface for messages
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any;
  read?: boolean; // Adding a read status field
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
}

export default function OwnersPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [hasNFT, setHasNFT] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingNFT, setIsCheckingNFT] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [fileUploads, setFileUploads] = useState<File[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const router = useRouter();

  // Check if the user is super_admin
  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "super_admin") {
      setIsSuperAdmin(true);
      setHasNFT(true); // Super admins have automatic access
    }
  }, []);

  // Listen for messages from Firestore when access is granted
  useEffect(() => {
    if (hasNFT || isSuperAdmin) {
      const messagesRef = collection(db, "ownerMessages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
      
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            content: data.content,
            timestamp: data.timestamp,
            attachments: data.attachments || []
          };
        });
        
        setMessages(newMessages);
      });
      
      return () => unsubscribe();
    }
  }, [hasNFT, isSuperAdmin]);

  // Load owner email preferences if available
  useEffect(() => {
    if (account && hasNFT && !isSuperAdmin) {
      const loadEmailPreference = async () => {
        try {
          const docRef = doc(db, "ownerPreferences", account!);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.email) {
              setOwnerEmail(data.email);
              setEmailNotificationsEnabled(data.notificationsEnabled || false);
            }
          } else {
            // No preferences found, show email input
            setShowEmailInput(true);
          }
        } catch (error) {
          console.error("Error loading email preferences:", error);
        }
      };
      
      loadEmailPreference();
    }
  }, [account, hasNFT, isSuperAdmin]);
  
  // Track unread messages
  useEffect(() => {
    if ((hasNFT || isSuperAdmin) && messages.length > 0) {
      // Check if user is owner or admin
      const currentUserId = isSuperAdmin ? localStorage.getItem("userId") : account;
      
      // Count messages not from current user and not marked as read
      const unreadCount = messages.filter(
        msg => msg.senderId !== currentUserId && !msg.read
      ).length;
      
      setUnreadMessages(unreadCount);
      
      // If there are unread messages and notifications are enabled, send notification
      if (unreadCount > 0 && (
        (isSuperAdmin && !document.hasFocus()) || 
        (!isSuperAdmin && emailNotificationsEnabled && ownerEmail)
      )) {
        // Send notification about unread messages
        sendUnreadMessagesNotification();
      }
    }
  }, [messages, hasNFT, isSuperAdmin, account, emailNotificationsEnabled, ownerEmail]);

  // Mark messages as read when viewed
  const markMessagesAsRead = async () => {
    if (!isSuperAdmin && !hasNFT) return;
    
    try {
      const currentUserId = isSuperAdmin ? localStorage.getItem("userId") : account;
      
      // Find messages that are not from current user and not marked as read
      const unreadMessages = messages.filter(
        msg => msg.senderId !== currentUserId && !msg.read
      );
      
      // Mark each message as read
      for (const msg of unreadMessages) {
        await updateDoc(doc(db, "ownerMessages", msg.id), {
          read: true
        });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };
  
  // Send notifications for unread messages
  const sendUnreadMessagesNotification = async () => {
    try {
      // Only notify once every 5 minutes (stored in session storage)
      const lastNotificationTime = sessionStorage.getItem('lastMessageNotificationTime');
      const now = Date.now();
      
      if (lastNotificationTime && (now - parseInt(lastNotificationTime)) < 5 * 60 * 1000) {
        return; // Don't notify if less than 5 minutes since last notification
      }
      
      const response = await fetch('/api/owners/message-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unreadCount: unreadMessages,
          walletAddress: isSuperAdmin ? null : account,
          recipientEmail: isSuperAdmin ? null : ownerEmail,
          isAdmin: isSuperAdmin,
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        // Store last notification time
        sessionStorage.setItem('lastMessageNotificationTime', now.toString());
      }
    } catch (error) {
      console.error("Error sending unread message notification:", error);
    }
  };

  // Function to connect wallet
  const connectWallet = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install it and try again.");
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const connectedAccount = accounts[0];
      setAccount(connectedAccount);
      
      // After connecting the wallet, verify NFT ownership
      await checkNFTOwnership(connectedAccount);
      
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      setErrorMessage(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to verify NFT ownership
  const checkNFTOwnership = async (walletAddress: string) => {
    setIsCheckingNFT(true);
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, provider);
      
      // Check the NFT balance of the connected wallet
      const balance = await nftContract.balanceOf(walletAddress);
      const hasOwnership = balance.gt(0);
      
      setHasNFT(hasOwnership);
      
      // If they have the NFT, send an email alert
      if (hasOwnership) {
        await sendOwnerAlert(walletAddress);
      }
      
      return hasOwnership;
      
    } catch (error: any) {
      console.error("Error verifying NFT ownership:", error);
      setErrorMessage(`Failed to verify NFT ownership: ${error.message}`);
      setHasNFT(false);
      return false;
    } finally {
      setIsCheckingNFT(false);
    }
  };

  // Function to send email alert when an owner connects
  const sendOwnerAlert = async (ownerAddress: string) => {
    try {
      // API call to send email
      const response = await fetch('/api/owners/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ownerAddress,
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send notification");
      }
      
      // System log
      await logSystem.info(`Owner connected: ${ownerAddress}`, {
        ownerAddress,
        action: "owner_connected",
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Error sending owner alert:", error);
      // Does not interrupt the main flow, just logs the error
    }
  };

  // Function to send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const senderId = isSuperAdmin ? localStorage.getItem("userId") : account;
      const senderName = isSuperAdmin ? localStorage.getItem("userName") : `Owner (${account?.substring(0, 6)}...)`;
      
      const attachments = await Promise.all(
        fileUploads.map(async (file) => {
          const storage = getStorage();
          const fileRef = ref(storage, `owner-messages/${Date.now()}-${file.name}`);
          
          await uploadBytes(fileRef, file);
          const downloadUrl = await getDownloadURL(fileRef);
          
          return {
            name: file.name,
            url: downloadUrl,
            type: file.type
          };
        })
      );
      
      await addDoc(collection(db, "ownerMessages"), {
        senderId,
        senderName,
        content: newMessage,
        timestamp: new Date(),
        attachments
      });
      
      setNewMessage('');
      setFileUploads([]);
      
    } catch (error) {
      console.error("Error sending message:", error);
      setErrorMessage("Failed to send message. Try again.");
    }
  };

  // Function to handle file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to Array
      const newFiles = Array.from(e.target.files);
      
      // Check allowed types
      const allowedTypes = [
        'application/pdf', 
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      const validFiles = newFiles.filter(file => allowedTypes.includes(file.type));
      
      if (validFiles.length !== newFiles.length) {
        setErrorMessage("Some files were ignored. Only PDF, Excel and images are allowed.");
      }
      
      setFileUploads([...fileUploads, ...validFiles]);
    }
  };
  
  // Function to remove a file from the upload list
  const removeFile = (index: number) => {
    const newFileUploads = [...fileUploads];
    newFileUploads.splice(index, 1);
    setFileUploads(newFileUploads);
  };

  // Format date for friendly display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  // Save owner email preference
  const saveEmailPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ownerEmail || !account) return;
    
    try {
      const docRef = doc(db, "ownerPreferences", account);
      await setDoc(docRef, {
        email: ownerEmail,
        notificationsEnabled: emailNotificationsEnabled,
        updatedAt: new Date()
      }, { merge: true });
      
      setShowEmailInput(false);
      
      // Send test notification if enabled
      if (emailNotificationsEnabled) {
        await fetch('/api/owners/test-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: ownerEmail,
            walletAddress: account
          }),
        });
      }
    } catch (error) {
      console.error("Error saving email preference:", error);
      setErrorMessage("Failed to save email preference. Please try again.");
    }
  };

  // Toggle email notification settings display
  const toggleEmailSettings = () => {
    setShowEmailInput(!showEmailInput);
  };

  // Render access denied area
  const renderAccessDenied = () => {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-8 max-w-md w-full text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-6">
            You do not own the required ownership NFT to access this area.
          </p>
        </div>
      </div>
    );
  };

  // Render chat area
  const renderChat = () => {
    return (
      <div className="flex flex-col rounded-lg overflow-hidden h-[calc(100vh-200px)] mx-auto max-w-4xl border border-orange-500/30 bg-black/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-900/50 to-black p-4 border-b border-orange-500/30">
          <h2 className="text-xl font-bold text-orange-300">
            Owners Communication
          </h2>
          <p className="text-sm text-gray-300">
            {isSuperAdmin 
              ? "Secure communication channel with ownership NFT holders" 
              : "Secure communication channel with administrators"}
          </p>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-zinc-900 to-black">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 my-8">
              No messages found. Start the conversation.
            </p>
          ) : (
            messages.map(message => (
              <div 
                key={message.id} 
                className={`mb-4 max-w-[80%] ${
                  message.senderId === (isSuperAdmin ? localStorage.getItem("userId") : account)
                    ? "ml-auto bg-orange-900/30 border-orange-500/30"
                    : "mr-auto bg-zinc-800/50 border-gray-700/30"
                } p-3 rounded-lg border`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-orange-300">{message.senderName}</span>
                  <span className="text-xs text-gray-500">{formatDate(message.timestamp)}</span>
                </div>
                <p className="text-white whitespace-pre-wrap break-words">{message.content}</p>
                
                {/* Render attachments, if any */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700/30">
                    {message.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {attachment.type.includes("image") ? "📷" : attachment.type.includes("pdf") ? "📄" : "📊"}
                        </span>
                        <a 
                          href={attachment.url}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:underline truncate"
                        >
                          {attachment.name}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Files upload area */}
        {fileUploads.length > 0 && (
          <div className="p-2 bg-zinc-800 border-t border-gray-700/30">
            <p className="text-xs text-gray-400 mb-1">Files to send:</p>
            <div className="flex flex-wrap gap-2">
              {fileUploads.map((file, index) => (
                <div key={index} className="flex items-center gap-1 bg-zinc-700 rounded px-2 py-1">
                  <span className="text-xs text-white truncate max-w-[120px]">{file.name}</span>
                  <button 
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Message input */}
        <div className="p-3 bg-zinc-900 border-t border-gray-700">
          <div className="flex gap-2">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 cursor-pointer flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </label>
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 focus:border-orange-500 focus:outline-none resize-none text-white"
                rows={2}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() && fileUploads.length === 0}
              className="px-4 rounded bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 disabled:opacity-50 text-white"
            >
              Send
            </button>
          </div>
          {errorMessage && <p className="text-red-400 text-xs mt-2">{errorMessage}</p>}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="pt-20 sm:pt-24 min-h-screen bg-gradient-to-b from-black via-zinc-900 to-orange-950 text-white p-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 text-center">
            <span className="bg-gradient-to-r from-orange-400 via-orange-600 to-yellow-400 bg-clip-text text-transparent">
              Owners Portal
            </span>
          </h1>
          
          <p className="text-gray-300 text-center mb-8 max-w-xl mx-auto">
            Exclusive area for holders of the Gate33 ownership NFT token. 
            Connect your wallet to verify your access.
          </p>
          
          {/* Connection status area */}
          {!account && !isSuperAdmin ? (
            <div className="flex flex-col items-center mb-8">
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
              {errorMessage && (
                <p className="text-red-400 mt-3 text-center">{errorMessage}</p>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-orange-500/20 rounded-lg p-4 mb-8 flex flex-col sm:flex-row justify-between items-center">
              {isSuperAdmin ? (
                <div className="text-center sm:text-left mb-4 sm:mb-0">
                  <p className="text-orange-400 font-medium">Connected as Super Admin</p>
                  <p className="text-sm text-gray-400">You have full access to the owners portal</p>
                </div>
              ) : (
                <>
                  <div className="text-center sm:text-left mb-4 sm:mb-0">
                    <p className="text-orange-400 font-medium">Wallet Connected</p>
                    <p className="text-sm text-gray-400">{account}</p>
                  </div>
                  <div className="flex items-center">
                    {isCheckingNFT ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-300">Verifying NFT...</span>
                      </div>
                    ) : hasNFT === true ? (
                      <div className="flex items-center text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>NFT verified - Access granted</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>NFT not found - Access denied</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Main content - Chat or Access Denied */}
          {account || isSuperAdmin ? (
            hasNFT || isSuperAdmin ? (
              <>
                {/* Email notification settings for NFT owners */}
                {hasNFT && !isSuperAdmin && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center">
                      <button 
                        onClick={toggleEmailSettings}
                        className="text-orange-400 text-sm font-medium flex items-center gap-1 hover:text-orange-300 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {showEmailInput ? "Hide notification settings" : "Email notification settings"}
                      </button>
                      
                      {ownerEmail && emailNotificationsEnabled && !showEmailInput && (
                        <div className="text-sm text-green-500 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Notifications enabled
                        </div>
                      )}
                    </div>
                    
                    {showEmailInput && (
                      <div className="mt-3 p-4 bg-zinc-900/70 rounded-lg border border-orange-500/30">
                        <form onSubmit={saveEmailPreference} className="space-y-3">
                          <div>
                            <label htmlFor="email-input" className="block text-sm font-medium text-gray-300 mb-1">
                              Email address for notifications
                            </label>
                            <input
                              id="email-input"
                              type="email"
                              value={ownerEmail}
                              onChange={(e) => setOwnerEmail(e.target.value)}
                              className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                              placeholder="Enter your email address"
                              required
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              We'll use this email to notify you about unread messages from admins.
                            </p>
                          </div>
                          
                          <div className="flex items-center">
                            <input
                              id="notifications-checkbox"
                              type="checkbox"
                              checked={emailNotificationsEnabled}
                              onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                              className="h-4 w-4 text-orange-600 bg-zinc-700 rounded border-zinc-600"
                            />
                            <label htmlFor="notifications-checkbox" className="ml-2 block text-sm text-gray-300">
                              Enable email notifications for new messages
                            </label>
                          </div>
                          
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setShowEmailInput(false)}
                              className="px-4 py-2 text-gray-300 hover:text-white mr-2"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded"
                            >
                              Save preferences
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
                {renderChat()}
              </>
            ) : renderAccessDenied()
          ) : null}
        </div>
      </div>
    </Layout>
  );
}