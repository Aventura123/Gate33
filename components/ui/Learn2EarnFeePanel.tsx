import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ethers } from "ethers";
import { updateFeeConfig } from "../../services/learn2earnContractService";

const Learn2EarnFeePanel: React.FC = () => {
  const [feeCollector, setFeeCollector] = useState("");
  const [feePercent, setFeePercent] = useState(5); // default 5%
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const configDoc = await getDoc(doc(db, "settings", "paymentConfig_l2l"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          setFeeCollector(data.feeCollectorAddress || "");
          setFeePercent(data.feePercent || 5);
        }
      } catch (err: any) {
        setError("Failed to load config: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(feeCollector)) {
        throw new Error("Invalid Ethereum address.");
      }
      if (feePercent < 0 || feePercent > 100) {
        throw new Error("Fee percent must be between 0 and 100.");
      }

      // Save to Firebase
      await setDoc(doc(db, "settings", "paymentConfig_l2l"), {
        feeCollectorAddress: feeCollector,
        feePercent,
        updatedAt: new Date(),
      }, { merge: true });

      // Update the smart contract
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        // Não precisamos mais especificar o endereço do contrato aqui
        // A função updateFeeConfig buscará no Firestore
        await updateFeeConfig("", provider, feeCollector, feePercent);
        setSuccess(true);
      } catch (contractError: any) {
        console.error("Contract interaction failed:", contractError);
        // Salvar no Firebase funcionou, então mostramos sucesso parcial
        setSuccess(true);
        setError(`Settings saved to database, but contract update failed: ${contractError.message || "Unknown error"}. 
                 Contract changes will be applied when you connect to a supported network.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save config.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-black/30 p-4 rounded-lg border border-gray-700 shadow-md">
      <h3 className="text-xl font-bold text-orange-400 mb-2">Learn2Earn Fee Management</h3>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm font-bold mb-1">Fee Collector Wallet Address</label>
          <input
            type="text"
            value={feeCollector}
            onChange={e => setFeeCollector(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
            placeholder="0x..."
          />
          <p className="text-xs text-gray-400 mt-1">This wallet will receive the Learn2Earn fee on all deposits.</p>
        </div>
        <div>
          <label className="block text-gray-300 text-sm font-bold mb-1">Fee Percentage (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={feePercent}
            onChange={e => setFeePercent(Number(e.target.value))}
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
          />
          <p className="text-xs text-gray-400 mt-1">A {feePercent}% fee will be deducted from all Learn2Earn deposits (all currencies).</p>
        </div>
        {error && <div className="bg-red-800 text-white p-2 rounded">{error}</div>}
        {success && <div className="bg-green-800 text-white p-2 rounded">Settings saved successfully!</div>}
        <button
          type="submit"
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
      {loading && <div className="text-gray-400 mt-2">Loading current settings...</div>}
    </div>
  );
};

export default Learn2EarnFeePanel;
