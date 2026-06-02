import { supabase } from "@/integrations/supabase/client";

/** Find or create the user's direct chat with admins. Returns chat id. */
export async function ensureDirectChat(userId: string, displayName: string | null): Promise<string> {
  const { data: existing } = await supabase
    .from("chats")
    .select("id")
    .eq("kind", "direct")
    .eq("owner_id", userId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("chats")
    .insert({
      kind: "direct",
      owner_id: userId,
      gost_clause: "—",
      title: `Личный чат: ${displayName ?? "пользователь"}`,
      order_index: -1,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
