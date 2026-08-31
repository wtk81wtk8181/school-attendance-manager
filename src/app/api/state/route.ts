import { NextResponse } from "next/server";
import {
  formatDatabaseError,
  hasDatabase,
  loadSharedSnapshot,
  RevisionConflictError,
  saveMergedSharedState,
  sharedFromState,
} from "@/lib/db";
import {
  SNAPSHOT_OPERATIONAL_ID,
  SNAPSHOT_ROSTER_ID,
  type SnapshotScope,
} from "@/lib/shared-state-sections";
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

function parseScopes(value: string | null): SnapshotScope[] | undefined {
  if (!value) return undefined;
  const scopes = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is SnapshotScope => item === SNAPSHOT_ROSTER_ID || item === SNAPSHOT_OPERATIONAL_ID);
  return scopes.length > 0 ? scopes : undefined;
}

export async function GET(request: Request) {
  if (!(await isSiteRequestAuthorized(request))) {
    return json({ error: "未獲授權。" }, 401);
  }
  try {
    const url = new URL(request.url);
    const scopes = parseScopes(url.searchParams.get("scopes"));
    const rosterDirty = url.searchParams.get("rosterDirty") === "1";
    const snapshot = await loadSharedSnapshot({ scopes, rosterDirty });
    return json({
      state: snapshot.state,
      database: hasDatabase(),
      revision: snapshot.revision,
      rosterRevision: snapshot.rosterRevision,
      operationalRevision: snapshot.operationalRevision,
      updatedAt: snapshot.updatedAt,
      partial: Boolean(scopes && scopes.length > 0),
    });
  } catch (error) {
    return json({ error: formatDatabaseError(error) }, 500);
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
    if (!body?.state || Object.keys(body.state).length === 0) {
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
      rosterRevision: snapshot.rosterRevision,
      operationalRevision: snapshot.operationalRevision,
      updatedAt: snapshot.updatedAt,
      state: sharedFromState(snapshot.state),
    });
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      return json({ error: error.message }, 409);
    }
    return json({ error: formatDatabaseError(error) }, 500);
  }
}
