import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "../widgets/Header/Header"; // Импортируем ваш компонент Header

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased m-0`}>
        <Header />
        <main className="">{children}</main>
      </body>
    </html>
  )
}
