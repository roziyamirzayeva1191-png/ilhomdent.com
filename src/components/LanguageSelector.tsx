import React, { useState } from 'react';
import { LanguageCode } from '../types';
import { LANGUAGES } from '../data';
import { ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  currentLang: LanguageCode;
  onChangeLang: (code: LanguageCode) => void;
}

// Map language codes to country codes for flagcdn
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  uz: 'uz',
  en: 'gb',
  ru: 'ru',
  ar: 'sa',
  zh: 'cn',
  ko: 'kr',
  fr: 'fr',
  hi: 'in'
};

export default function LanguageSelector({ currentLang, onChangeLang }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLang = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];
  const selectedCountry = LANGUAGE_TO_COUNTRY[currentLang] || currentLang;

  return (
    <div className="relative z-50" id="lang-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black transition-all shadow-sm cursor-pointer hover:border-amber-500/30 focus:outline-none"
      >
        <img 
          src={`https://flagcdn.com/w40/${selectedCountry}.png`}
          alt={selectedLang.name}
          className="w-4.5 h-3 object-cover rounded-sm shadow-sm border border-slate-100"
          referrerPolicy="no-referrer"
        />
        <span className="uppercase tracking-wider font-extrabold text-[10px] text-slate-700">{currentLang === 'en' ? 'EN' : currentLang.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-white border border-slate-100 shadow-xl p-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 gap-0.5">
            {LANGUAGES.map((lang) => {
              const countryCode = LANGUAGE_TO_COUNTRY[lang.code] || lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    onChangeLang(lang.code);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    currentLang === lang.code
                      ? 'bg-amber-500/10 text-amber-700 font-extrabold'
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                >
                  <img 
                    src={`https://flagcdn.com/w40/${countryCode}.png`}
                    alt={lang.name}
                    className="w-4 h-3 object-cover rounded-sm shadow-sm border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <span className="uppercase tracking-wider text-[10px]">{lang.code === 'en' ? 'EN' : lang.code.toUpperCase()}</span>
                  {currentLang === lang.code && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-amber-500"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

