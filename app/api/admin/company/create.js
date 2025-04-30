import { db } from "../../../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const companiesCollection = collection(db, "companies");
        const newCompany = {
            email,
            password,
            createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(companiesCollection, newCompany);

        return res.status(201).json({ success: true, id: docRef.id });
    } catch (error) {
        console.error("Error creating company:", error);
        return res.status(500).json({ error: "Failed to create company" });
    }
}