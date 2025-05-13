import React from 'react';
import Link from 'next/link';

interface DevNoticePopupProps {
  onClose: () => void;
}

const DevNoticePopup: React.FC<DevNoticePopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="backdrop-blur-md bg-black/70 border border-orange-500 rounded-xl shadow-xl p-8 max-w-md w-full relative animate-fade-in">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-orange-400 text-2xl font-bold focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-orange-500 mb-4 text-center">Project in Development</h2>
        <p className="text-gray-200 mb-4 text-center">
          Gate33 is currently under active development. Some features may be unavailable or may not work as expected. We appreciate your visit and your patience as we work to launch everything as soon as possible!
        </p>
        <p className="text-gray-300 mb-6 text-center">
          If you want to support the project, you can donate via our <Link href="/donate" className="text-orange-400 underline hover:text-orange-300">donation page</Link>.
        </p>
        <div className="flex justify-center">
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-lg shadow"
            onClick={onClose}
          >
            OK, Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevNoticePopup;
