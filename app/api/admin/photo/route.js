import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

export async function POST(req) {
  const formData = await req.formData();
  const imageFile = formData.get("photo");

  if (!imageFile || !imageFile.name || !imageFile.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
  }

  const fileExt = imageFile.name.split(".").pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, fileName);

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const fileBuffer = await imageFile.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(fileBuffer));

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch (error) {
    console.error("Error saving the file:", error);
    return NextResponse.json({ error: "Failed to save the file." }, { status: 500 });
  }
}