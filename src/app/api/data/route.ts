import { getData, putData } from "@/server/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = getData;
export const PUT = putData;
