import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X, Phone, ShieldCheck, Mail } from 'lucide-react';
import { LanguageCode } from '../types';
import LanguageSelector from './LanguageSelector';

interface HeaderProps {
  onScrollTo: (elementId: string) => void;
  sitePhone?: string;
  logo?: string;
}

export default function Header({ 
  onScrollTo, 
  sitePhone = "+998 90 613 46 66",
  logo = "/src/assets/images/gold_tooth_logo_1784383827217.jpg"
}: HeaderProps) {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'uz') as LanguageCode;

  const changeLanguage = (code: LanguageCode) => {
    i18n.changeLanguage(code);
  };

  const navigationItems = [
    { label: t('nav_home'), id: 'hero' },
    { label: t('nav_about'), id: 'about' },
    { label: t('nav_services'), id: 'services' },
    { label: t('nav_doctors'), id: 'doctors' },
    { label: t('nav_gallery'), id: 'gallery' },
    { label: t('nav_reviews'), id: 'reviews' },
    { label: t('nav_contact'), id: 'contact' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300 font-sans shadow-sm" id="site-header">
      {/* Main navigation header bar - Luxury White Glassmorphism */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-[#E2E8F0]/55 py-3 px-4 sm:px-6 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Branding */}
          <button 
            onClick={() => onScrollTo('hero')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[#FAF9F5] border border-amber-500/20 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
              <img 
                src={logo} 
                alt="Dr. Ilhom" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight text-slate-900 uppercase font-display leading-tight group-hover:text-[#C8922C] transition-colors">
                {t('clinic_title')}
              </span>
              <span className="block text-[9px] tracking-widest text-[#C8922C] font-mono uppercase font-bold">
                Premium Dental Clinic
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-5">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onScrollTo(item.id)}
                className="text-[13px] font-semibold text-slate-600 hover:text-[#C8922C] transition-colors cursor-pointer relative py-1 focus:outline-none after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-[2px] after:bg-[#C8922C] after:transition-all hover:after:w-full hover:after:left-0"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Action Widgets */}
          <div className="hidden xl:flex items-center gap-4">
            <LanguageSelector currentLang={currentLang} onChangeLang={changeLanguage} />
            
            <button
              onClick={() => onScrollTo('appointment')}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-[#C8922C] hover:to-[#A7761E] text-white hover:text-white font-extrabold text-xs tracking-wide shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer"
            >
              {t('hero_cta_book')}
            </button>
          </div>

          {/* Small devices burger menu toggle */}
          <div className="flex items-center gap-3 xl:hidden">
            <LanguageSelector currentLang={currentLang} onChangeLang={changeLanguage} />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Menyuni yopish" : "Menyuni ochish"}
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white/95 backdrop-blur-lg border-b border-slate-100 p-6 animate-in slide-in-from-top-4 duration-200 shadow-md">
          <nav className="flex flex-col gap-3">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onScrollTo(item.id);
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 border-b border-slate-100 text-xs font-bold text-slate-700 hover:text-[#C8922C] transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={() => {
                onScrollTo('appointment');
                setMobileMenuOpen(false);
              }}
              className="mt-2 w-full py-2.5 rounded-full bg-gradient-to-r from-[#C8922C] to-[#A7761E] text-white text-center font-extrabold text-xs cursor-pointer shadow-md"
            >
              {t('hero_cta_book')}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
