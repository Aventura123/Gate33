"use client";

import React, { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

// Interface for Support Ticket
interface SupportTicket {
  id: string;
  userId: string;
  userEmail?: string;
  subject: string;
  description: string;
  status: 'pending' | 'open' | 'resolved';
  category: string;
  createdAt: string;
  updatedAt: string;
  acceptedBy?: string;
  acceptedByName?: string;
  acceptedAt?: string;
}

// Interface for Support Messages
interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName?: string;
  senderType: string;
  message: string;
  createdAt: string;
  isSystemMessage?: boolean;
  read?: boolean;
}

interface SupportPanelProps {
  userId: string;
  userType: 'company' | 'seeker';
  userName: string;
  userEmail?: string;
  notifications?: string[];
}

const SupportPanel: React.FC<SupportPanelProps> = ({
  userId,
  userType,
  userName,
  userEmail,
  notifications = []
}) => {
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [isSendingTicketMessage, setIsSendingTicketMessage] = useState(false);
  const [supportSectionActive, setSupportSectionActive] = useState<'list' | 'create' | 'detail'>('list');
  const [supportTab, setSupportTab] = useState<'tickets' | 'help'>('tickets');
  const [newTicketData, setNewTicketData] = useState({
    subject: '',
    description: '',
    category: 'general'
  });

  // Function to fetch support tickets
  const fetchSupportTickets = useCallback(async () => {
    if (!db || !userId) return;

    try {
      const ticketsCollection = collection(db, "supportTickets");
      const q = query(
        ticketsCollection, 
        where("userId", "==", userId),
        where("userType", "==", userType),
        orderBy("createdAt", "desc")
      );
      
      const ticketsSnapshot = await getDocs(q);
      const fetchedTickets: SupportTicket[] = ticketsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as SupportTicket));
      
      setSupportTickets(fetchedTickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
    }
  }, [db, userId, userType]);

  // Function to fetch ticket messages
  const fetchTicketMessages = useCallback(async (ticketId: string) => {
    if (!db || !ticketId) return;

    try {
      const messagesCollection = collection(db, "supportMessages");
      const q = query(
        messagesCollection,
        where("ticketId", "==", ticketId),
        orderBy("createdAt", "asc")
      );
      
      const messagesSnapshot = await getDocs(q);
      const fetchedMessages: SupportMessage[] = messagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as SupportMessage));
      
      setTicketMessages(fetchedMessages);
    } catch (error) {
      console.error("Error fetching ticket messages:", error);
    }
  }, [db]);

  // Function to create new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!db || !userId || !userName) {
      alert("You need to be logged in to create a support ticket.");
      return;
    }
    
    if (!newTicketData.subject || !newTicketData.description) {
      alert("Please fill in all required fields.");
      return;
    }
    
    try {
      const ticketData = {
        userId: userId,
        userType: userType,
        userEmail: userEmail || '',
        subject: newTicketData.subject,
        description: newTicketData.description,
        category: newTicketData.category,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "supportTickets"), ticketData);
      
      // Reset form
      setNewTicketData({
        subject: '',
        description: '',
        category: 'general'
      });
      
      // Refresh tickets list
      fetchSupportTickets();
      
      // Switch back to list view
      setSupportSectionActive('list');
      
      alert("Support ticket created successfully!");
    } catch (error) {
      console.error("Error creating support ticket:", error);
      alert("Failed to create support ticket. Please try again.");
    }
  };

  // Function to send a message in a ticket
  const handleSendTicketMessage = async (message: string) => {
    if (!db || !userId || !selectedTicketId || !message) return;
    
    setIsSendingTicketMessage(true);
    
    try {
      const messageData = {
        ticketId: selectedTicketId,
        senderId: userId,
        senderName: userName,
        senderType: userType,
        message: message,
        createdAt: serverTimestamp(),
        read: false,
      };

      await addDoc(collection(db, "supportMessages"), messageData);
      
      // Refresh messages
      fetchTicketMessages(selectedTicketId);
    } catch (error) {
      console.error("Error sending ticket message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSendingTicketMessage(false);
    }
  };

  // Function to select a ticket to view
  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setSelectedTicketId(ticket.id);
    setSupportSectionActive('detail');
    fetchTicketMessages(ticket.id);
  };

  // Set up real-time listeners for ticket messages
  useEffect(() => {
    if (!db || !selectedTicketId) return;

    const messagesCollection = collection(db, "supportMessages");
    const q = query(
      messagesCollection,
      where("ticketId", "==", selectedTicketId),
      orderBy("createdAt", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: SupportMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      } as SupportMessage));
      
      setTicketMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [db, selectedTicketId]);

  // Fetch tickets on mount
  useEffect(() => {
    fetchSupportTickets();
  }, [fetchSupportTickets]);

  return (
    <div className="bg-black/70 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-orange-500 mb-4 text-center">Support</h2>
      <div className="border-b border-orange-900/60 mb-6"></div>
      
      <div className="flex gap-6 mb-6 items-end border-b border-orange-900/60">
        <button
          className={`relative text-base font-semibold mr-2 transition-colors pb-1 ${supportTab === 'tickets' ? 'text-orange-500' : 'text-orange-300 hover:text-orange-400'}`}
          onClick={() => setSupportTab('tickets')}
        >
          My Tickets
          {supportTab === 'tickets' && (
            <span className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-orange-500 rounded" />
          )}
        </button>
        <button
          className={`relative text-base font-semibold transition-colors pb-1 ${supportTab === 'help' ? 'text-orange-500' : 'text-orange-300 hover:text-orange-400'}`}
          onClick={() => setSupportTab('help')}
        >
          Help Center
          {supportTab === 'help' && (
            <span className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-orange-500 rounded" />
          )}
        </button>
      </div>
      {supportTab === 'tickets' ? (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column: notifications + ticket list + new ticket button */}
          <div className="w-full md:w-1/3">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setSupportSectionActive('create')}
                className="bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                New Ticket
              </button>
            </div>
            {/* Notifications at the top */}
            {notifications.length > 0 && (
              <div className="mb-4">
                <ul className="space-y-2">
                  {notifications.map((notification, index) => (
                    <li key={index} className="bg-black/50 p-2 rounded text-gray-300 text-sm">
                      {notification}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Ticket list */}
            <div className="space-y-2">
              {supportTickets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎫</div>
                  <h3 className="text-xl font-medium text-white mb-2">No support tickets found</h3>
                  <p className="text-gray-300 text-sm">Create your first support ticket to get help from our team.</p>
                </div>
              ) : (
                supportTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`rounded-2xl card-orange-glow p-4 cursor-pointer transition-all duration-200 hover:scale-[1.025] focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      selectedTicketId === ticket.id ? 'ring-2 ring-orange-500' : ''
                    }`}
                    onClick={() => handleSelectTicket(ticket)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm mb-1">{ticket.subject}</div>
                        <div className="text-gray-400 text-xs mb-1">{ticket.category}</div>
                        <div className="text-gray-500 text-xs mb-2">Opened on: {new Date(ticket.createdAt).toLocaleDateString()}, {new Date(ticket.createdAt).toLocaleTimeString()}</div>
                        <div className="text-gray-300 text-xs mb-2 line-clamp-2">{ticket.description}</div>
                        <div className="mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            ticket.status === 'resolved' 
                              ? 'bg-green-500/20 text-green-400' 
                              : ticket.status === 'open' 
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {ticket.status === 'resolved' 
                              ? 'Resolved' 
                              : ticket.status === 'open' 
                              ? 'In Progress' 
                              : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Right column: ticket details or default message */}
          <div className="w-full md:w-2/3">
            {supportSectionActive === 'detail' && selectedTicket ? (
              <div className="bg-black/40 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-orange-500">Ticket Details</h3>
                  <button
                    onClick={() => setSupportSectionActive('list')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-4">
                  <div className="font-bold text-white text-lg mb-2">{selectedTicket.subject}</div>
                  <div className="text-orange-400 text-sm mb-1">Category: {selectedTicket.category}</div>
                  <div className="text-gray-500 text-xs mb-3">Opened on: {new Date(selectedTicket.createdAt).toLocaleDateString()}, {new Date(selectedTicket.createdAt).toLocaleTimeString()}</div>
                  <div className="text-gray-300 mb-4 p-3 bg-black/30 rounded-lg">{selectedTicket.description}</div>
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedTicket.status === 'resolved' 
                        ? 'bg-green-500/20 text-green-400' 
                        : selectedTicket.status === 'open' 
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedTicket.status === 'resolved' 
                        ? 'Resolved' 
                        : selectedTicket.status === 'open' 
                        ? 'In Progress' 
                        : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-orange-400 font-semibold mb-2">Messages</h4>
                  <div className="max-h-64 overflow-y-auto space-y-3 mb-4">
                    {ticketMessages.length === 0 ? (
                      <div className="text-gray-400">No messages yet.</div>
                    ) : (
                      ticketMessages.map(msg => (
                        <div key={msg.id} className={`p-2 rounded ${msg.senderType === userType ? 'bg-orange-900/30 text-orange-200' : msg.isSystemMessage ? 'bg-gray-800 text-gray-400' : 'bg-gray-700 text-white'}`}>
                          <div className="text-xs font-bold mb-1">{msg.senderName || msg.senderType}</div>
                          <div className="text-sm">{msg.message}</div>
                          <div className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* MESSAGE SENDING RESTRICTION */}
                  {selectedTicket.status !== 'open' || !selectedTicket.acceptedBy ? (
                    <div className="text-yellow-400 text-sm mt-4">
                      The chat will be available once the ticket is accepted by support.
                    </div>
                  ) : (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const input = form.elements.namedItem('message') as HTMLInputElement;
                        if (input.value.trim()) {
                          handleSendTicketMessage(input.value.trim());
                          input.value = '';
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="message"
                        type="text"
                        placeholder="Type your message..."
                        className="flex-1 p-2 rounded bg-black/30 border border-gray-700 text-white"
                        disabled={isSendingTicketMessage}
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                        disabled={isSendingTicketMessage}
                      >
                        Send
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : supportSectionActive === 'create' ? (
              <div className="bg-black/40 rounded-lg p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-orange-500">New Support Ticket</h3>
                  <button
                    onClick={() => setSupportSectionActive('list')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateTicket} className="space-y-6">
                  <div>
                    <label className="block text-orange-400 text-sm font-medium mb-2">Subject</label>
                    <input
                      type="text"
                      value={newTicketData.subject}
                      onChange={e => setNewTicketData({ ...newTicketData, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-orange-400 text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={newTicketData.description}
                      onChange={e => setNewTicketData({ ...newTicketData, description: e.target.value })}
                      placeholder="Provide detailed information about your issue or question"
                      className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm h-32 resize-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-orange-400 text-sm font-medium mb-2">Category</label>
                    <select
                      value={newTicketData.category}
                      onChange={e => setNewTicketData({ ...newTicketData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                    >
                      <option value="general">General Support</option>
                      <option value="payment">Payment & Billing</option>
                      <option value="technical">Technical Issues</option>
                      <option value="account">Account Management</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setSupportSectionActive('list')}
                      className="bg-gray-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl"
                    >
                      Submit Ticket
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-black/40 rounded-lg p-8 min-h-[400px]">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-medium text-white mb-2">Select a ticket to view details and chat.</h3>
                  <p className="text-gray-400 text-sm">Choose a support ticket from the list to see its details and chat with our support team.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl card-orange-glow p-6 hover:scale-[1.025] transition-transform duration-200">
              <h4 className="text-orange-400 font-bold text-lg mb-3">Getting Started</h4>
              <p className="text-gray-300 text-sm leading-relaxed">Learn how to post jobs, manage applications, and make the most of Gate33's Web3 job platform.</p>
            </div>
            <div className="rounded-2xl card-orange-glow p-6 hover:scale-[1.025] transition-transform duration-200">
              <h4 className="text-orange-400 font-bold text-lg mb-3">Payment & Billing</h4>
              <p className="text-gray-300 text-sm leading-relaxed">Understand our pricing plans, crypto payment methods, and escrow protection services.</p>
            </div>
            <div className="rounded-2xl card-orange-glow p-6 hover:scale-[1.025] transition-transform duration-200">
              <h4 className="text-orange-400 font-bold text-lg mb-3">Technical Support</h4>
              <p className="text-gray-300 text-sm leading-relaxed">Having technical issues? Find solutions to common problems and Web3 integration help.</p>
            </div>
            <div className="rounded-2xl card-orange-glow p-6 hover:scale-[1.025] transition-transform duration-200">
              <h4 className="text-orange-400 font-bold text-lg mb-3">Account Management</h4>
              <p className="text-gray-300 text-sm leading-relaxed">Manage your profile, wallet connections, team members, and account settings.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportPanel;
