"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageBackground } from "../../widgets/Background/BackgroundImage";
import { supabase } from "../../lib/supabase";
import { Modal } from "../../widgets/common/Modal/Modal";
import { LoadingSpinner } from "../../widgets/common/LoadingSpinner/LoadingSpinner";

export default function CoachPanel() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [activities, setActivities] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [price, setPrice] = useState("500₽");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userForms, setUserForms] = useState([]);
  const [selectedTab, setSelectedTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isFormsLoading, setIsFormsLoading] = useState(false);

  // Мемоизируем функцию проверки авторизации
  const checkAuth = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "coach") {
        router.push("/");
        return null;
      }

      return user;
    } catch (err) {
      console.error("Auth check error:", err);
      return null;
    }
  }, [router]);

  // Мемоизируем функцию загрузки форм
  const loadForms = useCallback(async () => {
    setIsFormsLoading(true);
    try {
      console.log("Загрузка форм для тренера:", user?.id);

      const { data: forms, error } = await supabase
        .from("user_forms")
        .select(
          `
          id,
          created_at,
          data,
          user_id,
          profiles:user_id (
            id,
            phone,
            role
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Загруженные формы:", forms);
      setUserForms(forms || []);
    } catch (error) {
      console.error("Error loading forms:", error);
      setError("Не удалось загрузить формы");
    } finally {
      setIsFormsLoading(false);
    }
  }, [user?.id]);

  // Используем useEffect с оптимизированными зависимостями
  useEffect(() => {
    const initialize = async () => {
      const authenticatedUser = await checkAuth();
      if (authenticatedUser) {
        setUser(authenticatedUser);
        await loadForms();
      }
      setLoading(false);
    };

    initialize();

    // Настраиваем интервал обновления
    const interval = setInterval(loadForms, 30000);
    return () => clearInterval(interval);
  }, [checkAuth, loadForms]);

  // Мемоизируем обработчик сохранения
  const handleSave = useCallback(async () => {
    if (!user?.id) {
      alert("Ошибка: пользователь не авторизован");
      return;
    }

    setIsSaving(true);
    try {
      const activitiesArray = activities
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a);

      const scheduleArray = schedule.filter((s) => s.day && s.time);

      // Сначала пытаемся создать новую запись
      let result = await supabase.from("coaches").insert([
        {
          user_id: user.id,
          name,
          activities: activitiesArray,
          schedule: scheduleArray,
          price,
        },
      ]);

      // Если запись уже существует, обновляем её
      if (result.error && result.error.code === "23505") {
        result = await supabase
          .from("coaches")
          .update({
            name,
            activities: activitiesArray,
            schedule: scheduleArray,
            price,
          })
          .eq("user_id", user.id);
      }

      if (result.error) throw result.error;

      alert("Данные успешно сохранены!");

      // Принудительно обновляем данные на странице записи
      const refreshEvent = new CustomEvent("coach-data-updated", {
        detail: { coachId: user.id },
      });
      window.dispatchEvent(refreshEvent);
    } catch (err) {
      console.error("Save error:", err);
      alert("Ошибка сохранения: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [activities, name, price, schedule, user?.id]);

  const addTimeSlot = useCallback(() => {
    setSchedule([...schedule, { day: "Пн", time: "10:00-11:00" }]);
  }, [schedule]);

  const updateTimeSlot = useCallback(
    (index, field, value) => {
      const newSchedule = schedule.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      );
      setSchedule(newSchedule);
    },
    [schedule]
  );

  // Добавляем функцию для тестовой записи
  const testAddForm = useCallback(async () => {
    try {
      // Создаем тестовую запись
      const { data, error } = await supabase
        .from("user_forms")
        .insert({
          user_id: user.id,
          data: {
            name: "Тестовый клиент",
            age: 25,
            gender: "male",
            form_type: "training_plan",
            goals: ["Набор массы", "Сила"],
            level: "Начинающий",
            injuries: "Нет",
            created_at: new Date().toISOString(),
          },
        })
        .select();

      if (error) {
        console.error("Ошибка при создании тестовой записи:", error);
        alert("Ошибка при создании тестовой записи: " + error.message);
        return;
      }

      console.log("Тестовая запись создана:", data);
      alert("Тестовая запись успешно создана!");

      // Перезагружаем формы
      await loadForms();
    } catch (err) {
      console.error("Ошибка:", err);
      alert("Произошла ошибка: " + err.message);
    }
  }, [user?.id, loadForms]);

  // Мемоизируем рендер профиля
  const renderProfileTab = useMemo(
    () => (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-white mb-2">Имя тренера</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/10 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3"
            placeholder="Введите ваше имя"
          />
        </div>

        <div>
          <label className="block text-white mb-2">Виды деятельности</label>
          <input
            type="text"
            value={activities}
            onChange={(e) => setActivities(e.target.value)}
            className="w-full bg-white/10 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3"
            placeholder="Бокс, Кроссфит, Йога"
          />
        </div>

        <div>
          <label className="block text-white mb-2">Расписание</label>
          <div className="space-y-3 sm:space-y-4">
            {schedule.map((slot, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-2 sm:gap-4"
              >
                <select
                  value={slot.day}
                  onChange={(e) => updateTimeSlot(index, "day", e.target.value)}
                  className="bg-white/10 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 w-full sm:w-1/2"
                >
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                    <option key={day} value={day} className="text-black/70">
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={slot.time}
                  onChange={(e) =>
                    updateTimeSlot(index, "time", e.target.value)
                  }
                  className="bg-white/10 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 w-full sm:w-1/2"
                  placeholder="10:00-11:00"
                />
              </div>
            ))}
            <button
              onClick={addTimeSlot}
              className="w-full sm:w-auto bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20"
            >
              + Добавить время
            </button>
          </div>
        </div>

        <div>
          <label className="block text-white mb-2">Стоимость занятия</label>
          <div className="relative">
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-white/10 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 pl-8"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`mt-4 sm:mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors w-full ${
            isSaving ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isSaving ? <LoadingSpinner size="sm" /> : "Сохранить изменения"}
        </button>
      </div>
    ),
    [
      name,
      activities,
      schedule,
      price,
      isSaving,
      handleSave,
      addTimeSlot,
      updateTimeSlot,
    ]
  );

  // Мемоизируем рендер клиентов
  const renderClientsTab = useMemo(
    () => (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            Заявки клиентов ({userForms?.length || 0})
          </h2>
        </div>
        {isFormsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : !userForms || userForms.length === 0 ? (
          <div className="text-white text-center py-4">
            <p>Пока нет заявок от клиентов</p>
            <p className="text-sm text-white/60 mt-2">
              Последняя проверка: {new Date().toLocaleTimeString()}
            </p>
          </div>
        ) : (
          userForms.map((form) => (
            <div key={form.id} className="bg-white/5 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-bold">
                    {form.data?.user_name || form.data?.name || "Без имени"}
                  </h3>
                  <p className="text-white/80">
                    Телефон:{" "}
                    {form.data?.user_phone ||
                      form.profiles?.phone ||
                      "Не указан"}
                  </p>
                  <p className="text-white/60 text-sm">ID формы: {form.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-white/60 text-sm block">
                    {new Date(form.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-white/60 text-sm block mt-1">
                    {new Date(form.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-white/80">
                {form.data?.form_type === "subscription" && (
                  <>
                    <div>
                      <p className="font-semibold">Тип: Покупка абонемента</p>
                      <p>Тариф: {form.data.subscription_plan}</p>
                      <p>Стоимость: {form.data.price}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Включено в абонемент:</p>
                      <ul className="list-disc list-inside">
                        {form.data.features?.map((feature, i) => (
                          <li key={i} className="text-sm">
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {form.data?.form_type === "booking" && (
                  <>
                    <div>
                      <p className="font-semibold">Тип: Запись на тренировку</p>
                      <p>Тренер: {form.data.coach_name}</p>
                      <p>Сессия: {form.data.session}</p>
                      <p>Стоимость: {form.data.price}</p>
                    </div>
                  </>
                )}

                {form.data?.form_type === "training_plan" && (
                  <>
                    <div>
                      <p className="font-semibold">Тип: План тренировок</p>
                      <p>Возраст: {form.data?.age || "Не указан"}</p>
                      <p>
                        Пол:{" "}
                        {form.data?.gender === "male" ? "Мужской" : "Женский"}
                      </p>
                      <p>Уровень: {form.data.level || "Не указан"}</p>
                    </div>
                    <div>
                      <p>
                        Цели:{" "}
                        {Array.isArray(form.data?.goals)
                          ? form.data.goals.join(", ")
                          : form.data?.goals || "Не указаны"}
                      </p>
                      <p>Травмы: {form.data.injuries || "Нет"}</p>
                    </div>
                  </>
                )}

                {form.data?.form_type === "meal_plan" && (
                  <>
                    <div>
                      <p className="font-semibold">Тип: План питания</p>
                      <p>Возраст: {form.data?.age || "Не указан"}</p>
                      <p>
                        Пол:{" "}
                        {form.data?.gender === "male" ? "Мужской" : "Женский"}
                      </p>
                      <p>Рост: {form.data.height || "Не указан"}</p>
                    </div>
                    <div>
                      <p>
                        Цели:{" "}
                        {Array.isArray(form.data?.goals)
                          ? form.data.goals.join(", ")
                          : form.data?.goals || "Не указаны"}
                      </p>
                      <p>
                        Предпочтения: {form.data.preferences || "Не указаны"}
                      </p>
                      <p>Ограничения: {form.data.restrictions || "Нет"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    ),
    [userForms, isFormsLoading, testAddForm]
  );

  const renderForm = (form) => {
    const formData = form.data;

    let content;
    if (formData.form_type === "training") {
      content = (
        <>
          <div>Возраст: {formData.age}</div>
          <div>Пол: {formData.gender}</div>
          <div>Уровень: {formData.level}</div>
          <div>Цели: {formData.goals}</div>
          <div>Травмы: {formData.injuries}</div>
        </>
      );
    } else if (formData.form_type === "meal") {
      content = (
        <>
          <div>Возраст: {formData.age}</div>
          <div>Пол: {formData.gender}</div>
          <div>Рост: {formData.height}</div>
          <div>Цели: {formData.goals}</div>
          <div>Предпочтения: {formData.preferences}</div>
          <div>Ограничения: {formData.restrictions}</div>
        </>
      );
    } else if (formData.form_type === "booking") {
      content = (
        <>
          <div>Тренер: {formData.coach_name}</div>
          <div>Сессия: {formData.session}</div>
          <div>Стоимость: {formData.price}</div>
        </>
      );
    } else if (formData.form_type === "subscription") {
      content = (
        <>
          <div>Тип: {formData.subscription_plan}</div>
          <div>Стоимость: {formData.price}</div>
          <div className="mt-2">
            <div className="font-semibold">Включено в абонемент:</div>
            <ul className="list-disc list-inside">
              {formData.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        </>
      );
    }

    return (
      <div key={form.id} className="bg-[#1F1F1F] rounded-xl p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              {formData.user_name || "Без имени"}
            </h3>
            <p className="text-gray-400">
              Телефон: {formData.user_phone || "Не указан"}
            </p>
            <p className="text-gray-400">ID формы: {form.id}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400">
              {new Date(formData.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-gray-300">{content}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <PageBackground src="/images/general/back.png">
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner />
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground src="/images/general/back.png">
      <div className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">
            Панель тренера
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={() => setSelectedTab("profile")}
              className={`px-4 sm:px-6 py-2 rounded-lg transition-colors w-full sm:w-auto ${
                selectedTab === "profile"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Мой профиль
            </button>
            <button
              onClick={() => setSelectedTab("clients")}
              className={`px-4 sm:px-6 py-2 rounded-lg transition-colors w-full sm:w-auto ${
                selectedTab === "clients"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Заявки клиентов
            </button>
          </div>

          <div className="bg-[#1F1F1F]/90 backdrop-blur-sm rounded-xl p-4 sm:p-6">
            {selectedTab === "profile" ? renderProfileTab : renderClientsTab}
          </div>
        </div>
      </div>
    </PageBackground>
  );
}
