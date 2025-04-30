import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, DocumentData } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// Interface para tipar os dados do empregador
interface EmployerData extends DocumentData {
  id: string;
  name: string;
  username: string;
  email: string;
  companyName: string;
  companySize?: string;
  industry?: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

// GET: Buscar todos os empregadores ou um empregador específico por ID
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      // Fetch a specific company
      if (!db) {
        throw new Error("Database connection is not initialized");
      }
      const companyRef = doc(db, "companies", id);
      const companySnapshot = await getDoc(companyRef);

      if (!companySnapshot.exists()) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }

      const company = {
        id: companySnapshot.id,
        ...companySnapshot.data()
      } as EmployerData;

      // Remove sensitive data
      delete company.password;

      return NextResponse.json(company);
    } else {
      // Fetch all companies
      if (!db) {
        throw new Error("Database connection is not initialized");
      }
      const companiesCollection = collection(db, "companies");
      const companiesSnapshot = await getDocs(companiesCollection);

      const companies = companiesSnapshot.docs.map(doc => {
        const data = doc.data() as Omit<EmployerData, 'id'>;
        // Remove sensitive data
        delete data.password;

        return {
          id: doc.id,
          ...data
        };
      });

      return NextResponse.json(companies);
    }
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "Error fetching companies", message: error.message },
      { status: 500 }
    );
  }
}

// POST: Criar um novo empregador
export async function POST(req: NextRequest) {
  try {
    const { name, username, password, email, companyName, companySize, industry } = await req.json();

    // Basic validation
    if (!name || !username || !password || !email || !companyName) {
      return NextResponse.json(
        { error: "Incomplete data" },
        { status: 400 }
      );
    }

    // Check if username already exists
    if (!db) {
      throw new Error("Database connection is not initialized");
    }
    const usernameQuery = query(
      collection(db, "companies"),
      where("username", "==", username)
    );

    const usernameSnapshot = await getDocs(usernameQuery);

    if (!usernameSnapshot.empty) {
      return NextResponse.json(
        { error: "Username is already in use" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const emailQuery = query(
      collection(db, "companies"),
      where("email", "==", email)
    );

    const emailSnapshot = await getDocs(emailQuery);

    if (!emailSnapshot.empty) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique ID
    const companyId = uuidv4();
    const companyRef = doc(db, "companies", companyId);

    // Create document in Firestore
    await setDoc(companyRef, {
      id: companyId,
      name,
      username,
      email,
      companyName,
      companySize: companySize || "Not specified",
      industry: industry || "Not specified",
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: true,
        message: "Company created successfully",
        company: {
          id: companyId,
          name,
          username,
          email,
          companyName,
          companySize: companySize || "Not specified",
          industry: industry || "Not specified"
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { error: "Error creating company", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remover um empregador
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID do empregador não fornecido" },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error("Database connection is not initialized");
    }
    const employerRef = doc(db, "companies", id);
    await deleteDoc(employerRef);

    return NextResponse.json(
      { success: true, message: "Empregador removido com sucesso" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao remover empregador:", error);
    return NextResponse.json(
      { error: "Erro ao remover empregador", message: error.message },
      { status: 500 }
    );
  }
}