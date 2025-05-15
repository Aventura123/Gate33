"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import Layout from "../../../components/Layout";
import { useToast } from "../../../hooks/use-toast";

export default function TestJobApplicationNotificationPage() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const sendTestNotification = async () => {
    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/jobs/test-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message || (data.success ? "Test email sent successfully" : "Failed to send test email")
      });

      toast({
        title: data.success ? "Test Successful" : "Test Failed",
        description: data.message,
        variant: data.success ? "success" : "destructive"
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
      
      toast({
        title: "Error",
        description: "Failed to send test notification. See console for details.",
        variant: "destructive"
      });
      
      console.error("Error sending test notification:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Test Job Application Notification</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <p className="mb-4 text-gray-700">
            This page allows you to test the job application notification system. When you click the button below, a test email will be sent to <strong>info@gate33.net</strong> simulating a job application.
          </p>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">What This Test Includes:</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>A simulated job application email with fake test data</li>
              <li>All application fields that would normally be included (candidate info, CV, cover letter, etc.)</li>
              <li>The email will be clearly marked as a test</li>
            </ul>
          </div>
          
          <Button
            onClick={sendTestNotification}
            disabled={sending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md transition"
          >
            {sending ? "Sending Test Email..." : "Send Test Notification Email"}
          </Button>
          
          {result && (
            <div className={`mt-6 p-4 rounded-md ${result.success ? "bg-green-50 text-green-800 border border-green-300" : "bg-red-50 text-red-800 border border-red-300"}`}>
              <p className="font-medium">{result.success ? "Success" : "Error"}</p>
              <p>{result.message}</p>
            </div>
          )}
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
          <p className="font-semibold">Note:</p>
          <p>This test uses the same email service configuration as the actual application notifications. If the test fails, actual job application notifications will likely fail as well.</p>
        </div>
      </div>
    </Layout>
  );
}
