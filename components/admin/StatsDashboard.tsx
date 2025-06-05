import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  Timestamp, 
  getFirestore 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface StatsData {
  revenueToday: number;
  seekersTotal: number;
  seekersThisMonth: number;
  companiesTotal: number;
  companiesThisMonth: number;
  newsletterTotal: number;
  jobsTotal: number;
  instantJobsTotal: number;
  learn2earnTotal: number;
  pendingCompaniesTotal: number;
}

interface FirestoreDocument {
  id: string;
  [key: string]: any;
}

interface ExportableData {
  seekers: any[];
  companies: any[];
  newsletter: { 
    email: string;
    active?: boolean;
    createdAt?: string;
  }[];
}

const StatsDashboard: React.FC<{}> = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportData, setExportData] = useState<ExportableData>({ seekers: [], companies: [], newsletter: [] });
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      try {
        // Get current date info for filtering
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Convert to Firestore Timestamp
        const todayStart = Timestamp.fromDate(today);
        const monthStart = Timestamp.fromDate(firstDayOfMonth);
          // Fetch seekers data
        const seekersCollection = collection(db, "seekers");
        const seekersSnapshot = await getDocs(seekersCollection);
        const seekersTotal = seekersSnapshot.size;
        const seekersData = seekersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as FirestoreDocument));
          // Get seekers from this month
        const seekersThisMonth = seekersData.filter(
          seeker => seeker.createdAt && typeof seeker.createdAt.toDate === 'function' && seeker.createdAt.toDate() >= monthStart.toDate()
        ).length;
          // Fetch companies data
        const companiesCollection = collection(db, "companies");
        const companiesSnapshot = await getDocs(companiesCollection);
        const companiesTotal = companiesSnapshot.size;
        const companiesData = companiesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as FirestoreDocument));
          // Get companies from this month
        const companiesThisMonth = companiesData.filter(
          company => company.createdAt && typeof company.createdAt.toDate === 'function' && company.createdAt.toDate() >= monthStart.toDate()
        ).length;
        
        // Fetch pending companies
        const pendingCompaniesCollection = collection(db, "pendingCompanies");
        const pendingCompaniesSnapshot = await getDocs(pendingCompaniesCollection);
        const pendingCompaniesTotal = pendingCompaniesSnapshot.size;
        
        // Fetch jobs data
        const jobsCollection = collection(db, "jobs");
        const jobsSnapshot = await getDocs(jobsCollection);
        const jobsTotal = jobsSnapshot.size;
        
        // Fetch instant jobs data
        const instantJobsCollection = collection(db, "instantJobs");
        const instantJobsSnapshot = await getDocs(instantJobsCollection);
        const instantJobsTotal = instantJobsSnapshot.size;
        
        // Fetch learn2earn data
        const learn2earnCollection = collection(db, "learn2earn");
        const learn2earnSnapshot = await getDocs(learn2earnCollection);
        const learn2earnTotal = learn2earnSnapshot.size;        // Fetch newsletter subscriptions from jobAlertSubscribers collection
        const newsletterCollection = collection(db, "jobAlertSubscribers");
        const newsletterQuery = query(newsletterCollection, where('active', '==', true));
        const newsletterSnapshot = await getDocs(newsletterQuery);
        const newsletterTotal = newsletterSnapshot.size;        const newsletterData = newsletterSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            email: data.email || "No email",
            active: data.active !== undefined ? data.active : true,
            createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toISOString() : "Unknown"
          };
        });
        
        // Calculate today's revenue
        // This is a simplified approach - you may need to adjust based on your actual payment structure
        const paymentsCollection = collection(db, "payments");
        const todayPaymentsQuery = query(
          paymentsCollection,
          where("createdAt", ">=", todayStart)
        );
        
        const todayPaymentsSnapshot = await getDocs(todayPaymentsQuery);
        let revenueToday = 0;
        
        todayPaymentsSnapshot.forEach(doc => {
          const paymentData = doc.data();
          revenueToday += paymentData.amount || 0;
        });
        
        // Set stats
        setStats({
          revenueToday,
          seekersTotal,
          seekersThisMonth,
          companiesTotal,
          companiesThisMonth,
          newsletterTotal,
          jobsTotal,
          instantJobsTotal,
          learn2earnTotal,
          pendingCompaniesTotal
        });
        
        // Set exportable data
        setExportData({
          seekers: seekersData,
          companies: companiesData,
          newsletter: newsletterData
        });
        
      } catch (error) {
        console.error("Error fetching statistics:", error);
        // Fallback to zeros if we have an error
        setStats({
          revenueToday: 0,
          seekersTotal: 0,
          seekersThisMonth: 0,
          companiesTotal: 0,
          companiesThisMonth: 0,
          newsletterTotal: 0,
          jobsTotal: 0,
          instantJobsTotal: 0,
          learn2earnTotal: 0,
          pendingCompaniesTotal: 0
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [db]);

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  };

  if (loading || !stats) return (
    <div className="flex justify-center items-center h-32">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div>
      <span className="ml-3 text-orange-500">Loading statistics...</span>
    </div>
  );  return (
    <div className="bg-black/30 p-6 rounded-xl border border-gray-700 shadow">
      <div className="py-4 my-2 text-center border-b border-gray-700">
        <p className="text-gray-300 italic text-xl md:text-2xl leading-relaxed">
          "Gate33 was born out of a good cause. <br className="hidden md:block" />
          Not all days will be good, but purpose always prevails."
        </p>
        <p className="text-orange-400 font-bold text-lg md:text-xl mt-3">Do your best.</p>
      </div>
      
      {/* Featured Stats Section - Most important stats with special styling */}
      <div className="mb-8">
        <h3 className="text-gray-300 text-sm mb-3 font-medium">FEATURED METRICS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeaturedStatCard 
            label="Today's Revenue" 
            value={`$ ${stats.revenueToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} 
            icon="💰"
          />
          <FeaturedStatCard 
            label="Active Users" 
            value={stats.seekersTotal + stats.companiesTotal} 
            icon="👥"
          />
        </div>
      </div>
      
      {/* Main Stats Grid */}
      <div className="mb-8">
        <h3 className="text-gray-300 text-sm mb-3 font-medium">USER METRICS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Seekers (Total)" value={stats.seekersTotal} highlight={stats.seekersTotal > 100} />
          <StatCard label="Seekers (This Month)" value={stats.seekersThisMonth} />
          <StatCard label="Companies (Total)" value={stats.companiesTotal} highlight={stats.companiesTotal > 50} />
          <StatCard label="Companies (This Month)" value={stats.companiesThisMonth} />
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-gray-300 text-sm mb-3 font-medium">PLATFORM ACTIVITY</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Job Alert Subscribers" value={stats.newsletterTotal} highlight={stats.newsletterTotal > 0} />
          <StatCard label="Jobs" value={stats.jobsTotal} />
          <StatCard label="Instant Jobs" value={stats.instantJobsTotal} highlight={stats.instantJobsTotal > 0} />
          <StatCard label="Learn2Earn" value={stats.learn2earnTotal} />
          <StatCard label="Pending Companies" value={stats.pendingCompaniesTotal} highlight={stats.pendingCompaniesTotal > 0} />
        </div>
      </div>      <div className="mt-10 border-t border-gray-700 pt-6">
        <h3 className="text-gray-300 text-sm mb-4 font-medium">EXPORT DATA</h3>
        <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
          <ExportButton 
            onClick={() => exportToExcel(exportData.newsletter, "job-alerts-subscribers.xlsx")}
            icon="📊"
          >
            Export Job Alert Subscribers
          </ExportButton>
          <ExportButton 
            onClick={() => exportToExcel(exportData.companies, "companies.xlsx")}
            icon="🏢"
          >
            Export Companies
          </ExportButton>
          <ExportButton 
            onClick={() => exportToExcel(exportData.seekers, "seekers.xlsx")}
            icon="👤"
          >
            Export Seekers
          </ExportButton>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ 
  label, 
  value,
  highlight = false 
}) => (
  <div className={`${highlight 
    ? 'bg-black/80 border-l-4 border-l-orange-500 border border-gray-600' 
    : 'bg-black/70 border border-gray-600'
    } hover:border-orange-500 transition-all rounded-lg p-4 text-center shadow-sm hover:shadow-md`}>
    <div className="text-sm font-semibold text-gray-300 mb-2">{label}</div>
    <div className={`text-2xl font-bold ${highlight ? 'text-orange-400' : 'text-orange-500'}`}>{value}</div>
  </div>
);

const FeaturedStatCard: React.FC<{ label: string; value: string | number; icon: string }> = ({ 
  label, 
  value,
  icon
}) => (
  <div className="bg-gradient-to-br from-black/80 to-black/60 border border-orange-700/50 rounded-lg p-5 shadow-lg">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-gray-300 font-medium mb-1">{label}</div>
        <div className="text-3xl font-bold text-orange-400">{value}</div>
      </div>
      <div className="text-4xl opacity-80">{icon}</div>
    </div>
  </div>
);

const ExportButton: React.FC<{ onClick: () => void; children: React.ReactNode; icon?: string }> = ({ 
  onClick, 
  children,
  icon
}) => (
  <button
    onClick={onClick}
    className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 hover:shadow-md"
  >
    {icon && <span>{icon}</span>}
    {children}
  </button>
);

export default StatsDashboard;
