"use server";

import { revalidatePath } from "next/cache";
import { briefingsApi } from "@/lib/api/briefings";

export async function generateBriefingAction(): Promise<
  { ok: true; date: string } | { ok: false; error: string }
> {
  try {
    const briefing = await briefingsApi.generate({ overwrite: true, publish: true });
    revalidatePath("/");
    revalidatePath("/archive");
    revalidatePath(`/briefings/${briefing.briefing_date}`);
    return { ok: true, date: briefing.briefing_date };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
