"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageBackground } from "../../widgets/Background/BackgroundImage";
import { supabase } from "../../lib/supabase";

export default function BookingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    goals: [],
    height: "",
    measurements: "",
    preferences: "",
    restrictions: "",
    intolerances: "",
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [formattedCardNumber, setFormattedCardNumber] = useState("");

  // Проверка статуса авторизации
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value;
    setCardNumber(value);
    setFormattedCardNumber(formatCardNumber(value));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    // Проверка заполнения обязательных полей
    if (
      !formData.name ||
      !formData.age ||
      !formData.gender ||
      formData.goals.length === 0 ||
      !formData.height ||
      !formData.measurements ||
      !formData.preferences
    ) {
      alert("Пожалуйста, заполните все обязательные поля!");
      return;
    }

    // Проверка авторизации пользователя
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    // Если пользователь авторизован - открываем оплату
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Проверяем наличие пользователя
    if (!user || !user.id) {
      alert("Пожалуйста, войдите в систему");
      return;
    }

    // Проверяем валидность номера карты
    const cardNumberClean = cardNumber.replace(/\s+/g, "");
    if (cardNumberClean.length < 16) {
      alert("Пожалуйста, введите корректный номер карты");
      return;
    }

    try {
      // Сохраняем данные формы
      const { data: formResult, error: formError } = await supabase
        .from("user_forms")
        .insert([
          {
            user_id: user.id,
            data: {
              form_type: "meal_plan",
              name: formData.name,
              age: parseInt(formData.age) || 0,
              gender: formData.gender,
              goals: Array.isArray(formData.goals) ? formData.goals : [],
              height: parseInt(formData.height) || 0,
              measurements: formData.measurements,
              preferences: formData.preferences,
              restrictions: formData.restrictions || "",
              intolerances: formData.intolerances || "",
            },
          },
        ])
        .select()
        .single();

      if (formError) {
        console.error("Ошибка при сохранении формы:", formError.message);
        throw formError;
      }

      // Создаем запись об оплате без service_id
      const { data: purchaseResult, error: purchaseError } = await supabase
        .from("purchases")
        .insert([
          {
            user_id: user.id,
            amount: 1000,
            status: "completed",
            transaction_id: `MEAL_PLAN_${Date.now()}`,
          },
        ])
        .select()
        .single();

      if (purchaseError) {
        console.error("Ошибка при создании платежа:", purchaseError.message);
        throw purchaseError;
      }

      // Обновляем форму с ID платежа
      const { error: updateError } = await supabase
        .from("user_forms")
        .update({
          data: {
            ...formResult.data,
            purchase_id: purchaseResult.id,
          },
        })
        .eq("id", formResult.id);

      if (updateError) {
        console.error("Ошибка при обновлении формы:", updateError.message);
        throw updateError;
      }

      // Закрываем модальное окно и очищаем данные
      setIsPaymentModalOpen(false);
      setCardNumber("");
      setFormattedCardNumber("");

      // Показываем уведомление об успехе
      alert(
        "Спасибо! Ваша заявка принята. Мы свяжемся с вами в ближайшее время."
      );

      // Перенаправляем на главную страницу
      router.push("/");
    } catch (error) {
      console.error("Детали ошибки:", error);
      alert(
        error.message ||
          "Произошла ошибка при обработке вашей заявки. Пожалуйста, попробуйте снова."
      );
    }
  };

  const handleCheckboxChange = (goal) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const handleAuthRedirect = () => {
    router.push("/Entry");
  };

  return (
    <PageBackground src="/images/general/back.png">
      <section className="min-h-screen pt-12 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-12 relative">
            <div className="inline-block bg-black/75 backdrop-blur-sm border-2 border-white rounded-full px-8 py-4">
              <span className="text-white drop-shadow-lg">
                Индивидуальный план питания
              </span>
            </div>
          </h1>

          <form
            onSubmit={handleFormSubmit}
            className="bg-[#1F1F1F]/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl space-y-8"
          >
            {/* Личные данные */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Личные данные
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Имя"
                  className="bg-white/10 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <input
                  type="number"
                  placeholder="Возраст"
                  className="bg-white/10 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  required
                />
                <select
                  className="bg-white/10 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  required
                >
                  <option value="" className="text-black/70">
                    Пол
                  </option>
                  <option value="male" className="text-black/70">
                    Мужской
                  </option>
                  <option value="female" className="text-black/70">
                    Женский
                  </option>
                </select>
              </div>
            </div>

            {/* Цели питания */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Цели питания
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Похудение", "Набор мышечной массы", "Поддержание формы"].map(
                  (goal) => (
                    <label
                      key={goal}
                      className="flex items-center space-x-2 bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-500"
                        checked={formData.goals.includes(goal)}
                        onChange={() => handleCheckboxChange(goal)}
                      />
                      <span className="text-white">{goal}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Метрики тела */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Метрики тела
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Рост (см)"
                  className="bg-white/10 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.height}
                  onChange={(e) =>
                    setFormData({ ...formData, height: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Объем талии и бёдер (см)"
                  className="bg-white/10 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.measurements}
                  onChange={(e) =>
                    setFormData({ ...formData, measurements: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {/* Пищевые предпочтения */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Пищевые предпочтения
              </h2>
              <textarea
                className="w-full bg-white/10 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                placeholder="Различные диеты..."
                value={formData.preferences}
                onChange={(e) =>
                  setFormData({ ...formData, preferences: e.target.value })
                }
                required
              />
            </div>

            {/* Ограничения */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Неприемлемые продукты
                  </h3>
                  <textarea
                    className="w-full bg-white/10 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                    value={formData.restrictions}
                    onChange={(e) =>
                      setFormData({ ...formData, restrictions: e.target.value })
                    }
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Непереносимость продуктов
                  </h3>
                  <textarea
                    className="w-full bg-white/10 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                    value={formData.intolerances}
                    onChange={(e) =>
                      setFormData({ ...formData, intolerances: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Стоимость и оплата */}
            <div className="border-t border-white/20 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="text-2xl font-bold text-white">
                  Стоимость услуги: <span className="text-white">1000₽</span>
                </div>
                <button
                  type="submit"
                  className="bg-white hover:bg-gray-300 text-black font-bold px-8 py-3 rounded-lg transition-colors text-lg"
                >
                  Оплатить
                </button>
              </div>
            </div>
          </form>

          {/* Модальное окно авторизации */}
          {isAuthModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#1F1F1F]/90 backdrop-blur-sm rounded-3xl p-8 w-full max-w-md relative text-center">
                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl"
                >
                  &times;
                </button>

                <h2 className="text-2xl font-bold text-white mb-4">Оплата</h2>
                <p className="text-white mb-6">
                  Для оплаты необходимо авторизоваться
                </p>

                <button
                  onClick={handleAuthRedirect}
                  className="bg-white hover:bg-gray-300 text-black font-bold px-6 py-3 rounded-full transition-colors w-full"
                >
                  Перейти к входу
                </button>
              </div>
            </div>
          )}

          {/* Модальное окно оплаты */}
          {isPaymentModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#1F1F1F]/90 backdrop-blur-sm rounded-3xl p-8 w-full max-w-md relative">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl"
                >
                  &times;
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">Оплата</h2>

                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <div>
                    <label className="block text-white/80 mb-2">
                      Номер карты
                    </label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      className="w-full bg-white/10 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formattedCardNumber}
                      onChange={handleCardNumberChange}
                      maxLength={19}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg py-3 px-6 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="bg-white hover:bg-gray-300 text-black font-bold rounded-lg py-3 px-6 transition-colors"
                      id="payment-button"
                      name="payment-button"
                    >
                      Оплатить 1000₽
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageBackground>
  );
}
