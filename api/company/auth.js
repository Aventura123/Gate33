import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { username, password } = req.body;

    try {
      console.log("Received login request for username:", username);

      // Query the companies collection for the user by username
      const q = query(
        collection(db, "companies"),
        where("username", "==", username)
      );

      const querySnapshot = await getDocs(q);
      console.log("Query snapshot size:", querySnapshot.size);

      if (!querySnapshot.empty) {
        // Get the company data
        const companyData = querySnapshot.docs[0].data();

        // Add detailed logging for debugging
        console.log("Stored hashed password:", companyData.password);
        console.log("Provided password:", password);

        // Compare the provided password with the hashed password
        const isPasswordValid = await bcrypt.compare(password, companyData.password);

        console.log("Password comparison result:", isPasswordValid);

        if (isPasswordValid) {
          console.log("Login successful for company:", companyData.name || username);

          // Create a simple token with the company id
          const token = Buffer.from(querySnapshot.docs[0].id).toString("base64");

          res.status(200).json({ 
            success: true, 
            token: token,
            company: {
              id: querySnapshot.docs[0].id,
              name: companyData.name || "Company"
            }
          });
        } else {
          console.log("Invalid password for username:", username);
          res.status(401).json({ success: false, error: "Credenciais inválidas" });
        }
      } else {
        console.log("Invalid username:", username);
        res.status(401).json({ success: false, error: "Credenciais inválidas" });
      }
    } catch (error) {
      console.error("Error querying Firestore:", error);
      res.status(500).json({ success: false, error: "Erro de banco de dados" });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}