import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ethers } from "ethers";
import Learn2EarnTestButton from "./Learn2EarnTestButton";

// Helper for formatting Firestore timestamps (should match dashboard usage)
function formatFirestoreTimestamp(ts: any) {
  if (!ts) return "-";
  if (typeof ts === "string") return new Date(ts).toLocaleString();
  if (ts.toDate) return ts.toDate().toLocaleString();
  return String(ts);
}

const NETWORK_OPTIONS = [
  { value: "sepolia", label: "Sepolia (Ethereum Testnet)" },
  { value: "mumbai", label: "Mumbai (Polygon Testnet)" },
  { value: "bscTestnet", label: "BSC Testnet" },
  { value: "ethereum", label: "Ethereum Mainnet" },
  { value: "polygon", label: "Polygon Mainnet" },
  { value: "bsc", label: "Binance Smart Chain" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "avalanche", label: "Avalanche" },
];

const Learn2EarnContractsPanel: React.FC = () => {
  const [networkContract, setNetworkContract] = useState({
    network: "sepolia",
    contractAddress: "",
    type: "",
  });
  const [networkContracts, setNetworkContracts] = useState<any[]>([]);
  const [isAddingContract, setIsAddingContract] = useState(false);
  const [contractActionError, setContractActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchNetworkContracts();
    // eslint-disable-next-line
  }, []);

  const fetchNetworkContracts = async () => {
    try {
      if (!db) throw new Error("Firestore is not initialized.");
      const settingsDocRef = doc(db, "settings", "learn2earn");
      const settingsSnapshot = await getDoc(settingsDocRef);
      if (!settingsSnapshot.exists()) {
        setNetworkContracts([]);
        return;
      }
      const contracts = settingsSnapshot.data().contracts || [];
      setNetworkContracts(contracts);
    } catch (error) {
      setContractActionError("Failed to fetch network contracts.");
    }
  };

  const handleNetworkContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNetworkContract({ ...networkContract, [e.target.name]: e.target.value });
  };

  const validateContract = async (network: string, contractAddress: string): Promise<boolean> => {
    try {
      if (!ethers.utils.isAddress(contractAddress)) {
        setContractActionError("Invalid contract address format. Please enter a valid Ethereum address.");
        return false;
      }
      // Only basic validation here; can add more if needed
      return true;
    } catch {
      setContractActionError("Failed to validate the contract.");
      return false;
    }
  };

  const handleAddNetworkContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!networkContract.network || !networkContract.contractAddress || !networkContract.type) {
      setContractActionError("Please fill in all fields.");
      return;
    }
    const isValid = await validateContract(networkContract.network, networkContract.contractAddress);
    if (!isValid) return;
    setIsAddingContract(true);
    setContractActionError(null);
    try {
      const settingsDocRef = doc(db, "settings", "learn2earn");
      const settingsSnapshot = await getDoc(settingsDocRef);
      let contracts = [];
      if (settingsSnapshot.exists()) {
        contracts = settingsSnapshot.data().contracts || [];
      }
      // Check if contract for this network already exists
      const idx = contracts.findIndex((c: any) => c.network === networkContract.network);
      const now = new Date();
      if (idx >= 0) {
        contracts[idx] = {
          ...contracts[idx],
          ...networkContract,
          updatedAt: now,
        };
      } else {
        contracts.push({ ...networkContract, createdAt: now });
      }
      await setDoc(settingsDocRef, { contracts }, { merge: true });
      setNetworkContract({ network: "sepolia", contractAddress: "", type: "" });
      fetchNetworkContracts();
    } catch (err: any) {
      setContractActionError("Failed to add/update contract: " + (err.message || "Unknown error"));
    } finally {
      setIsAddingContract(false);
    }
  };

  return (
    <div className="bg-black/50 p-6 rounded-lg mb-6 border border-gray-700">
      {/* Form to add or update contracts */}
      <div className="bg-black/30 p-5 rounded-lg border border-gray-700 mb-6">
        <h3 className="text-xl text-orange-400 mb-4">Add/Update Network Contract</h3>
        <form onSubmit={handleAddNetworkContract} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Network</label>
            <select
              name="network"
              value={networkContract.network}
              onChange={handleNetworkContractChange}
              className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
              required
            >
              {NETWORK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contract Address</label>
            <input
              type="text"
              name="contractAddress"
              value={networkContract.contractAddress}
              onChange={handleNetworkContractChange}
              placeholder="0x..."
              className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <input
              type="text"
              name="type"
              value={networkContract.type}
              onChange={handleNetworkContractChange}
              placeholder="Contract Type"
              className="w-full border border-gray-600 rounded-lg px-3 py-2 bg-black/50 text-white"
              required
            />
          </div>
          {contractActionError && (
            <p className="text-red-500 text-sm">{contractActionError}</p>
          )}
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60"
            disabled={isAddingContract}
          >
            {isAddingContract ? 'Processing...' : 'Add/Update Contract'}
          </button>
        </form>
      </div>
      {/* List of existing contracts */}
      <div>
        <h3 className="text-xl text-orange-400 mb-4">Current Smart Contracts</h3>
        {networkContracts.length === 0 ? (
          <p className="text-gray-400">No contract configurations found. Add one above.</p>
        ) : (
          <div className="space-y-4">
            {networkContracts.map((contract, index) => (
              <div key={contract.id || `${contract.network}-${contract.contractAddress}` || index} className="bg-black/30 p-4 rounded-lg border border-gray-700 hover:border-orange-500 transition-all">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-orange-300">
                      {contract.network.charAt(0).toUpperCase() + contract.network.slice(1)}
                    </h4>
                    <p className="text-sm text-gray-300 break-all">
                      Address: {contract.contractAddress}
                    </p>
                    <p className="text-sm text-gray-300 break-all">
                      Type: {contract.type}
                    </p>
                    <p className="text-xs text-gray-400">
                      Added: {formatFirestoreTimestamp(contract.createdAt)}
                      {contract.updatedAt && ` (Updated: ${formatFirestoreTimestamp(contract.updatedAt)})`}
                    </p>
                  </div>
                  <div className="flex mt-3 md:mt-0 md:ml-6 min-w-[160px]">
                    <Learn2EarnTestButton 
                      network={contract.network}
                      contractAddress={contract.contractAddress}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Learn2EarnContractsPanel;
