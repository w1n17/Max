"use client";
import { useRouter } from "next/navigation";

export default function AuthPaymentModal({
  type,
  price,
  onClose,
  onPaymentSubmit,
  cardNumber,
  setCardNumber,
}) {
  const router = useRouter();

  return (
    <>
      {type && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1F1F1F]/90 rounded-3xl p-8 w-full max-w-md relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-2xl text-white/50 hover:text-white"
            >
              &times;
            </button>

            {type === "auth" ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Требуется авторизация
                </h2>
                <p className="text-white mb-6">
                  Для продолжения необходимо войти в систему
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full py-3 bg-white hover:bg-gray-300 text-black rounded-lg transition-colors"
                >
                  Перейти к входу
                </button>
              </div>
            ) : (
              <form onSubmit={onPaymentSubmit} className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Оплата занятия
                </h2>
                <div>
                  <label className="block text-white/80 mb-2">
                    Номер карты
                  </label>
                  <input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="bg-white hover:bg-gray-300 text-black py-3 rounded-lg font-bold"
                  >
                    Оплатить {price}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
