import { NextResponse } from "next/server";
import {
  hasDatabase,
  loadSharedSnapshot,
  RevisionConflictError,
  saveMergedSharedState,
  sharedFromState,
} from "@/lib/db";
import type { AppState } from "@/lib/types";
import { isSiteRequestAuthorized } from "@/lib/site-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export async function GET(request: Request) {
  if (!(await isSiteRequestAuthorized(request))) {
    return json({ error: "未獲授權。" }, 401);
  }
  try {
    const snapshot = await loadSharedSnapshot();
    return json({
      state: snapshot.state,
      database: hasDatabase(),
      revision: snapshot.revision,
      updatedAt: snapshot.updatedAt,
    });
  } catch {
    return json({ error: "讀取資料庫失敗。" }, 500);
  }
}

export async function PUT(request: Request) {
  if (!(await isSiteRequestAuthorized(request))) {
    return json({ error: "未獲授權。" }, 401);
  }
  if (!hasDatabase()) {
    return json({ error: "尚未設定 DATABASE_URL／POSTGRES_URL。" }, 503);
  }

  try {
    const body = (await request.json()) as {
      state?: Partial<AppState>;
      replaceSections?: string[];
      baseRevision?: number;
    };
    if (!body?.state) {
      return json({ error: "缺少 state。" }, 400);
    }

    const snapshot = await saveMergedSharedState(
      body.state,
      Array.isArray(body.replaceSections) ? body.replaceSections : [],
      body.baseRevision
    );
    return json({
      ok: true,
      revision: snapshot.revision,
      updatedAt: snapshot.updatedAt,
      state: sharedFromState(snapshot.state),
    });
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      return json({ error: error.message }, 409);
    }
    return json({ error: "寫入資料庫失敗。" }, 500);
  }
}
