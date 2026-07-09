import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("> v5.1", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}