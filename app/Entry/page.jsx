"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageBackground } from "../../widgets/Background/BackgroundImage";
import { supabase } from "../../lib/supabase";

export default function BookingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [cardNumber, setCardNumber] = useState("");
  const [formattedCardNumber, setFormattedCardNumber] = useState("");
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Функция форматирования номера карты
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

  // Загрузка данных тренеров
  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        // Получаем данные тренеров напрямую
        const { data: coachesData, error: coachesError } = await supabase
          .from("coaches")
          .select("*");

        if (coachesError) throw coachesError;

        const formattedTrainers = (coachesData || []).map((trainer) => ({
          id: trainer.id,
          user_id: trainer.user_id,
          name: trainer.name || "Неизвестный тренер",
          activities: Array.isArray(trainer.activities)
            ? trainer.activities
            : [],
          schedule: Array.isArray(trainer.schedule) ? trainer.schedule : [],
          price: trainer.price || "500₽",
        }));

        console.log("Загруженные тренеры:", formattedTrainers);
        setTrainers(formattedTrainers);
      } catch (err) {
        console.error("Ошибка загрузки тренеров:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainers();

    // Подписка на изменения в реальном времени
    const coachesChannel = supabase.channel("coaches-changes");

    coachesChannel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaches" },
        () => {
          console.log("Обновление данных тренеров...");
          fetchTrainers();
        }
      )
      .subscribe();

    // Слушаем событие обновления данных тренера
    const handleCoachUpdate = () => {
      console.log("Получено событие обновления данных тренера");
      fetchTrainers();
    };

    window.addEventListener("coach-data-updated", handleCoachUpdate);

    return () => {
      supabase.removeChannel(coachesChannel);
      window.removeEventListener("coach-data-updated", handleCoachUpdate);
    };
  }, []);

  // Проверка авторизации
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

  const handleBookingClick = (trainer) => {
    setSelectedTrainer(trainer);
    user ? setIsPaymentModalOpen(true) : setIsAuthModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      // Получаем информацию о пользователе
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      // Сохраняем запись в таблицу user_forms
      const { error } = await supabase.from("user_forms").insert([
        {
          user_id: user.id,
          data: {
            form_type: "booking",
            coach_id: selectedTrainer.id,
            coach_name: selectedTrainer.name,
            user_name: userData.full_name || user.email,
            user_phone: userData.phone || "Не указан",
            session: `${selectedTrainer.schedule[0].day} ${selectedTrainer.schedule[0].time}`,
            price: selectedTrainer.price,
            payment_details: cardNumber.slice(-4),
            created_at: new Date().toISOString(),
          },
        },
      ]);

      if (error) throw error;

      alert("Запись успешно оформлена!");
      setIsPaymentModalOpen(false);
      setCardNumber("");
      setFormattedCardNumber("");
      setSelectedTrainer(null);
    } catch (err) {
      console.error("Ошибка оплаты:", err);
      alert("Ошибка: " + err.message);
    }
  };

  const handleAuthRedirect = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <PageBackground src="/images/general/back.png">
        <div className="text-center p-8 text-white">Загрузка тренеров...</div>
      </PageBackground>
    );
  }

  if (error) {
    return (
      <PageBackground src="/images/general/back.png">
        <div className="text-red-500 p-4 text-center">Ошибка: {error}</div>
      </PageBackground>
    );
  }

  return (
    <PageBackground src="/images/general/back.png">
      <section className="min-h-screen pt-16 sm:pt-24 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12 relative">
            <div className="inline-block bg-black/75 backdrop-blur-sm border-2 border-white rounded-full px-4 sm:px-8 py-3 sm:py-4">
              <span className="text-white drop-shadow-lg">
                Запись на занятия
              </span>
            </div>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {trainers.map((trainer) => (
              <div
                key={trainer.id}
                className="bg-[#1F1F1F] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-full"
              >
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      {trainer.name}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {trainer.activities.map((activity, i) => (
                        <span
                          key={i}
                          className="bg-white text-black text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full"
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 sm:mb-6 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
                      Расписание:
                    </h3>
                    <div className="space-y-1 sm:space-y-2">
                      {trainer.schedule.map((session, i) => (
                        <div
                          key={i}
                          className="flex items-center text-white text-sm sm:text-base"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-medium">{session.day}:</span>
                          <span className="ml-2">{session.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 pt-4 mt-auto">
                    <span className="text-xl sm:text-2xl font-bold text-white order-1 sm:order-none">
                      {trainer.price}
                    </span>
                    <button
                      onClick={() => handleBookingClick(trainer)}
                      className="w-full sm:w-auto bg-white hover:bg-gray-300 text-black font-medium px-4 sm:px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Записаться
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Модальные окна */}
          {isAuthModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#1F1F1F]/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md relative text-center">
                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 text-white/50 hover:text-white transition-colors text-xl sm:text-2xl"
                >
                  &times;
                </button>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                  Оплата
                </h2>
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

          {isPaymentModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#1F1F1F]/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md relative">
                <button
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedTrainer(null);
                    setCardNumber("");
                    setFormattedCardNumber("");
                  }}
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 text-white/50 hover:text-white transition-colors text-xl sm:text-2xl"
                >
                  &times;
                </button>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
                  Запись к {selectedTrainer?.name}
                </h2>
                <form
                  onSubmit={handlePaymentSubmit}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <label className="block text-white/80 mb-2">
                      Выберите день и время
                    </label>
                    <select
                      className="w-full bg-white/10 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    >
                      {selectedTrainer?.schedule.map((session, i) => (
                        <option
                          key={i}
                          value={`${session.day} ${session.time}`}
                        >
                          {session.day} {session.time}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">
                      Номер карты
                    </label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      className="w-full bg-white/10 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formattedCardNumber}
                      onChange={handleCardNumberChange}
                      maxLength={19}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaymentModalOpen(false);
                        setCardNumber("");
                        setFormattedCardNumber("");
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 sm:py-3 px-4 sm:px-6 transition-colors order-2 sm:order-1"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="bg-white hover:bg-gray-300 text-black font-bold rounded-lg py-2 sm:py-3 px-4 sm:px-6 transition-colors order-1 sm:order-2"
                    >
                      Оплатить {selectedTrainer?.price}
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
