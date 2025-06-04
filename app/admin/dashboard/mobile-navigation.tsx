"use client";

import React from 'react';

// Define o tipo para as props do componente
interface MobileNavigationProps {
  activeTab: "nfts" | "users" | "jobs" | "settings" | "payments" | "learn2earn" | "notifications" | "systemActivity" | "accounting" | "ads" | "newsletter" | "marketing";
  isMobileMenuOpen: boolean;
  hasPermission: (permission: string) => boolean;
  activeSubTab: string | null;
  handleMobileMenuOptionClick: (tab: "nfts" | "users" | "jobs" | "settings" | "payments" | "learn2earn" | "notifications" | "systemActivity" | "accounting" | "ads" | "newsletter" | "marketing", subTab?: string | null) => void;
}

/**
 * Componente que encapsula a navegação móvel do dashboard admin
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab,
  isMobileMenuOpen,
  hasPermission,
  activeSubTab,
  handleMobileMenuOptionClick
}) => {
  if (!isMobileMenuOpen) {
    return null; // Não renderiza nada se o menu não estiver aberto
  }

  return (
    <ul className="space-y-2 w-full md:hidden">
      {/* Mostrar opção "Manage Users" apenas se tiver alguma permissão relacionada */}
      {(hasPermission('canManageUsers') || hasPermission('canApproveCompanies') || hasPermission('canEditContent')) && (
        <li>
          <div
            className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
              activeTab === "users" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
            }`}
            onClick={() => handleMobileMenuOptionClick("users")}
          >
            Manage Users
          </div>
          {activeTab === "users" && (
            <ul className="ml-4 mt-2 space-y-1 flex flex-col items-center">
              {/* Mostrar opção "Adms" apenas se tiver permissão para gerenciar usuários */}
              {hasPermission('canManageUsers') && (
                <li
                  className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                    activeSubTab === "adms" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => handleMobileMenuOptionClick("users", "adms")}
                >
                  Admins
                </li>
              )}
              {/* Lista de empregadores é visível para todos os níveis */}
              <li
                className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                  activeSubTab === "employers-list" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => handleMobileMenuOptionClick("users", "employers-list")}
              >
                Employers - List
              </li>
              {/* Mostrar opção "Create Employer" apenas se tiver permissão para aprovar empresas */}
              {hasPermission('canApproveCompanies') && (
                <li
                  className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                    activeSubTab === "employers-create" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => handleMobileMenuOptionClick("users", "employers-create")}
                >
                  Create Employer
                </li>
              )}
              {/* Mostrar opção "Approve Companies" apenas se tiver permissão para aprovar empresas */}
              {hasPermission('canApproveCompanies') && (
                <li
                  className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                    activeSubTab === "employers-approve" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => handleMobileMenuOptionClick("users", "employers-approve")}
                >
                  Approve Companies
                </li>
              )}
              {/* Mostrar opção "Seekers" apenas se tiver permissão para editar conteúdo */}
              {hasPermission('canEditContent') && (
                <li
                  className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                    activeSubTab === "seekers" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => handleMobileMenuOptionClick("users", "seekers")}
                >
                  Seekers
                </li>
              )}
            </ul>
          )}
        </li>
      )}
      
      {/* Mostrar opção "Manage NFTs" apenas se tiver permissão para editar conteúdo */}
      {hasPermission('canEditContent') && (
        <li>
          <div
            className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
              activeTab === "nfts" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
            }`}
            onClick={() => handleMobileMenuOptionClick("nfts")}
          >
            Manage NFTs
          </div>
          {activeTab === "nfts" && (
            <ul className="ml-4 mt-2 space-y-1 flex flex-col items-center">
              <li
                className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                  activeSubTab === "add" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => handleMobileMenuOptionClick("nfts", "add")}
              >
                Add NFT
              </li>
              <li
                className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                  activeSubTab === "delete" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => handleMobileMenuOptionClick("nfts", "delete")}
              >
                Delete NFT
              </li>
              <li
                className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                  activeSubTab === "deleteAll" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => handleMobileMenuOptionClick("nfts", "deleteAll")}
              >
                Delete All NFTs
              </li>
            </ul>
          )}
        </li>
      )}
      
      {/* Jobs Tab */}
      <li>
        <div
          className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
            activeTab === "jobs" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
          }`}
          onClick={() => handleMobileMenuOptionClick("jobs")}
        >
          Manage Jobs
        </div>
        {activeTab === "jobs" && (
          <ul className="ml-4 mt-2 space-y-1 flex flex-col items-center">
            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "list" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("jobs", "list")}
            >
              Jobs List
            </li>
            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "create" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("jobs", "create")}
            >
              Create Job
            </li>            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "prices" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("jobs", "prices")}
            >
              Job Plans
            </li>
          </ul>
        )}
      </li>
      
      {/* Mostrar opção "Settings" apenas se tiver permissão para acessar configurações */}
      {hasPermission('canAccessSettings') && (
        <li>
          <div
            className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
              activeTab === "settings" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
            }`}
            onClick={() => handleMobileMenuOptionClick("settings")} 
          >
            Settings
          </div>
          {activeTab === "settings" && (
            <ul className="ml-4 mt-2 space-y-1 flex flex-col items-center">
              {/* My Profile option */}
              <li
                className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                  activeSubTab === "profile" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                }`}
                onClick={() => handleMobileMenuOptionClick("settings", "profile")}
              >
                My Profile
              </li>
              {/* Admin Permissions option under Settings */}
              {hasPermission('canManageUsers') && (
                <li
                  className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                    activeSubTab === "permissions" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
                  }`}
                  onClick={() => handleMobileMenuOptionClick("settings", "permissions")}
                >
                  Manage Admins & Permissions
                </li>
              )}
            </ul>
          )}
        </li>
      )}

      {/* Payments Tab */}
      <li>
        <div
          className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
            activeTab === "payments" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
          }`}
          onClick={() => handleMobileMenuOptionClick("payments")}
        >
          Payments
        </div>
        {activeTab === "payments" && (
          <ul className="ml-4 mt-2 space-y-1 flex flex-col items-center">
            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "config" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("payments", "config")}
            >
              Payment Configuration
            </li>
          </ul>
        )}
      </li>

      {/* Airdrops tab for mobile */}
      <li>
        <div
          className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
            activeTab === "learn2earn" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
          }`}
          onClick={() => handleMobileMenuOptionClick("learn2earn")}
        >
          Airdrops
        </div>
        {activeTab === "learn2earn" && (
          <ul className="ml-4 mt-2 space-y-1 flex flex-col items-center">
            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "list" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("learn2earn", "list")}
            >
              Airdrop List
            </li>
            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "contracts" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("learn2earn", "contracts")}
            >
              Smart Contracts
            </li>
          </ul>
        )}
      </li>      {/* System Activity Tab */}
      <li>
        <div
          className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
            activeTab === "systemActivity" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
          }`}
          onClick={() => handleMobileMenuOptionClick("systemActivity")}
        >
          System Activity
        </div>
      </li>      {/* Notifications Tab */}
      <li>
        <div
          className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
            activeTab === "notifications" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
          }`}
          onClick={() => handleMobileMenuOptionClick("notifications")}
        >
          Notifications
        </div>
      </li>

      {/* Marketing Tab */}
      <li>
        <div
          className={`cursor-pointer p-2 rounded-lg text-center md:text-left text-sm ${
            activeTab === "marketing" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
          }`}
          onClick={() => handleMobileMenuOptionClick("marketing")}
        >
          Marketing
        </div>
        {activeTab === "marketing" && (
          <ul className="ml-4 mt-2 space-y-1 flex flex-col items-center">
            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "newsletter" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("marketing", "newsletter")}
            >
              Newsletter
            </li>
            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "socialmedia" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("marketing", "socialmedia")}
            >
              Social Media
            </li>
            <li
              className={`cursor-pointer p-1 rounded-lg text-center md:text-left text-sm w-3/4 ${
                activeSubTab === "partners" ? "bg-orange-500 text-white" : "bg-black/50 text-gray-300"
              }`}
              onClick={() => handleMobileMenuOptionClick("marketing", "partners")}
            >
              Partners
            </li>
          </ul>
        )}
      </li>
    </ul>
  );
};