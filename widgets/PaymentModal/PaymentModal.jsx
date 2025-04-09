"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const PaymentModal = ({ isOpen, onClose, amount, onSubmit }) => {
  const [cardNumber, setCardNumber] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Проверка статуса аутентификации
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    if (isOpen) checkAuth();
  }, [isOpen]);

  // Обновление при изменениях аутентификации
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      onClose();
      router.push("/login");
      return;
    }

    try {
      // Валидация номера карты
      if (!/^\d{16}$/.test(cardNumber)) {
        alert("Неверный номер карты");
        return;
      }

      // Вызов обработчика оплаты
      await onSubmit(cardNumber);
      setCardNumber("");
      onClose();
    } catch (error) {
      console.error("Ошибка оплаты:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#1F1F1F] rounded-xl p-8 max-w-md w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">Оплата</h2>

        {loading ? (
          <div className="text-center text-white">Проверка статуса...</div>
        ) : user ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white mb-3">Номер карты</label>
              <input
                type="text"
                placeholder="0000 0000 0000 0000"
                className="w-full bg-gray-800 text-white rounded-lg p-3 focus:ring-2 focus:ring-white"
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))
                }
                inputMode="numeric"
                pattern="\d{16}"
                title="Введите 16-значный номер карты"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-white hover:bg-gray-300 text-black font-bold px-6 py-3 rounded-lg transition-colors"
              disabled={!cardNumber || cardNumber.length !== 16}
            >
              Оплатить {amount}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-white">Для оплаты необходимо авторизоваться</p>
            <button
              onClick={() => {
                onClose();
                router.push("/login");
              }}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Перейти к входу
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
