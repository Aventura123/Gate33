import { NextApiRequest, NextApiResponse } from "next";
import { collection, deleteDoc, doc, getDocs, where, query } from "firebase/firestore";
import { db } from "../../../lib/firebase";

const cleanupExpiredJobs = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    if (!db) {
      throw new Error("Firestore is not initialized.");
    }

    const jobsCollection = collection(db, "jobs");
    const now = new Date().toISOString();

    // Query jobs where the expiration date has passed
    const expiredJobsQuery = query(jobsCollection, where("expiresAt", "<=", now));
    const querySnapshot = await getDocs(expiredJobsQuery);

    const deletePromises = querySnapshot.docs.map((docSnapshot) => {
      if (db) {
        return deleteDoc(doc(db, "jobs", docSnapshot.id));
      }
    });

    await Promise.all(deletePromises);

    res.status(200).json({ message: "Expired jobs cleaned up successfully.", count: deletePromises.length });
  } catch (error) {
    console.error("Error cleaning up expired jobs:", error);
    res.status(500).json({ error: "Failed to clean up expired jobs." });
  }
};

export default cleanupExpiredJobs;
