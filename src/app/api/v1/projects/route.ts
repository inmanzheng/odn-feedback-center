import { NextResponse } from "next/server";
import { getProjects } from "@/lib/db/store";

/**
 * GET /api/v1/projects
 * 获取所有项目列表
 */
export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json({ success: true, data: projects });
  } catch (err) {
    console.error("Failed to get projects:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
