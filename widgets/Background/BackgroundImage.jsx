"use client";
import Image from "next/image";

export const PageBackground = ({ src, children }) => (
  <>
    {/* Фоновое изображение */}
    <div className="fixed inset-0 -z-50">
      <Image
        src={src}
        alt="Фон"
        fill
        priority
        quality={80}
        className="object-cover"
      />
    </div>

    {/* Контент страницы */}
    <div className="relative z-10 min-h-screen overflow-y-auto">{children}</div>
  </>
);
