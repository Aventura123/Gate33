// Admin component for managing partners
import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, addDoc, doc, deleteDoc } from "firebase/firestore";

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  website: string;
  createdAt: string;
}

const AdminPartnersManager: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: "",
    logoUrl: "",
    description: "",
    website: ""
  });
  
  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const partnersCollection = collection(db, "partners");
      const partnerSnapshot = await getDocs(partnersCollection);
      const partnersList = partnerSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Partner));
      
      setPartners(partnersList);
    } catch (error) {
      console.error("Error fetching partners:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPartner.name || !newPartner.logoUrl) {
      alert("Partner name and logo URL are required");
      return;
    }

    try {
      await addDoc(collection(db, "partners"), {
        ...newPartner,
        createdAt: new Date().toISOString()
      });
      
      // Reset form
      setNewPartner({
        name: "",
        logoUrl: "",
        description: "",
        website: ""
      });
      
      // Refresh partners list
      fetchPartners();
    } catch (error) {
      console.error("Error adding partner:", error);
      alert("Failed to add partner. Please try again.");
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this partner?")) return;
    
    try {
      const partnerRef = doc(db, "partners", id);
      await deleteDoc(partnerRef);
      
      // Refresh partners list
      fetchPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
      alert("Failed to delete partner. Please try again.");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Partners Manager</h2>
      
      <div className="space-y-4 md:space-y-6">
        {/* Add Partner Form */}
        <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700">
          <h3 className="text-base font-semibold text-orange-300 mb-3">Add New Partner</h3>
          <form onSubmit={handleAddPartner} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Partner Name*</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                value={newPartner.name}
                onChange={(e) => setNewPartner({...newPartner, name: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Logo URL*</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                value={newPartner.logoUrl}
                onChange={(e) => setNewPartner({...newPartner, logoUrl: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Website URL</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                value={newPartner.website}
                onChange={(e) => setNewPartner({...newPartner, website: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
                rows={3}
                value={newPartner.description}
                onChange={(e) => setNewPartner({...newPartner, description: e.target.value})}
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm"
                disabled={loading}
              >
                Add Partner
              </button>
            </div>
          </form>
        </div>
        
        {/* Partners List */}
        <div className="bg-black/30 p-4 md:p-6 rounded-xl border border-gray-700">
          <h3 className="text-base font-semibold text-orange-300 mb-3">Existing Partners</h3>
          
          {loading ? (
            <div className="text-center p-4">
              <span className="text-gray-400">Loading partners...</span>
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center p-4 bg-black/20 rounded-lg">
              <span className="text-gray-400">No partners added yet.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((partner) => (
                <div key={partner.id} className="bg-black/40 rounded-lg p-3 border border-gray-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-black/50 rounded-md border border-gray-600 flex items-center justify-center overflow-hidden">
                      <img 
                        src={partner.logoUrl} 
                        alt={partner.name} 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo2.png'; // Fallback image
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-200">{partner.name}</h4>
                      {partner.website && (
                        <a 
                          href={partner.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          {partner.website}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeletePartner(partner.id)}
                    className="text-sm px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                    title="Delete partner"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPartnersManager;
