import { NextResponse } from "next/server";
import {
  hasDatabase,
  loadSharedState,
  mergeSharedState,
  saveSharedState,
} from "@/lib/db";
import type { AppState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadSharedState();
    return NextResponse.json({
      state,
      database: hasDatabase(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "讀取資料庫失敗。", detail: String(error) },
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
    const state = mergeSharedState(body.state);
    await saveSharedState(state);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "寫入資料庫失敗。", detail: String(error) },
      { status: 500 }
    );
  }
}
