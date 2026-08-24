import { NextResponse } from "next/server";
import {
  hasDatabase,
  loadSharedSnapshot,
  saveMergedSharedState,
  sharedFromState,
} from "@/lib/db";
import type { AppState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await loadSharedSnapshot();
    return NextResponse.json({
      state: snapshot.state,
      database: hasDatabase(),
      revision: snapshot.revision,
      updatedAt: snapshot.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "讀取資料庫失敗。" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "尚未設定 DATABASE_URL／POSTGRES_URL。" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { state?: Partial<AppState> };
    if (!body?.state) {
      return NextResponse.json({ error: "缺少 state。" }, { status: 400 });
    }

    const snapshot = await saveMergedSharedState(body.state);
    return NextResponse.json({
      ok: true,
      revision: snapshot.revision,
      updatedAt: snapshot.updatedAt,
      state: sharedFromState(snapshot.state),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "寫入資料庫失敗。" },
      { status: 500 }
    );
  }
}
