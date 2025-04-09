"use client";
import React, { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { PageBackground } from "../../widgets/Background/BackgroundImage";
import { supabase } from "../../lib/supabase";
import { LoadingSpinner } from "../../widgets/common/LoadingSpinner/LoadingSpinner";

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [editingCoach, setEditingCoach] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    activities: "",
    schedule: [],
    price: "",
  });

  // Проверка прав администратора
  const checkAdminAccess = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!user || authError) {
        router.push("/login");
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        router.push("/");
        return false;
      }

      setUser(user);
      return true;
    } catch (err) {
      console.error("Admin check error:", err);
      router.push("/");
      return false;
    }
  };

  // Загрузка пользователей
  const loadUsers = async () => {
    try {
      // Получаем профили с ролями
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Ошибка загрузки профилей:", profilesError);
        throw profilesError;
      }

      console.log("Загруженные профили:", profiles);

      // Форматируем данные пользователей
      const formattedUsers = profiles.map((profile) => ({
        id: profile.id,
        shortId: `${profile.id.slice(0, 6)}...${profile.id.slice(-4)}`,
        email: profile.email || "Нет email",
        role: profile.role || "user",
        phone: profile.phone || "Не указан",
        created_at: new Date(profile.created_at).toLocaleDateString("ru-RU"),
      }));

      console.log("Отформатированные пользователи:", formattedUsers);
      setUsers(formattedUsers);

      // Загружаем тренеров
      const { data: coachesData, error: coachesError } = await supabase
        .from("coaches")
        .select("*, user_id");

      if (coachesError) {
        console.error("Ошибка загрузки тренеров:", coachesError);
        setError("Ошибка при загрузке данных тренеров");
        return;
      }

      // Находим соответствующие профили для тренеров
      const coachesWithProfiles = coachesData.map((coach) => {
        const profile = profiles.find((p) => p.id === coach.user_id);
        return {
          ...coach,
          schedule: coach.schedule || {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
          activities: Array.isArray(coach.activities)
            ? coach.activities
            : ["Тренировки"],
          name: coach.name || profile?.email || "Новый тренер",
          price: coach.price || "0",
          profile: {
            email: profile?.email || "Нет email",
            phone: profile?.phone || "Не указан",
            role: profile?.role || "coach",
          },
        };
      });

      setCoaches(coachesWithProfiles);
      console.log("Загруженные тренеры:", coachesWithProfiles);
    } catch (err) {
      console.error("Ошибка загрузки пользователей:", err);
      setError(err.message);
    }
  };

  // Загрузка тренеров
  const loadCoaches = async () => {
    try {
      // Получаем только тех тренеров, у которых есть соответствующая роль в profiles
      const { data: validCoaches, error: validCoachesError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "coach");

      if (validCoachesError) {
        console.error("Ошибка получения списка тренеров:", validCoachesError);
        return;
      }

      const validCoachIds = validCoaches.map((c) => c.id);

      if (validCoachIds.length === 0) {
        setCoaches([]);
        return;
      }

      const { data: coachesData, error: coachesError } = await supabase
        .from("coaches")
        .select("*, user_id")
        .in("user_id", validCoachIds)
        .order("created_at", { ascending: false });

      if (coachesError) {
        console.error("Ошибка загрузки тренеров:", coachesError);
        setError("Ошибка при загрузке данных тренеров");
        return;
      }

      // Получаем профили для тренеров
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in(
          "id",
          coachesData.map((coach) => coach.user_id)
        );

      if (profilesError) {
        console.error("Ошибка загрузки профилей:", profilesError);
        return;
      }

      const coachesWithProfiles = coachesData.map((coach) => {
        const profile = profiles.find((p) => p.id === coach.user_id);
        return {
          ...coach,
          schedule: coach.schedule || {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
          activities: Array.isArray(coach.activities)
            ? coach.activities
            : ["Тренировки"],
          name: coach.name || profile?.email || "Новый тренер",
          price: coach.price || "0",
          profile: {
            email: profile?.email || "Нет email",
            phone: profile?.phone || "Не указан",
            role: profile?.role || "coach",
          },
        };
      });

      setCoaches(coachesWithProfiles);
    } catch (err) {
      console.error("Ошибка загрузки тренеров:", err);
      setError(err.message);
    }
  };

  // Мемоизируем функции для работы с расписанием
  const addTimeSlot = useCallback(() => {
    setEditData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, { day: "Пн", time: "10:00-11:00" }],
    }));
  }, []);

  const updateTimeSlot = useCallback((index, field, value) => {
    setEditData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const isAdmin = await checkAdminAccess();
      if (isAdmin) {
        await loadUsers();
        await loadCoaches();
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Обновление роли пользователя
  const handleRoleUpdate = async (userId, newRole) => {
    try {
      setError(null);
      setLoading(true);
      console.log("Начало обновления роли:", { userId, newRole });

      // Получаем текущие данные пользователя
      const { data: currentUser, error: userError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Ошибка получения данных пользователя:", userError);
        setError("Ошибка получения данных пользователя");
        return;
      }

      const oldRole = currentUser.role;

      // Вызываем RPC функцию для обновления роли
      const { error: updateError } = await supabase.rpc("update_user_role", {
        p_user_id: userId,
        new_role: newRole,
      });

      if (updateError) {
        console.error("Ошибка обновления роли:", updateError);
        setError(
          "Ошибка при обновлении роли: " +
            (updateError.message || "Неизвестная ошибка")
        );
        return;
      }

      // Если меняем роль с тренера на другую, удаляем из списка тренеров
      if (oldRole === "coach") {
        setCoaches((prevCoaches) =>
          prevCoaches.filter((coach) => coach.user_id !== userId)
        );
      }

      // Обновляем состояние пользователей
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      // Если назначаем роль тренера, спрашиваем о создании карточки
      if (newRole === "coach") {
        const shouldCreate = window.confirm(
          "Хотите создать карточку тренера сейчас?"
        );
        if (shouldCreate) {
          const { data: userData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          const { error: createError } = await supabase.from("coaches").insert([
            {
              user_id: userId,
              name: userData?.email || "Новый тренер",
              activities: ["Тренировки"],
              schedule: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: [],
              },
              price: "0",
            },
          ]);

          if (createError) {
            console.error("Ошибка создания карточки тренера:", createError);
            setError("Ошибка при создании карточки тренера");
            return;
          }
        }
      }

      // Перезагружаем данные
      await loadUsers();
      await loadCoaches();

      console.log("Роль успешно обновлена");
    } catch (error) {
      console.error("Ошибка при обновлении роли:", error);
      setError(
        "Произошла ошибка при обновлении роли: " +
          (error.message || "Неизвестная ошибка")
      );
    } finally {
      setLoading(false);
    }
  };

  // Логика редактирования тренеров
  const startEditing = (coach) => {
    setEditingCoach(coach.id);
    setEditData({
      name: coach.name,
      activities: coach.activities?.join(", ") || "",
      schedule: coach.schedule || [],
      price: coach.price || "",
    });
  };

  const cancelEditing = () => {
    setEditingCoach(null);
    setEditData({ name: "", activities: "", schedule: [], price: "" });
  };

  const handleCoachUpdate = async (coachId) => {
    try {
      const activitiesArray = editData.activities
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a);

      const { error } = await supabase
        .from("coaches")
        .update({
          name: editData.name,
          activities: activitiesArray,
          schedule: editData.schedule.filter((s) => s.day && s.time),
          price: editData.price,
        })
        .eq("id", coachId);

      if (error) throw error;

      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coachId
            ? {
                ...c,
                ...editData,
                activities: activitiesArray,
              }
            : c
        )
      );
      cancelEditing();
    } catch (err) {
      setError("Ошибка обновления: " + err.message);
    }
  };

  if (loading) {
    return (
      <PageBackground src="/images/general/back.png">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground src="/images/general/back.png">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Административная панель
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-600 text-white rounded-lg">
            {error}
          </div>
        )}

        {/* Секция пользователей */}
        <section className="bg-[#1F1F1F] rounded-xl p-6 mb-8 shadow-xl">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Пользователи ({users.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1F1F1F]">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Телефон</th>
                  <th className="px-4 py-3 text-left">Роль</th>
                  <th className="px-4 py-3 text-left">Дата регистрации</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-200 font-mono">
                      {user.shortId}
                    </td>
                    <td className="px-4 py-3 text-gray-200">{user.email}</td>
                    <td className="px-4 py-3 text-gray-200">{user.phone}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleUpdate(user.id, e.target.value)
                        }
                        className="bg-[#1F1F1F] text-white px-3 py-1 rounded-md"
                      >
                        <option value="user">Пользователь</option>
                        <option value="coach">Тренер</option>
                        <option value="admin">Админ</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      {user.created_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Секция тренеров */}
        <section className="bg-[#1F1F1F] rounded-xl p-6 shadow-xl">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Тренеры ({coaches.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((coach) => (
              <div key={coach.id} className="bg-[#1F1F1F] rounded-lg p-4">
                {editingCoach === coach.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full bg-[#1F1F1F] text-white px-3 py-2 rounded-md"
                      placeholder="Имя тренера"
                    />

                    <input
                      type="text"
                      value={editData.activities}
                      onChange={(e) =>
                        setEditData((p) => ({
                          ...p,
                          activities: e.target.value,
                        }))
                      }
                      className="w-full bg-[#1F1F1F] text-white px-3 py-2 rounded-md"
                      placeholder="Специализации"
                    />

                    <div className="space-y-2">
                      <label className="text-white block mb-2">
                        Расписание:
                      </label>
                      {Object.entries(editData.schedule || {}).map(
                        ([day, times], index) => (
                          <div key={day} className="flex gap-2">
                            <select
                              value={day}
                              onChange={(e) => {
                                const newSchedule = { ...editData.schedule };
                                const times = newSchedule[day];
                                delete newSchedule[day];
                                newSchedule[e.target.value] = times;
                                setEditData((prev) => ({
                                  ...prev,
                                  schedule: newSchedule,
                                }));
                              }}
                              className="bg-gray-600 text-white px-2 py-1 rounded-md flex-1"
                            >
                              {[
                                "monday",
                                "tuesday",
                                "wednesday",
                                "thursday",
                                "friday",
                                "saturday",
                                "sunday",
                              ].map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={
                                Array.isArray(times) ? times.join(", ") : ""
                              }
                              onChange={(e) => {
                                const newSchedule = { ...editData.schedule };
                                newSchedule[day] = e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter((t) => t);
                                setEditData((prev) => ({
                                  ...prev,
                                  schedule: newSchedule,
                                }));
                              }}
                              className="bg-[#1F1F1F] text-white px-2 py-1 rounded-md flex-1"
                              placeholder="10:00-11:00, 15:00-16:00"
                            />
                          </div>
                        )
                      )}
                    </div>

                    <input
                      type="text"
                      value={editData.price}
                      onChange={(e) =>
                        setEditData((p) => ({ ...p, price: e.target.value }))
                      }
                      className="w-full bg-[#1F1F1F] text-white px-3 py-2 rounded-md"
                      placeholder="Стоимость"
                    />

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleCoachUpdate(coach.id)}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white">
                      {coach.name || "Новый тренер"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {coach.activities?.map((activity, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-[#1F1F1F] text-sm rounded-full text-white"
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                    <div className="text-gray-300 space-y-1">
                      <p>
                        <span className="font-semibold">Расписание:</span>{" "}
                        {coach.schedule && typeof coach.schedule === "object"
                          ? Object.entries(coach.schedule)
                              .filter(
                                ([_, times]) =>
                                  Array.isArray(times) && times.length > 0
                              )
                              .map(
                                ([day, times]) => `${day}: ${times.join(", ")}`
                              )
                              .join("; ")
                          : "Не указано"}
                      </p>
                      <p>
                        <span className="font-semibold">Стоимость:</span>{" "}
                        {coach.price || "Не указана"}
                      </p>
                    </div>
                    <button
                      onClick={() => startEditing(coach)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md mt-2"
                    >
                      Редактировать
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageBackground>
  );
}
