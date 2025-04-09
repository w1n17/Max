"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const clearSession = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      // Очищаем localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("supabase.auth.expires_at");
        localStorage.removeItem("supabase.auth.refresh_token");
      }
    } catch (err) {
      console.error("Ошибка при очистке сессии:", err);
    }
  }, []);

  const loadProfile = useCallback(
    async (userId) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            const { data: userData, error: userError } =
              await supabase.auth.getUser();

            if (userError) {
              await clearSession();
              throw userError;
            }

            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert([
                {
                  id: userId,
                  email: userData.user.email,
                  role: "user",
                  created_at: new Date().toISOString(),
                  phone: userData.user.user_metadata?.phone || null,
                },
              ])
              .select()
              .single();

            if (createError) {
              console.error("Ошибка создания профиля:", createError);
              await clearSession();
              throw createError;
            }
            return newProfile;
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error("Ошибка загрузки профиля:", err);
        await clearSession();
        return null;
      }
    },
    [clearSession]
  );

  const checkAuth = useCallback(async () => {
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        await clearSession();
        throw sessionError;
      }

      const session = sessionData?.session;

      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Ошибка получения пользователя:", userError);
        await clearSession();
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (authUser) {
        const profile = await loadProfile(authUser.id);
        if (!profile) {
          await clearSession();
          setUser(null);
        } else {
          setUser({ ...authUser, ...profile });
        }
      } else {
        await clearSession();
        setUser(null);
      }
    } catch (err) {
      console.error("Ошибка проверки авторизации:", err);
      await clearSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile, clearSession]);

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await loadProfile(session.user.id);
        if (!profile) {
          await clearSession();
          setUser(null);
        } else {
          setUser({ ...session.user, ...profile });
        }
      } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        await clearSession();
        setUser(null);
        router.push("/");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [checkAuth, loadProfile, router, clearSession]);

  const signIn = useCallback(
    async (email, password) => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const profile = await loadProfile(data.user.id);
        if (!profile) {
          await clearSession();
          throw new Error("Профиль не найден");
        }

        const userData = { ...data.user, ...profile };
        setUser(userData);
        return userData;
      } catch (err) {
        console.error("Ошибка входа:", err);
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loadProfile, clearSession]
  );

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await clearSession();
      router.push("/");
    } catch (err) {
      console.error("Ошибка выхода:", err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, router]);

  return {
    user,
    isLoading,
    error,
    signIn,
    signOut,
    checkAuth,
  };
}
