import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AppProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_subscribed: boolean;
  subscription_until: string | null;
}

export interface AuthState {
  loading: boolean;
  user: User | null;
  profile: AppProfile | null;
  isAdmin: boolean;
  isSubscriber: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadExtras = async (uid: string) => {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (!mounted) return;
      setProfile(prof as AppProfile | null);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(() => loadExtras(u.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadExtras(u.id).finally(() => mounted && setLoading(false));
      else setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isSubscriber =
    isAdmin ||
    (!!profile?.is_subscribed &&
      (!profile.subscription_until ||
        new Date(profile.subscription_until) > new Date()));

  return { loading, user, profile, isAdmin, isSubscriber };
}
