import { RESUME_DATA } from "@/src/data/resume";
import { NextResponse } from "next/server";

export type ResumeType = typeof RESUME_DATA;

export async function GET() {
  return NextResponse.json(RESUME_DATA);
}
