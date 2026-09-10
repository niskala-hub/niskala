import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseComingSoonSettingReturn {
  comingSoonEnabled: boolean;
  loading: boolean;
  toggle: (value: boolean) => Promise<void>;
}

export function useComingSoonSetting(): UseComingSoonSettingReturn {
  const [comingSoonEnabled, setComingSoonEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initial fetch
    supabase
      .from("site_settings")
      .select("coming_soon_enabled")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) {
          setComingSoonEnabled(data?.coming_soon_enabled ?? false);
          setLoading(false);
        }
      });

    // Use a unique channel name so React StrictMode's double-invocation
    // doesn't try to re-use the same channel that's already subscribed.
    const channelName = `site_settings_realtime_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_settings" },
        (payload) => {
          if (!mounted) return;
          const val = (payload.new as { coming_soon_enabled?: boolean })
            ?.coming_soon_enabled;
          if (typeof val === "boolean") {
            setComingSoonEnabled(val);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const toggle = async (value: boolean) => {
    await supabase
      .from("site_settings")
      .update({ coming_soon_enabled: value })
      .eq("id", true);
    // Optimistic update; Realtime confirms for other open tabs
    setComingSoonEnabled(value);
  };

  return { comingSoonEnabled, loading, toggle };
}
