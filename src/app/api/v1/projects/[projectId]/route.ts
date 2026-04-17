import { NextRequest, NextResponse } from "next/server";
import { getProjectById, getSessions, deleteProject } from "@/lib/db/store";
import { validateApiKey } from "@/lib/auth";
import type { DeleteResponse } from "@/types";

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

/**
 * DELETE /api/v1/projects/[projectId]
 * 删除项目及其所有关联数据（级联删除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json<DeleteResponse>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const project = await getProjectById(params.projectId);
    if (!project) {
      return NextResponse.json<DeleteResponse>(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    await deleteProject(params.projectId);

    return NextResponse.json<DeleteResponse>({
      success: true,
      deleted: params.projectId,
    });
  } catch (err) {
    console.error("Failed to delete project:", err);
    return NextResponse.json<DeleteResponse>(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
