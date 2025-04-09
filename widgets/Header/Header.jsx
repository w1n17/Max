"use client";
import React, { useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { LoadingSpinner } from "../common/LoadingSpinner/LoadingSpinner";
import { Modal } from "../common/Modal/Modal";
import { supabase } from "../../lib/supabase";

export default function Header() {
  const router = useRouter();
  const {
    user,
    isLoading: authLoading,
    error: authError,
    signIn,
    signOut,
  } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("login");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    phone: "",
    password: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const phoneInputRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";

  const formatPhoneNumber = useCallback((value) => {
    const numbers = value.replace(/\D/g, "").slice(0, 10);
    const match = numbers.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    let formatted = "";
    if (match[1]) formatted += `(${match[1]}`;
    if (match[2]) formatted += `) ${match[2]}`;
    if (match[3]) formatted += `-${match[3]}`;
    return formatted;
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await signIn(loginData.email, loginData.password);
      setIsModalOpen(false);
      resetModal();

      if (user.role === "admin") {
        router.push("/Admin");
      } else if (user.role === "coach") {
        router.push("/Coach");
      }
    } catch (error) {
      setStatusMessage(`Ошибка: ${error.message}`);
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => setStatusMessage(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { email, phone, password } = registerData;
      const formattedPhone = formatPhoneNumber(phone);

      // Сначала регистрируем пользователя
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone: formattedPhone,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!data?.user?.id) {
        throw new Error("Не удалось создать пользователя");
      }

      // Создаем запись в profiles вручную
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: data.user.id,
          email: email,
          phone: formattedPhone,
          role: "user",
          created_at: new Date().toISOString(),
        },
      ]);

      if (profileError) {
        console.error("Ошибка создания профиля:", profileError);
        // Продолжаем выполнение, так как профиль может быть создан через триггер
      }

      setStatusMessage(
        "Регистрация успешна! Проверьте email для подтверждения."
      );

      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }

      statusTimeoutRef.current = setTimeout(() => {
        setStatusMessage("");
        setIsModalOpen(false);
        resetModal();
      }, 5000);
    } catch (error) {
      console.error("Ошибка регистрации:", error);
      setStatusMessage(`Ошибка: ${error.message}`);
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => setStatusMessage(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      setStatusMessage(`Ошибка: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = useCallback(() => {
    setModalType("login");
    setLoginData({ email: "", password: "" });
    setRegisterData({ email: "", phone: "", password: "" });
    setStatusMessage("");
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
  }, []);

  const navigationLinks = useMemo(
    () => (
      <nav
        className={`${
          isMobileMenuOpen ? "flex" : "hidden"
        } md:flex flex-col md:flex-row gap-4 md:gap-8 ${
          isMobileMenuOpen
            ? "absolute top-full left-0 right-0 bg-[#1F1F1F] p-4 shadow-lg z-50"
            : ""
        }`}
      >
        <Link
          href="/Entry"
          className="text-white hover:text-blue-400 transition-colors text-base md:text-lg font-medium"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Запись на занятия
        </Link>
        <Link
          href="/TrainningPlan"
          className="text-white hover:text-blue-400 transition-colors text-base md:text-lg font-medium"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Тренировки
        </Link>
        <Link
          href="/MealPlan"
          className="text-white hover:text-blue-400 transition-colors text-base md:text-lg font-medium"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Питание
        </Link>
      </nav>
    ),
    [isMobileMenuOpen]
  );

  const renderAuthButtons = useMemo(() => {
    if (authLoading || isLoading) {
      return <LoadingSpinner size="sm" />;
    }

    if (user) {
      return (
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
          {isAdmin && (
            <Link
              href="/Admin"
              className="w-full md:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-center"
            >
              Админ-панель
            </Link>
          )}
          {isCoach && (
            <Link
              href="/Coach"
              className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-center"
            >
              Тренер
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-4 py-2 text-white hover:text-red-400 transition-colors"
            disabled={isLoading}
          >
            Выйти
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full md:w-auto px-4 py-2 text-white hover:text-blue-400 transition-colors"
        disabled={isLoading}
      >
        Личный кабинет
      </button>
    );
  }, [user, isAdmin, isCoach, isLoading, authLoading, handleLogout]);

  const renderLoginForm = useMemo(
    () => (
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-white mb-2">Email</label>
          <input
            type="email"
            value={loginData.email}
            onChange={(e) =>
              setLoginData({ ...loginData, email: e.target.value })
            }
            className="w-full px-4 py-3 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="example@mail.com"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-white mb-2">Пароль</label>
          <input
            type="password"
            value={loginData.password}
            onChange={(e) =>
              setLoginData({ ...loginData, password: e.target.value })
            }
            className="w-full px-4 py-3 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          disabled={isLoading}
        >
          {isLoading ? <LoadingSpinner size="sm" /> : "Войти"}
        </button>

        <div className="text-center text-white pt-4">
          Нет аккаунта?{" "}
          <button
            type="button"
            onClick={() => setModalType("register")}
            className="text-blue-400 hover:text-blue-300"
            disabled={isLoading}
          >
            Зарегистрироваться
          </button>
        </div>
      </form>
    ),
    [loginData, isLoading, handleLogin]
  );

  return (
    <>
      <header className="bg-[#1F1F1F] shadow-lg py-2 sm:py-4 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/">
                <img
                  src="/images/Header/logo.png"
                  alt="Логотип"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain hover:scale-105 transition-transform"
                />
              </Link>
              <div className="hidden sm:block text-white space-y-1">
                <p className="text-base sm:text-lg font-bold">График работы</p>
                <p className="text-xs sm:text-sm">Пн-Пт: 06:00–00:00</p>
                <p className="text-xs sm:text-sm">Сб-Вс: 08:00–22:00</p>
              </div>
            </div>

            <button
              className="md:hidden p-2 text-white hover:text-blue-400 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Открыть меню"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {navigationLinks}

            <div className="w-full md:w-auto flex justify-center md:justify-end">
              {renderAuthButtons}
            </div>
          </div>
        </div>
      </header>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetModal();
        }}
        title={modalType === "login" ? "Вход в систему" : "Регистрация"}
        isLoading={isLoading}
      >
        {statusMessage && (
          <div className="mb-4 text-center text-sm text-blue-400">
            {statusMessage}
          </div>
        )}

        {modalType === "login" ? (
          renderLoginForm
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-white mb-2">Email</label>
              <input
                type="email"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    email: e.target.value,
                  })
                }
                className="w-full px-4 py-3 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="example@mail.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-white mb-2">Телефон</label>
              <div className="relative">
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={registerData.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setRegisterData({ ...registerData, phone: formatted });
                  }}
                  className="w-full px-4 py-3 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-10"
                  placeholder="(999) 999-99-99"
                  required
                  disabled={isLoading}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
                  +7
                </span>
              </div>
            </div>

            <div>
              <label className="block text-white mb-2">Пароль</label>
              <input
                type="password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    password: e.target.value,
                  })
                }
                className="w-full px-4 py-3 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="sm" /> : "Зарегистрироваться"}
            </button>

            <div className="text-center text-white pt-4">
              Уже есть аккаунт?{" "}
              <button
                type="button"
                onClick={() => setModalType("login")}
                className="text-blue-400 hover:text-blue-300"
                disabled={isLoading}
              >
                Войти
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
