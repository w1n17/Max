"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageBackground } from "../widgets/Background/BackgroundImage";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { LoadingSpinner } from "../widgets/common/LoadingSpinner/LoadingSpinner";

const plans = [
  {
    name: "Базовый",
    features: [
      "Доступ в зону кардио",
      "Доступ в тренажерный зал",
      "Консультация тренера 1 раз в месяц",
      "Групповые тренировки 2 раза в неделю",
    ],
    price: "1500₽",
  },
  {
    name: "Стандартный",
    features: [
      "Доступ в зону кардио",
      "Доступ в тренажерный зал",
      "Доступ в зону единоборств",
      "Консультация тренера 2 раза в месяц",
      "Групповые тренировки 4 раза в неделю",
    ],
    price: "2500₽",
  },
  {
    name: "Премиум",
    features: [
      "Доступ в зону кардио",
      "Доступ в тренажерный зал",
      "Доступ в зону единоборств",
      "Доступ к бассейну и сауне",
      "Консультация тренера 3 раза в месяц",
      "Групповые тренировки 6 раз в неделю",
    ],
    price: "5000₽",
  },
];

export default function Pricing() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cardNumber, setCardNumber] = useState("");
  const [formattedCardNumber, setFormattedCardNumber] = useState("");

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(" ") : value;
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value;
    setCardNumber(value);
    setFormattedCardNumber(formatCardNumber(value));
  };

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Ошибка загрузки профиля:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      loadProfile();
    }
  }, [authLoading, loadProfile]);

  const handlePurchaseClick = (plan) => {
    setSelectedPlan(plan);
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Пожалуйста, войдите в систему");
      return;
    }

    try {
      setIsLoading(true);

      const { data: formResult, error: formError } = await supabase
        .from("user_forms")
        .insert([
          {
            user_id: user.id,
            data: {
              form_type: "subscription",
              name: user.email,
              subscription_plan: selectedPlan.name,
              price: selectedPlan.price,
              features: selectedPlan.features,
              created_at: new Date().toISOString(),
            },
          },
        ])
        .select()
        .single();

      if (formError) throw formError;

      const { data: purchaseResult, error: purchaseError } = await supabase
        .from("purchases")
        .insert([
          {
            user_id: user.id,
            amount: parseInt(selectedPlan.price),
            status: "completed",
            transaction_id: `SUBSCRIPTION_${Date.now()}`,
          },
        ])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const { error: updateError } = await supabase
        .from("user_forms")
        .update({
          data: {
            ...formResult.data,
            purchase_id: purchaseResult.id,
          },
        })
        .eq("id", formResult.id);

      if (updateError) throw updateError;

      setIsPaymentModalOpen(false);
      setCardNumber("");
      setFormattedCardNumber("");
      alert("Абонемент успешно оплачен!");
      router.push("/");
    } catch (err) {
      console.error("Ошибка:", err);
      alert("Произошла ошибка: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthRedirect = () => {
    router.push("/");
  };

  // Показываем спиннер только при начальной загрузке авторизации
  if (authLoading) {
    return (
      <PageBackground src="/images/general/back.png">
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground src="/images/general/back.png">
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-160px)]">
          <div className="flex justify-center mb-16">
            <h1 className="text-4xl font-bold text-center relative">
              <div className="inline-block bg-black/75 backdrop-blur-sm border-2 border-white rounded-full px-8 py-4">
                <span className="text-white drop-shadow-lg">АБОНЕМЕНТЫ</span>
              </div>
            </h1>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="relative bg-[#1F1F1F]/90 backdrop-blur-sm rounded-3xl p-8 flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <h2 className="text-2xl font-bold text-white mb-6">
                    {plan.name}
                  </h2>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center text-gray-300"
                      >
                        <svg
                          className="w-5 h-5 mr-2 text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="text-center mt-auto">
                    <p className="text-3xl font-bold text-white mb-6">
                      {plan.price}
                      <span className="text-lg text-gray-400">/месяц</span>
                    </p>
                    <button
                      onClick={() => handlePurchaseClick(plan)}
                      className="inline-block w-full bg-white hover:bg-gray-300 text-black font-bold px-6 py-3 rounded-full transition-colors"
                      disabled={isLoading}
                    >
                      {isLoading ? <LoadingSpinner size="sm" /> : "Приобрести"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

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

          {isPaymentModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#1F1F1F]/90 backdrop-blur-sm rounded-3xl p-8 w-full max-w-md relative">
                <button
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setCardNumber("");
                    setFormattedCardNumber("");
                  }}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors text-2xl"
                >
                  &times;
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">
                  Оплата тарифа {selectedPlan?.name}
                </h2>

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
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaymentModalOpen(false);
                        setCardNumber("");
                        setFormattedCardNumber("");
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-lg py-3 px-6 transition-colors"
                      disabled={isLoading}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="bg-white hover:bg-gray-300 text-black font-bold rounded-lg py-3 px-6 transition-colors"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        `Оплатить ${selectedPlan?.price}`
                      )}
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
