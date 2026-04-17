import { NextResponse } from "next/server";
import { getProjectById, getSessions } from "@/lib/db/store";

/**
 * GET /api/v1/projects/[projectId]
 * 获取单个项目详情 + 会话列表
 */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const project = await getProjectById(params.projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const sessions = await getSessions(params.projectId);

    return NextResponse.json({
      success: true,
      data: { project, sessions },
    });
  } catch (err) {
    console.error("Failed to get project detail:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}
