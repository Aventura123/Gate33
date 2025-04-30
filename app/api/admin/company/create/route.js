import { db } from "../../../../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export async function POST(req) {
    const { email, password } = await req.json();

    if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const companiesCollection = collection(db, "companies");
        const newCompany = {
            email,
            password,
            createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(companiesCollection, newCompany);

        return new Response(JSON.stringify({ success: true, id: docRef.id }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error creating company:", error);
        return new Response(JSON.stringify({ error: "Failed to create company" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}