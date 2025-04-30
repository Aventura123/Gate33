import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const mockCompanyUsers = [
  { id: "1", username: "company1", password: bcrypt.hashSync("password1", 10) },
  { id: "2", username: "company2", password: bcrypt.hashSync("password2", 10) },
];

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const user = mockCompanyUsers.find((u) => u.username === username);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "2h",
  });

  return NextResponse.json({ success: true, token });
}