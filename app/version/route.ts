import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("> v1.0.0", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}