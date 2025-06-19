// Admin component for managing partners
import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, addDoc, doc, deleteDoc, query, where, updateDoc } from "firebase/firestore";

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  description: string;
  website: string;
  createdAt: string;
}

interface VipCompany {
  id: string;
  companyName: string;
  logoUrl: string;
  email: string;
  website: string;
  description: string;
  responsibleName: string;
  responsiblePosition: string;
  isVipInvite: boolean;
  vipDiscount: number;
  createdAt: string;
  approvedAt: string;
}

const AdminPartnersManager: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [vipCompanies, setVipCompanies] = useState<VipCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<{companyId: string, currentDiscount: number} | null>(null);
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [newPartner, setNewPartner] = useState({
    name: "",
    logoUrl: "",
    description: "",
    website: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Mobile detection effect
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);
  
  useEffect(() => {
    fetchPartners();
    fetchVipCompanies();
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

  const fetchVipCompanies = async () => {
    setVipLoading(true);
    try {
      const companiesCollection = collection(db, "companies");
      const vipQuery = query(companiesCollection, where("isVipInvite", "==", true));
      const vipSnapshot = await getDocs(vipQuery);
      const vipCompaniesList = vipSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as VipCompany));
      
      setVipCompanies(vipCompaniesList);
    } catch (error) {
      console.error("Error fetching VIP companies:", error);
    } finally {
      setVipLoading(false);
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartner.name || !logoFile) {
      alert("Partner name and logo image are required");
      return;
    }
    setUploadingLogo(true);
    try {
      // Upload logo to Firebase Storage
      const storage = (await import("../../lib/firebase")).storage || (await import("firebase/storage"));
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const fileRef = ref(storage, `partners/${Date.now()}-${logoFile.name}`);
      await uploadBytes(fileRef, logoFile);
      const logoUrl = await getDownloadURL(fileRef);
      // Save partner with logoUrl
      await addDoc(collection(db, "partners"), {
        ...newPartner,
        logoUrl,
        createdAt: new Date().toISOString()
      });
      setNewPartner({ name: "", logoUrl: "", description: "", website: "" });
      setLogoFile(null);
      fetchPartners();
    } catch (error) {
      console.error("Error adding partner:", error);
      alert("Failed to add partner. Please try again.");
    } finally {
      setUploadingLogo(false);
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
  const handleDiscountClick = (companyId: string, currentDiscount: number) => {
    setEditingDiscount({ companyId, currentDiscount });
    setNewDiscount(currentDiscount);
  };

  const toggleCompanyExpansion = (companyId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const handleDiscountSave = async () => {
    if (!editingDiscount || newDiscount < 0 || newDiscount > 100) {
      alert("Please enter a valid discount percentage (0-100)");
      return;
    }

    setSavingDiscount(true);
    try {
      const companyRef = doc(db, "companies", editingDiscount.companyId);
      await updateDoc(companyRef, {
        vipDiscount: newDiscount
      });
      
      // Update local state
      setVipCompanies(prev => 
        prev.map(company => 
          company.id === editingDiscount.companyId 
            ? { ...company, vipDiscount: newDiscount }
            : company
        )
      );
      
      setEditingDiscount(null);
      setNewDiscount(0);
    } catch (error) {
      console.error("Error updating discount:", error);
      alert("Failed to update discount. Please try again.");
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleDiscountCancel = () => {
    setEditingDiscount(null);
    setNewDiscount(0);
  };
  return (
    <div className={`${isMobile ? 'p-2' : 'p-4 md:p-6'}`}>
      <h2 className={`${isMobile ? 'text-lg' : 'text-lg md:text-xl'} font-bold text-orange-400 mb-4`}>Partners Manager</h2>
      
      <div className={`space-y-4 ${isMobile ? '' : 'md:space-y-6'}`}>
        {/* Add Partner Form */}
        <div className={`bg-black/30 ${isMobile ? 'p-3' : 'p-4 md:p-6'} rounded-xl border border-gray-700`}>
          <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-orange-300 mb-3`}>Add New Partner</h3>
          <form onSubmit={handleAddPartner} className="space-y-3">
            <div>
              <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-300 mb-1`}>Partner Name*</label>
              <input
                type="text"
                className={`w-full ${isMobile ? 'px-2 py-2 text-xs' : 'px-3 py-2 text-sm'} bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none`}
                value={newPartner.name}
                onChange={(e) => setNewPartner({...newPartner, name: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-300 mb-1`}>Logo Image*</label>
              <input
                type="file"
                accept="image/*"
                className={`w-full ${isMobile ? 'px-2 py-2 text-xs' : 'px-3 py-2 text-sm'} bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none`}
                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                required
              />
              {uploadingLogo && <span className="text-xs text-orange-400 ml-2">Uploading...</span>}
            </div>
            
            <div>
              <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-300 mb-1`}>Website URL</label>
              <input
                type="text"
                className={`w-full ${isMobile ? 'px-2 py-2 text-xs' : 'px-3 py-2 text-sm'} bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none`}
                value={newPartner.website}
                onChange={(e) => setNewPartner({...newPartner, website: e.target.value})}
              />
            </div>
            
            <div>
              <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-300 mb-1`}>Description</label>
              <textarea
                className={`w-full ${isMobile ? 'px-2 py-2 text-xs' : 'px-3 py-2 text-sm'} bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none`}
                rows={isMobile ? 2 : 3}
                value={newPartner.description}
                onChange={(e) => setNewPartner({...newPartner, description: e.target.value})}
              />
            </div>
            
            <div>
              <button
                type="submit"
                className={`bg-orange-500 text-white ${isMobile ? 'px-3 py-2 text-xs' : 'px-4 py-2 text-sm'} rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow`}
                disabled={loading}
              >
                Add Partner
              </button>
            </div>
          </form>
        </div>
        
        {/* Partners List */}
        <div className={`bg-black/30 ${isMobile ? 'p-3' : 'p-4 md:p-6'} rounded-xl border border-gray-700`}>
          <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-orange-300 mb-3`}>Existing Partners</h3>
          
          {loading ? (
            <div className="text-center p-4">
              <span className={`text-gray-400 ${isMobile ? 'text-xs' : ''}`}>Loading partners...</span>
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center p-4 bg-black/20 rounded-lg">
              <span className={`text-gray-400 ${isMobile ? 'text-xs' : ''}`}>No partners added yet.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((partner) => (
                <div key={partner.id} className={`bg-black/40 rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-gray-700 flex items-center justify-between`}>
                  <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
                    <div className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} bg-black/50 rounded-md border border-gray-600 flex items-center justify-center overflow-hidden`}>
                      <img 
                        src={partner.logoUrl} 
                        alt={partner.name} 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/favicon2x.png'; // Fallback image
                        }}
                      />
                    </div>
                    <div>
                      <h4 className={`font-semibold text-orange-200 ${isMobile ? 'text-xs' : ''}`}>{partner.name}</h4>
                      {partner.website && (
                        <a 
                          href={partner.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={`${isMobile ? 'text-xs' : 'text-xs'} text-blue-400 hover:text-blue-300`}
                        >
                          {partner.website}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeletePartner(partner.id)}
                    className={`${isMobile ? 'text-xs px-1 py-1' : 'text-sm px-2 py-1'} text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded`}
                    title="Delete partner"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>        {/* VIP Companies Section */}
        <div className={`bg-black/30 ${isMobile ? 'p-3' : 'p-4 md:p-6'} rounded-xl border border-gray-700`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-orange-300`}>VIP Companies</h3>
            {vipCompanies.length > 0 && (
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} bg-orange-500/20 text-orange-400 px-2 py-1 rounded-md border border-orange-500/30`}>
                {vipCompanies.length} VIP {vipCompanies.length === 1 ? 'Company' : 'Companies'}
              </span>
            )}
          </div>
          
          {vipLoading ? (
            <div className="text-center p-4">
              <span className={`text-gray-400 ${isMobile ? 'text-xs' : ''}`}>Loading VIP companies...</span>
            </div>
          ) : vipCompanies.length === 0 ? (
            <div className="text-center p-4 bg-black/20 rounded-lg">
              <span className={`text-gray-400 ${isMobile ? 'text-xs' : ''}`}>No VIP companies registered yet.</span>
            </div>
          ) : (            <div className="space-y-3">
              {vipCompanies.map((vipCompany) => {
                const isExpanded = expandedCompanies.has(vipCompany.id);
                return (
                  <div key={vipCompany.id} className={`bg-black/40 rounded-lg ${isMobile ? 'p-2' : 'p-3'} border border-gray-700 transition-all duration-200 hover:border-orange-500/50 cursor-pointer`}>
                    <div 
                      className={`flex items-center justify-between`}
                      onClick={() => toggleCompanyExpansion(vipCompany.id)}
                    >
                      <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
                        <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-black/50 rounded-md border border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0`}>
                          <img 
                            src={vipCompany.logoUrl || '/favicon2x.png'} 
                            alt={vipCompany.companyName} 
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/favicon2x.png'; // Fallback image
                            }}
                          />
                        </div>
                        <div>
                          <h4 className={`font-semibold text-orange-200 ${isMobile ? 'text-xs' : 'text-sm'}`}>{vipCompany.companyName}</h4>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md border border-purple-500/30`}>
                          VIP
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDiscountClick(vipCompany.id, vipCompany.vipDiscount);
                          }}
                          className={`${isMobile ? 'text-xs' : 'text-sm'} bg-green-500/20 text-green-400 px-2 py-1 rounded-md border border-green-500/30 hover:bg-green-500/30 transition-colors cursor-pointer`}
                          title="Click to edit discount"
                        >
                          {vipCompany.vipDiscount}% OFF
                        </button>
                        <span className={`text-gray-400 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          ↓
                        </span>
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400 mt-3 pt-3 border-t border-gray-600`}>
                        <div className="flex items-center space-x-2 mb-2">
                          <span>{vipCompany.responsibleName}</span>
                          <span>•</span>
                          <span>{vipCompany.responsiblePosition}</span>
                        </div>
                        {vipCompany.website && (
                          <a 
                            href={vipCompany.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-400 hover:text-blue-300 break-all block mb-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vipCompany.website}
                          </a>
                        )}
                        {vipCompany.description && (
                          <p className="mt-1 text-gray-500 mb-2">{vipCompany.description}</p>
                        )}
                        <div className="flex flex-col space-y-1">
                          <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>
                            📧 {vipCompany.email}
                          </span>
                          <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>
                            📅 Joined: {new Date(vipCompany.approvedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
            {vipCompanies.length > 0 && (
            <div className={`mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg`}>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-400`}>
                ℹ️ VIP companies have exclusive benefits including custom lifetime discounts, 
                priority support, and commemorative NFTs. They appear in partner displays with special VIP designation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Discount Edit Modal */}
      {editingDiscount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleDiscountCancel}>
          <div 
            className={`bg-gray-900 border border-gray-700 rounded-xl ${isMobile ? 'p-4 mx-4 w-full max-w-sm' : 'p-6 w-96'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-orange-300 mb-4`}>
              Edit VIP Discount
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-300 mb-2`}>
                  Discount Percentage (0-100%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(Number(e.target.value))}
                  className={`w-full ${isMobile ? 'px-2 py-2 text-sm' : 'px-3 py-2 text-base'} bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none`}
                  placeholder="Enter discount percentage"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleDiscountSave}
                  disabled={savingDiscount}
                  className={`flex-1 bg-green-500 text-white ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-base'} rounded-lg hover:bg-green-600 disabled:opacity-60 font-semibold`}
                >
                  {savingDiscount ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleDiscountCancel}
                  className={`flex-1 bg-gray-600 text-white ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2 text-base'} rounded-lg hover:bg-gray-700 font-semibold`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartnersManager;
