import React from 'react';
import Link from 'next/link';

// Example ads for Web3/Blockchain/Crypto
const ads = [
  { 
    id: 1, 
    title: 'Web3 Developer Course', 
    url: '#', 
    description: 'Master blockchain, smart contracts & DApp development', 
    category: 'education',
    highlight: true
  },
  { 
    id: 2, 
    title: 'NFT Marketplace Launch', 
    url: '#', 
    description: 'Join the exclusive early access to our new NFT platform', 
    category: 'product',
    highlight: false
  },
  { 
    id: 3, 
    title: 'Blockchain Conference', 
    url: '#', 
    description: 'Global summit for Web3 builders - Virtual & In-person', 
    category: 'event',
    highlight: false
  },
  { 
    id: 4, 
    title: 'DAO Governance Tool', 
    url: '#', 
    description: 'Simplify your DAO operations with our new governance tool', 
    category: 'product',
    highlight: true
  },
];

export default function AdsSidebar() {
  return (
    <aside className="sticky top-24">
      <div className="bg-black/80 rounded-lg overflow-hidden border-t-2 border-orange-500/70">
        <div className="bg-gradient-to-r from-orange-900/70 to-black p-3 border-b border-orange-500/30">
          <h3 className="text-orange-400 font-bold text-lg">Featured</h3>
        </div>
        
        <div className="p-4">
          <ul className="space-y-4">
            {ads.map(ad => (
              <li key={ad.id} className={`rounded-md overflow-hidden ${ad.highlight ? 'border border-orange-500/30' : 'border border-gray-800'}`}>
                <a 
                  href={ad.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block hover:bg-black/60 transition-colors"
                >
                  <div className={`p-3 ${ad.highlight ? 'bg-black/60' : 'bg-black/40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-300 font-medium text-sm hover:text-orange-200">
                        {ad.title}
                      </span>
                      {ad.category === 'education' && (
                        <span className="bg-blue-900/40 text-blue-300 text-xs px-2 py-0.5 rounded-full">Course</span>
                      )}
                      {ad.category === 'product' && (
                        <span className="bg-green-900/40 text-green-300 text-xs px-2 py-0.5 rounded-full">Product</span>
                      )}
                      {ad.category === 'event' && (
                        <span className="bg-purple-900/40 text-purple-300 text-xs px-2 py-0.5 rounded-full">Event</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-2">{ad.description}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>        </div>
      </div>
    </aside>
  );
}
