'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

// Interface for the advertisement object
interface Advertisement {
  id?: string;
  imageUrl: string;
  linkUrl: string;
  title: string;
  active: boolean;
  priority: number;
  createdAt: any;
  displayFrequency: number;
}

const AdManager: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [expandedAds, setExpandedAds] = useState<string[]>([]);
  
  // State for new advertisement
  const [newAd, setNewAd] = useState<{
    title: string;
    linkUrl: string;
    active: boolean;
    priority: number;
    displayFrequency: number;
    imageFile: File | null;
  }>({
    title: '',
    linkUrl: '',
    active: true,
    priority: 1,
    displayFrequency: 30,
    imageFile: null
  });
  
  // Fetch existing advertisements
  const fetchAds = async () => {
    setLoading(true);
    try {
      const adsRef = collection(db, 'advertisements');
      const q = query(adsRef);
      const querySnapshot = await getDocs(q);
      
      const adList: Advertisement[] = [];
      querySnapshot.forEach((doc) => {
        adList.push({
          id: doc.id,
          ...doc.data() as Advertisement
        });
      });
      
      setAds(adList);
    } catch (error) {
      console.error('Error fetching advertisements:', error);
      setError('Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };
  
  // Load advertisements when component mounts
  useEffect(() => {
    fetchAds();
  }, []);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setNewAd({
      ...newAd,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseInt(value) 
          : value
    });
  };
  
  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewAd({
        ...newAd,
        imageFile: e.target.files[0]
      });
    }
  };
  
  // Add new advertisement
  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!newAd.imageFile) {
        throw new Error('Please select an image for the advertisement');
      }
      
      // 1. Upload the image to Firebase Storage
      const storageRef = ref(storage, `ads/${Date.now()}_${newAd.imageFile.name}`);
      await uploadBytes(storageRef, newAd.imageFile);
      
      // 2. Get the image URL
      const imageUrl = await getDownloadURL(storageRef);
      
      // 3. Create document in Firestore
      const adData: Omit<Advertisement, 'id'> = {
        title: newAd.title,
        linkUrl: newAd.linkUrl,
        imageUrl,
        active: newAd.active,
        priority: newAd.priority,
        displayFrequency: newAd.displayFrequency,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'advertisements'), adData);
      
      // 4. Clear form and update list
      setNewAd({
        title: '',
        linkUrl: '',
        active: true,
        priority: 1,
        displayFrequency: 30,
        imageFile: null
      });
      
      // Reset file input - using a trick with event
      const fileInput = document.getElementById('adImage') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      setSuccess('Advertisement added successfully!');
      fetchAds();
    } catch (error) {
      console.error('Error adding advertisement:', error);
      setError(`Failed to add advertisement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Update advertisement status
  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'advertisements', id), {
        active: !currentActive
      });
      
      // Update local list
      setAds(ads.map(ad => 
        ad.id === id ? { ...ad, active: !currentActive } : ad
      ));
      
      setSuccess(`Advertisement status changed successfully!`);
    } catch (error) {
      console.error('Error updating advertisement status:', error);
      setError('Failed to update advertisement status');
    }
  };
    // Delete an advertisement
  const deleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    
    try {
      await deleteDoc(doc(db, 'advertisements', id));
      
      // Update local list
      setAds(ads.filter(ad => ad.id !== id));
      
      setSuccess('Advertisement deleted successfully!');
    } catch (error) {
      console.error('Error deleting advertisement:', error);
      setError('Failed to delete advertisement');
    }
  };
  
  // Toggle expand/collapse ad details
  const toggleExpandAd = (id: string) => {
    setExpandedAds(prev => 
      prev.includes(id) 
        ? prev.filter(adId => adId !== id) 
        : [...prev, id]
    );
  };
  
  // Handle pagination
  const totalPages = Math.ceil(ads.length / 10);
  
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };
  return (
    <div>
      {/* Error and success messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
          {success}
        </div>
      )}{/* Form to add new advertisement */}
      <div className="bg-black/30 p-4 md:p-6 rounded-xl mb-6 md:mb-10 border border-gray-700 hover:border-orange-500 transition-colors">
        
        <form onSubmit={handleAddAd} className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Title</label>            <input
              type="text"
              name="title"
              value={newAd.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Destination URL</label>            <input
              type="url"
              name="linkUrl"
              value={newAd.linkUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Image</label>            <input
              type="file"
              id="adImage"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-orange-500 file:text-white file:text-sm hover:file:bg-orange-600"
              required
            /><p className="text-xs text-gray-400 mt-1">Recommended size: 320x200px</p>
          </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Priority</label>              <input
                type="number"
                name="priority"
                value={newAd.priority}
                min="1"
                max="10"
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Higher number = higher priority</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">Frequency (min)</label><input
                type="number"
                name="displayFrequency"
                value={newAd.displayFrequency}
                min="5"
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Minutes between displays</p>
            </div>
          </div>
          
          <div className="flex items-center mt-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="active"
                checked={newAd.active}
                onChange={handleInputChange}
                className="mr-2 h-5 w-5 accent-orange-500"
              />
              <span className="text-gray-300 text-sm font-medium">Active</span>
            </label>
          </div>
            <div className="mt-6 md:mt-8">            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm w-full md:w-auto"
            >
              {loading ? 'Saving...' : 'Add Advertisement'}
            </button>
          </div>
        </form>
      </div>
        {/* List of existing advertisements */}      
      <div className="mt-6 md:mt-10">
        <h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">Advertisement List</h3>
        
        {loading && <p className="text-gray-400 text-base">Loading advertisements...</p>}
        
        {!loading && ads.length === 0 && (
          <p className="text-gray-400 text-base">No advertisements registered.</p>
        )}
        
        <div className="space-y-3 md:space-y-4">
          {ads.slice(currentPage * 10, (currentPage + 1) * 10).map((ad) => (            <div key={ad.id} className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-xl overflow-hidden transition-colors">
              <div 
                className="flex justify-between items-center p-3 cursor-pointer" 
                onClick={() => toggleExpandAd(ad.id!)}
              >
                <div className="flex items-center space-x-2">
                  {expandedAds.includes(ad.id!) ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  <h4 className="text-sm md:text-base font-bold text-orange-400">{ad.title}</h4>
                </div>
                <span className={`px-1.5 md:px-2 py-0.5 rounded-full text-xs ${ad.active ? 'bg-orange-900/50 text-orange-300 border border-orange-700' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                  {ad.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {expandedAds.includes(ad.id!) && (
                <div className="border-t border-gray-700 p-3 md:p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-1/4">
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-full h-auto object-cover rounded-lg shadow adImage"
                      />
                    </div>
                    <div className="md:w-3/4">
                      <p className="text-gray-300 text-xs mt-1 md:mt-0 break-all">
                        <span className="font-medium">Link:</span> {ad.linkUrl}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-1 md:gap-2 mt-2 md:mt-3 text-xs text-gray-300">
                        <div>
                          <span className="font-medium text-orange-300">Priority:</span> {ad.priority}
                        </div>
                        <div>
                          <span className="font-medium text-orange-300">Frequency:</span> {ad.displayFrequency} min
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium text-orange-300">Created on:</span> {' '}
                          {ad.createdAt && new Date(ad.createdAt.seconds * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-wrap mt-3 md:mt-4 gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(ad.id!, ad.active);
                          }}
                          className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold ${
                            ad.active 
                              ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' 
                              : 'bg-orange-500 hover:bg-orange-600 text-white'
                          }`}
                        >
                          {ad.active ? 'Deactivate' : 'Activate'}
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAd(ad.id!);
                          }}
                          className="px-2 md:px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-md text-xs text-white font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>          ))}
        </div>
        
        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center space-x-4">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="px-3 py-1.5 bg-black/50 border border-gray-700 rounded-md text-white disabled:opacity-40 text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Previous
            </button>
            
            <span className="text-gray-300 text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 bg-black/50 border border-gray-700 rounded-md text-white disabled:opacity-40 text-sm flex items-center"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdManager;