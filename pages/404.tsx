import React from 'react';
import Link from 'next/link';

// Componente 404 - corrigido para o Netlify
const Custom404: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-6">The page you are looking for does not exist or has been moved.</p>
      <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition duration-200">
        Back to Homepage
      </Link>
    </div>
  );
};

export default Custom404;
