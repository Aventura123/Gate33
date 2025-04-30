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
  
  return (
    <div className="bg-black text-white p-6 rounded-lg shadow-lg border border-orange-500/20">
      <h2 className="text-2xl font-bold text-orange-500 mb-6">Advertisement Manager</h2>
      
      {/* Error and success messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-white p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/50 border border-green-500 text-white p-4 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      {/* Form to add new advertisement */}
      <div className="bg-gray-900/80 p-4 rounded-lg mb-8 border border-orange-500/20">
        <h3 className="text-xl font-semibold text-orange-400 mb-4">Add New Advertisement</h3>
        
        <form onSubmit={handleAddAd} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={newAd.title}
              onChange={handleInputChange}
              className="w-full p-2 bg-black border border-orange-500/30 rounded text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-1">Destination URL</label>
            <input
              type="url"
              name="linkUrl"
              value={newAd.linkUrl}
              onChange={handleInputChange}
              className="w-full p-2 bg-black border border-orange-500/30 rounded text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-1">Image</label>
            <input
              type="file"
              id="adImage"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 bg-black border border-orange-500/30 rounded text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-500 file:text-white hover:file:bg-orange-600"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Recommended size: 320x200px</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Priority</label>
              <input
                type="number"
                name="priority"
                value={newAd.priority}
                min="1"
                max="10"
                onChange={handleInputChange}
                className="w-full p-2 bg-black border border-orange-500/30 rounded text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">Higher number = higher priority</p>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-1">Frequency (min)</label>
              <input
                type="number"
                name="displayFrequency"
                value={newAd.displayFrequency}
                min="5"
                onChange={handleInputChange}
                className="w-full p-2 bg-black border border-orange-500/30 rounded text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1">Minutes between displays</p>
            </div>
            
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  checked={newAd.active}
                  onChange={handleInputChange}
                  className="mr-2 h-5 w-5 accent-orange-500"
                />
                <span className="text-gray-300">Active</span>
              </label>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Add Advertisement'}
            </button>
          </div>
        </form>
      </div>
      
      {/* List of existing advertisements */}
      <div>
        <h3 className="text-xl font-semibold text-orange-400 mb-4">Existing Advertisements</h3>
        
        {loading && <p className="text-gray-400">Loading advertisements...</p>}
        
        {!loading && ads.length === 0 && (
          <p className="text-gray-400">No advertisements registered.</p>
        )}
        
        <div className="space-y-4">
          {ads.map((ad) => (
            <div key={ad.id} className="bg-gray-900/80 border border-orange-500/20 rounded-lg overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/4 p-4">
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-auto object-cover rounded adImage"
                  />
                </div>
                
                <div className="md:w-3/4 p-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-lg font-semibold text-orange-400">{ad.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${ad.active ? 'bg-orange-900/50 text-orange-400 border border-orange-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                      {ad.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-sm mt-1 break-all">
                    <span className="font-medium">Link:</span> {ad.linkUrl}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-300">
                    <div>
                      <span className="font-medium">Priority:</span> {ad.priority}
                    </div>
                    <div>
                      <span className="font-medium">Frequency:</span> {ad.displayFrequency} min
                    </div>
                    <div>
                      <span className="font-medium">Created on:</span> {' '}
                      {ad.createdAt && new Date(ad.createdAt.seconds * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex mt-4 space-x-2">
                    <button
                      onClick={() => toggleActive(ad.id!, ad.active)}
                      className={`px-3 py-1 rounded text-sm ${
                        ad.active 
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-100' 
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      } transition-colors`}
                    >
                      {ad.active ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <button
                      onClick={() => deleteAd(ad.id!)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdManager;