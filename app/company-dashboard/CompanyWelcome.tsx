import React from "react";

interface CompanyWelcomeProps {
  name?: string;
  industry?: string;
  country?: string;
  responsiblePerson?: string;
  isMobile?: boolean; // Adicionado para detectar mobile
}

const CompanyWelcome: React.FC<CompanyWelcomeProps> = ({ name = '', industry = '', country = '', responsiblePerson = '', isMobile = false }) => {
  return (
    <div className={`bg-black/70 ${isMobile ? 'p-2 mt-6' : 'p-10'} rounded-lg shadow-lg text-center`}>
      <h2 className={`${isMobile ? 'text-lg' : 'text-3xl'} font-semibold text-orange-500 ${isMobile ? 'mb-1' : 'mb-4'}`}>Welcome back, {responsiblePerson || name}!</h2>
      <div className={`${isMobile ? 'text-sm' : 'text-lg'} text-gray-200 ${isMobile ? 'mb-0.5' : 'mb-2'} font-bold text-orange-400`}>{name}</div>
      <div className={`${isMobile ? 'text-xs' : 'text-md'} text-gray-300 ${isMobile ? 'mb-0.5' : 'mb-2'}`}>{industry || 'N/A'}</div>
      <div className={`${isMobile ? 'text-xs' : 'text-md'} text-gray-300 ${isMobile ? 'mb-0.5' : 'mb-2'}`}>{country || 'N/A'}</div>
      <p className={`${isMobile ? 'mt-3 text-xs' : 'mt-6 text-sm'} text-gray-400`}>Manage your company profile, jobs, and micro-tasks using the menu on the left.</p>
    </div>
  );
};

export default CompanyWelcome;
