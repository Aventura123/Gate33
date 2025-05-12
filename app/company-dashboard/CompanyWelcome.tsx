import React from "react";

interface CompanyWelcomeProps {
  name?: string;
  industry?: string;
  country?: string;
  responsiblePerson?: string;
}

const CompanyWelcome: React.FC<CompanyWelcomeProps> = ({ name = '', industry = '', country = '', responsiblePerson = '' }) => {
  return (
    <div className="bg-black/70 p-10 rounded-lg shadow-lg text-center">
      <h2 className="text-3xl font-semibold text-orange-500 mb-4">Welcome back, {responsiblePerson || name}!</h2>
      <p className="text-lg text-gray-200 mb-2">Company: <span className="font-bold text-orange-400">{name}</span></p>
      <p className="text-md text-gray-300 mb-2">Industry: <span className="text-orange-300">{industry || 'N/A'}</span></p>
      <p className="text-md text-gray-300 mb-2">Country: <span className="text-orange-300">{country || 'N/A'}</span></p>
      <p className="mt-6 text-gray-400">Manage your company profile, jobs, and micro-tasks using the menu on the left.</p>
    </div>
  );
};

export default CompanyWelcome;
