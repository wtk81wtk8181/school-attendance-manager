import { NextResponse } from "next/server";
import {
  hasDatabase,
  loadSharedSnapshot,
  saveMergedSharedState,
  sharedFromState,
} from "@/lib/db";
import type { AppState } from "@/lib/types";

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

export async function GET() {
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
  if (!hasDatabase()) {
    return json({ error: "尚未設定 DATABASE_URL／POSTGRES_URL。" }, 503);
  }

  try {
    const body = (await request.json()) as { state?: Partial<AppState> };
    if (!body?.state) {
      return json({ error: "缺少 state。" }, 400);
    }

    const snapshot = await saveMergedSharedState(body.state);
    return json({
      ok: true,
      revision: snapshot.revision,
      updatedAt: snapshot.updatedAt,
      state: sharedFromState(snapshot.state),
    });
  } catch {
    return json({ error: "寫入資料庫失敗。" }, 500);
  }
}
