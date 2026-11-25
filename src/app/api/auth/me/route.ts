import { getMe, patchMe } from "@/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = getMe;
export const PATCH = patchMe;
