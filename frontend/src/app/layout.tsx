import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPLY - Options & Pairs Trading Platform",
  description: "Advanced financial analysis platform for options strategies and pairs trading",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-2">
                  <Image src="/logo.png" alt="Oply Logo" width={40} height={40} />
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800">OPLY</h1>
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  Home
                </Link>
                <Link href="/pairs-trading" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  Pairs Trading
                </Link>
                <Link href="/option-chain" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  Option Chain
                </Link>
                <Link href="/strategy-builder" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  Strategy Builder
                </Link>
                <Link href="/about" className="text-gray-700 hover:text-purple-600 px-3 py-2 text-sm font-medium">
                  About
                </Link>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button
                  id="mobile-menu-button"
                  className="text-gray-700 hover:text-purple-600 focus:outline-none focus:text-purple-600"
                  aria-label="Toggle menu"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div id="mobile-menu" className="hidden md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
                <Link 
                  href="/" 
                  className="text-gray-700 hover:text-purple-600 block px-3 py-2 text-base font-medium"
                >
                  Home
                </Link>
                <Link 
                  href="/pairs-trading" 
                  className="text-gray-700 hover:text-purple-600 block px-3 py-2 text-base font-medium"
                >
                  Pairs Trading
                </Link>
                <Link 
                  href="/option-chain" 
                  className="text-gray-700 hover:text-purple-600 block px-3 py-2 text-base font-medium"
                >
                  Option Chain
                </Link>
                <Link 
                  href="/strategy-builder" 
                  className="text-gray-700 hover:text-purple-600 block px-3 py-2 text-base font-medium"
                >
                  Strategy Builder
                </Link>
                <Link 
                  href="/about" 
                  className="text-gray-700 hover:text-purple-600 block px-3 py-2 text-base font-medium"
                >
                  About
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main>
          {children}
        </main>
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const mobileMenuButton = document.getElementById('mobile-menu-button');
              const mobileMenu = document.getElementById('mobile-menu');
              const menuIcon = mobileMenuButton.querySelector('svg');
              
              mobileMenuButton.addEventListener('click', function() {
                const isHidden = mobileMenu.classList.contains('hidden');
                
                if (isHidden) {
                  mobileMenu.classList.remove('hidden');
                  menuIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
                } else {
                  mobileMenu.classList.add('hidden');
                  menuIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
                }
              });
              
              // Close menu when clicking on a link
              const mobileLinks = mobileMenu.querySelectorAll('a');
              mobileLinks.forEach(link => {
                link.addEventListener('click', function() {
                  mobileMenu.classList.add('hidden');
                  menuIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />';
                });
              });
            });
          `
        }} />
        <Analytics />
      </body>
    </html>
  );
}
