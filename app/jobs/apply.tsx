import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

export default function ApplyPage() {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-black via-[#18181b] to-black text-white px-4">
        <div className="bg-black/80 border border-orange-500/30 rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
          <h1 className="text-3xl font-bold text-orange-400 mb-4">Apply for a Job</h1>
          <p className="text-orange-200 mb-6">
            This page is under construction. Soon you will be able to apply for real blockchain jobs directly from our platform!
          </p>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded transition-colors" disabled>
            Application Coming Soon
          </Button>
        </div>
      </div>
    </Layout>
  );
}
