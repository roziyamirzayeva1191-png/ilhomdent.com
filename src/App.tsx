import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Star, Phone, Mail, MapPin, Clock, Copy, ExternalLink,
  Check, Calendar, ShieldCheck, HeartPulse, Award,
  Sparkles, Send, ChevronLeft, ChevronRight, Activity, Smile,
  Scissors, Baby, Layers, Users, X, Instagram, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageCode, Appointment, Review, Doctor } from './types';
import { SERVICES, DOCTORS, GALLERY_ITEMS } from './data';
import Header from './components/Header';
import LuxuryBackground from './components/LuxuryBackground';

// Code splitting: the admin CMS (with recharts) and chat widget are loaded on demand,
// keeping them out of the public landing-page bundle.
const DashboardCMS = lazy(() => import('./components/DashboardCMS'));
const LiveChatWidget = lazy(() => import('./components/LiveChatWidget'));

// Map icon strings to Lucide components
const IconMap: Record<string, React.ComponentType<any>> = {
  Implant: HeartPulse,
  Braces: Activity,
  Sparkles: Sparkles,
  ShieldCheck: ShieldCheck,
  Smile: Smile,
  Baby: Baby,
  Scissors: Scissors,
  Activity: Activity,
  Layers: Layers,
  HeartPulse: HeartPulse
};

// Map service IDs to relevant premium Unsplash images for faded background use
const ServiceImageMap: Record<string, string> = {
  implants: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&q=80&w=400",
  ortho: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=400",
  cosmetic: "https://images.unsplash.com/photo-1513412527319-f004eed66294?auto=format&fit=crop&q=80&w=400",
  veneers: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400",
  whitening: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=400",
  pediatric: "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?auto=format&fit=crop&q=80&w=400",
  surgery: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=400",
  rootcanal: "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=400",
  prostho: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=400",
  periodon: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=400"
};

export default function App() {
  const { t, i18n } = useTranslation();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  
  // Admin CMS window state (opened only via the Ctrl+Alt+CapsLock+C hotkey)
  const [cmsOpen, setCmsOpen] = useState(false);

  // Live Dynamic State loaded from backend CMS
  const [services, setServices] = useState(SERVICES);
  const [doctors, setDoctors] = useState(DOCTORS);
  const [galleryItems, setGalleryItems] = useState(GALLERY_ITEMS);
  const [beforeAfter, setBeforeAfter] = useState({
    before: "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=800&h=600",
    after: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800&h=600"
  });
  const [allTranslations, setAllTranslations] = useState<any>({});
  const [logo, setLogo] = useState("/images/logo.webp");
  const [siteContacts, setSiteContacts] = useState({
    instagram: "https://instagram.com/dr_ilhom_dental",
    telegram: "https://t.me/dr_ilhom_dental",
    whatsapp: "https://wa.me/998712345678",
    phone: "+998 71 234 56 78",
    google_maps: "https://www.google.com/maps/place/41%C2%B016'58.4%22N+69%C2%B012'48.2%22E/@41.2829,69.2134,17z/",
    yandex_maps: "https://yandex.com/maps/?ll=69.2134%2C41.2829&z=17&pt=69.2134%2C41.2829"
  });

  // Real-time server states
  const [serverReviews, setServerReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 5, text: "" });
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState(false);

  // Booking Form state
  const [bookingForm, setBookingForm] = useState({
    name: "",
    phone: "",
    date: "",
    time: "10:00",
    department: SERVICES[0].id,
    doctor: DOCTORS[0].name,
    comments: ""
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Simple 404 handling for a single-page site: any path other than "/" shows Not Found.
  const [notFound] = useState(() => typeof window !== 'undefined' && window.location.pathname !== '/');

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'uz') as LanguageCode;

  // SEO: keep <html lang> (and RTL direction for Arabic) in sync with the selected language.
  useEffect(() => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  }, [currentLang]);

  // Sync dynamic translations from backend into i18next resource bundles on the fly
  useEffect(() => {
    if (allTranslations && Object.keys(allTranslations).length > 0) {
      Object.entries(allTranslations).forEach(([lang, dict]) => {
        if (dict && typeof dict === 'object') {
          i18n.addResourceBundle(lang, 'translation', dict, true, true);
        }
      });
    }
  }, [allTranslations, i18n]);

  // Fetch verified reviews from fullstack Express endpoints
  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setServerReviews(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch dynamic CMS data (services, doctors, texts, gallery) from backend store
  const fetchSiteData = async () => {
    try {
      const res = await fetch('/api/site-data');
      if (res.ok) {
        const data = await res.json();
        if (data.services) setServices(data.services);
        if (data.doctors) setDoctors(data.doctors);
        if (data.gallery) setGalleryItems(data.gallery);
        if (data.beforeAfter) setBeforeAfter(data.beforeAfter);
        if (data.translations) setAllTranslations(data.translations);
        if (data.contacts) setSiteContacts(data.contacts);
        if (data.logo) setLogo(data.logo);
      }
    } catch (err) {
      console.error("Error fetching site data:", err);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchSiteData();

    // Hotkey listener for admin panel: Alt + Ctrl + Caps Lock + C
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAlt = e.altKey;
      const isCtrl = e.ctrlKey;
      const isC = e.key && e.key.toLowerCase() === 'c';
      const isCapsLockActive = e.getModifierState && e.getModifierState('CapsLock');

      if (isAlt && isCtrl && isCapsLockActive && isC) {
        e.preventDefault();
        setCmsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.name || !bookingForm.phone || bookingSubmitting) return;
    setBookingSubmitting(true);
    setBookingError("");

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bookingForm.name,
          phone: bookingForm.phone,
          date: bookingForm.date,
          time: bookingForm.time,
          department: services.find(s => s.id === bookingForm.department)?.titleKey 
            ? t(services.find(s => s.id === bookingForm.department)!.titleKey)
            : bookingForm.department,
          doctor: bookingForm.doctor,
          comments: bookingForm.comments
        })
      });

      if (res.ok) {
        setBookingSuccess(true);
        setTimeout(() => {
          setBookingSuccess(false);
          setBookingForm({
            name: "",
            phone: "",
            date: "",
            time: "10:00",
            department: services[0]?.id || "implants",
            doctor: doctors[0]?.name || "Dr. Ilhom Abduvaliyev",
            comments: ""
          });
        }, 5000);
      } else {
        const data = await res.json().catch(() => ({}));
        setBookingError(data.error || "Yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");
      }
    } catch (err) {
      setBookingError("Server bilan ulanishda xatolik. Internet aloqangizni tekshiring.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name || !reviewForm.text || reviewSubmitting) return;
    setReviewSubmitting(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm)
      });

      if (res.ok) {
        setReviewSubmitSuccess(true);
        setReviewForm({ name: "", rating: 5, text: "" });
        fetchReviews();
        setTimeout(() => setReviewSubmitSuccess(false), 4000);
      }
    } catch (err) {
      // Network failure — the form stays filled so the user can retry.
    } finally {
      setReviewSubmitting(false);
    }
  };

  const copyCoordinates = () => {
    const coords = "41.2829, 69.2134"; // Tashkent, Chilonzor coordinates
    navigator.clipboard.writeText(coords);
    alert(t('contact_gps_copied'));
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Pre-fill doctor selection in appointment form
  const selectDoctorAndBook = (docName: string) => {
    setBookingForm(prev => ({ ...prev, doctor: docName }));
    scrollToSection('appointment');
  };

  // Helper to format currency
  const formatUzbekPrice = (val: number) => {
    return val.toLocaleString('uz-UZ');
  };

  // Simulated static gallery filter
  const [selectedGalleryCat, setSelectedGalleryCat] = useState('All');
  const filteredGallery = selectedGalleryCat === 'All'
    ? galleryItems
    : galleryItems.filter(item => item.category === selectedGalleryCat || (selectedGalleryCat === 'Before / After' && item.category === 'Before / After'));

  // 404 — Not Found page for any URL other than the site root
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFC] px-6 font-sans">
        <div className="max-w-md w-full text-center bg-white border border-slate-100 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.06)] p-10">
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500 mb-4 font-display">404</div>
          <h1 className="text-xl font-extrabold text-slate-900 mb-2">Sahifa topilmadi</h1>
          <p className="text-sm text-slate-500 mb-6">
            Siz izlagan sahifa mavjud emas yoki ko'chirilgan bo'lishi mumkin.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors"
          >
            Bosh sahifaga qaytish
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-slate-800 font-sans antialiased overflow-x-hidden selection:bg-amber-500 selection:text-white relative">
      
      {/* 10-Layer Luxury Background System */}
      <LuxuryBackground />

      {/* Global sticky header navigation */}
      <Header 
        onScrollTo={scrollToSection} 
        sitePhone={siteContacts.phone}
        logo={logo}
      />

      {/* MAIN BODY CONTENTS */}
      <main>
        
        {/* HERO SECTION */}
        <section id="hero" className="relative min-h-[82vh] flex items-center justify-center pt-16 pb-20 px-6 md:px-12 overflow-hidden bg-transparent border-b border-slate-100">
          
          {/* Subtle artistic sharp background of the premium clinic */}
          <div className="absolute inset-0 w-full h-full opacity-55 pointer-events-none z-0">
            <img
              src="/images/clinic-hero.webp"
              alt="Premium Dental Clinic Interior"
              width={1376}
              height={768}
              fetchPriority="high"
              className="w-full h-full object-cover object-center scale-100 filter brightness-105 contrast-100"
              referrerPolicy="no-referrer"
            />
            {/* Elegant premium white/blue/light-green radial overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/65 to-[#FCFCFC]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50/15 via-transparent to-transparent"></div>
          </div>

          <div className="max-w-4xl mx-auto w-full relative z-10 flex flex-col items-center text-center">
            
            {/* Premium badge */}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-extrabold tracking-wide mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>{t('hero_badge')}</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7.5xl font-extrabold text-slate-900 font-display tracking-tight leading-none mb-5">
              {t('hero_title').split(' ').map((word, i, arr) => (
                <span key={i} className={i >= arr.length - 2 ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500" : ""}>
                  {word}{' '}
                </span>
              ))}
            </h1>

            <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-8 max-w-2xl font-semibold">
              {t('hero_subtitle')}
            </p>

            {/* Address focused "Bizning Manzil" call-to-actions */}
            <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto mb-10 justify-center items-center">
              <button
                onClick={() => scrollToSection('contact')}
                className="px-10 py-4.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-emerald-500 text-white font-black text-sm tracking-wider shadow-[0_4px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.3)] transition-all duration-300 transform hover:scale-102 active:scale-95 flex items-center gap-2.5 cursor-pointer"
              >
                <MapPin className="w-4.5 h-4.5 text-white" />
                <span>BIZNING MANZIL / BIZGA KELISH</span>
              </button>

              <button
                onClick={() => scrollToSection('appointment')}
                className="px-8 py-4.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 font-extrabold text-sm tracking-wider shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span>{t('hero_cta_book')}</span>
              </button>
            </div>

            {/* Premium Stat Buttons under Hero text with Neon Shadows and Heartbeat rhythm */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full pt-8 border-t border-slate-200/50">
              
              <button 
                onClick={() => scrollToSection('about')}
                className="animate-heartbeat neon-shadow-blue bg-white border border-blue-200/50 rounded-2xl py-4 px-3 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 text-center cursor-pointer group"
              >
                <span className="text-2xl md:text-3xl font-black text-blue-600 font-display">15+</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mt-1 group-hover:text-blue-500 transition-colors">{t('stat_experience')}</span>
              </button>

              <button 
                onClick={() => scrollToSection('reviews')}
                className="animate-heartbeat neon-shadow-green bg-white border border-emerald-200/50 rounded-2xl py-4 px-3 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 text-center cursor-pointer group"
                style={{ animationDelay: '0.2s' }}
              >
                <span className="text-2xl md:text-3xl font-black text-emerald-600 font-display">5000+</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mt-1 group-hover:text-emerald-500 transition-colors">{t('stat_patients')}</span>
              </button>

              <button 
                onClick={() => scrollToSection('doctors')}
                className="animate-heartbeat neon-shadow-blue bg-white border border-blue-200/50 rounded-2xl py-4 px-3 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 text-center cursor-pointer group"
                style={{ animationDelay: '0.4s' }}
              >
                <span className="text-2xl md:text-3xl font-black text-blue-600 font-display">25+</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mt-1 group-hover:text-blue-500 transition-colors">{t('stat_doctors')}</span>
              </button>

              <button 
                onClick={() => scrollToSection('about')}
                className="animate-heartbeat neon-shadow-green bg-white border border-emerald-200/50 rounded-2xl py-4 px-3 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 text-center cursor-pointer group"
                style={{ animationDelay: '0.6s' }}
              >
                <span className="text-2xl md:text-3xl font-black text-emerald-600 flex items-center gap-1 font-display justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" /> 100%
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mt-1 group-hover:text-emerald-500 transition-colors">{t('stat_guarantee')}</span>
              </button>

            </div>

          </div>
        </section>

        {/* ABOUT SECTION (WHY CHOOSE US) */}
        <section id="about" className="py-14 px-6 md:px-12 bg-transparent border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8922C]">{t('nav_about')}</span>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-950 font-display tracking-tight mt-2 mb-4">
                {t('about_title')}
              </h2>
              <p className="text-slate-600 text-sm md:text-base">
                {t('about_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
              
              {/* Left Column: Premium Lobby Image */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-3xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.04)] border border-slate-100 aspect-[4/3] group bg-white">
                  <img
                    src="/images/clinic-interior.webp"
                    alt="Dr Ilhom Dental Clinic Premium Reception"
                    width={1200}
                    height={896}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Floating Certificate Badge */}
                <div className="absolute -bottom-6 -right-4 bg-white/95 border border-amber-500/20 rounded-2xl p-4 shadow-[0_12px_35px_rgba(0,0,0,0.06)] flex items-center gap-3 hover:shadow-[0_15px_45px_rgba(245,158,11,0.15)] transition-shadow duration-300">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-[#C8922C]">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-950 font-display">ISO 9001</div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Certified Clinic Quality</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Achievements & Points list */}
              <div className="lg:col-span-7 flex flex-col items-start">
                
                <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8 font-medium">
                  {t('about_text')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full mb-8">
                  
                  <div className="p-5 rounded-2xl bg-white/85 border border-[#E2E8F0]/80 hover:border-[#C8922C] hover:shadow-[0_0_20px_rgba(200,146,44,0.3)] hover:-translate-y-1 transition-all duration-300 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#C8922C] mb-4">
                      <Smile className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">{t('about_point_1')}</h4>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/85 border border-[#E2E8F0]/80 hover:border-[#C8922C] hover:shadow-[0_0_20px_rgba(200,146,44,0.3)] hover:-translate-y-1 transition-all duration-300 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#C8922C] mb-4">
                      <Users className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">{t('about_point_2')}</h4>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/85 border border-[#E2E8F0]/80 hover:border-[#C8922C] hover:shadow-[0_0_20px_rgba(200,146,44,0.3)] hover:-translate-y-1 transition-all duration-300 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#C8922C] mb-4">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">{t('about_point_3')}</h4>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/85 border border-[#E2E8F0]/80 hover:border-[#C8922C] hover:shadow-[0_0_20px_rgba(200,146,44,0.3)] hover:-translate-y-1 transition-all duration-300 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#C8922C] mb-4">
                      <Award className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">{t('about_point_4')}</h4>
                  </div>

                </div>

                <button
                  onClick={() => scrollToSection('services')}
                  className="px-6 py-3 rounded-full bg-slate-950 hover:bg-[#C8922C] text-xs font-bold text-white transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.02]"
                >
                  {t('about_more_btn')}
                </button>

              </div>

            </div>

          </div>
        </section>

        {/* SERVICES SECTION */}
        <section id="services" className="py-14 px-6 md:px-12 bg-transparent border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8922C]">{t('nav_services')}</span>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-950 font-display tracking-tight mt-2 mb-4">
                {t('services_title')}
              </h2>
              <p className="text-slate-600 text-sm md:text-base">
                {t('services_subtitle')}
              </p>
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {services.map((serv) => {
                const IconComp = IconMap[serv.iconName] || HeartPulse;
                return (
                  <div 
                    key={serv.id} 
                    className="relative overflow-hidden p-6 rounded-3xl bg-white/85 border border-[#E2E8F0]/80 hover:border-[#C8922C] shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_0_25px_rgba(200,146,44,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group text-left"
                  >
                    {/* Blurred/faded background image */}
                    <div className="absolute inset-0 w-full h-full opacity-[0.24] group-hover:opacity-[0.38] pointer-events-none transition-all duration-500 z-0 select-none">
                      <img 
                        src={serv.image || ServiceImageMap[serv.id] || "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400"} 
                        alt="" 
                        className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-all duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; // Prevent infinite loop
                          target.src = "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400";
                        }}
                      />
                      {/* Subtle elegant gradient overlay to blend perfectly with white background card */}
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-transparent"></div>
                    </div>

                    <div className="relative z-10 flex flex-col justify-between h-full w-full">
                      <div>
                        {/* Gold subtle icon */}
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-[#C8922C] mb-6 group-hover:scale-105 transition-transform duration-300">
                          <IconComp className="w-6 h-6 text-[#C8922C]" />
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 font-display mb-3 tracking-tight leading-snug">
                          {t(serv.titleKey) || serv.titleKey}
                        </h3>

                        <p className="text-[12px] text-slate-650 leading-relaxed mb-6 font-medium">
                          {t(serv.descKey) || serv.descKey}
                        </p>
                      </div>

                      <div>
                        {/* Price & Book Button */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{t('services_from')}</span>
                            <span className="block text-xs font-mono font-bold text-[#C8922C]">
                              {formatUzbekPrice(serv.priceFrom)} {serv.currency}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setBookingForm(prev => ({ ...prev, department: serv.id }));
                              scrollToSection('appointment');
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-[#C8922C] text-white hover:text-white transition-all duration-200 text-[11px] font-bold cursor-pointer"
                          >
                            {t('services_book_btn')}
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* DOCTORS SECTION */}
        <section id="doctors" className="py-14 px-6 md:px-12 bg-transparent border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8922C]">{t('nav_doctors')}</span>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-950 font-display tracking-tight mt-2 mb-4">
                {t('doctors_title')}
              </h2>
              <p className="text-slate-600 text-sm md:text-base">
                {t('doctors_subtitle')}
              </p>
            </div>

            {/* Premium Doctor profile cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {doctors.map((doc) => (
                <div 
                  key={doc.id}
                  className="rounded-3xl bg-white/85 border border-[#E2E8F0]/80 p-5 hover:border-[#C8922C] shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_0_25px_rgba(200,146,44,0.3)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left"
                >
                  <div>
                    {/* Portrait Frame */}
                    <div className="relative rounded-2xl overflow-hidden aspect-square mb-6 border border-slate-100 bg-slate-50">
                      <img 
                        src={doc.image} 
                        alt={doc.name} 
                        className="w-full h-full object-cover object-top hover:scale-102 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0]/80 text-[10px] font-mono font-bold text-[#C8922C] shadow-sm">
                        {doc.experience} {t('doc_experience')}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-950 font-display mb-1">{doc.name}</h3>
                    <p className="text-xs text-[#C8922C] font-bold mb-4">{t(doc.specializationKey)}</p>

                    {/* Certificates / Bullet info */}
                    <ul className="space-y-1.5 mb-6 text-[11px] text-slate-600 border-t border-slate-100 pt-4 font-medium">
                      {doc.certificates.map((cert, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#C8922C] mt-0.5">•</span>
                          <span>{cert}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => selectDoctorAndBook(doc.name)}
                    className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-[#C8922C] text-white hover:text-white transition-all duration-200 text-xs font-bold cursor-pointer shadow-sm"
                  >
                    {t('doc_book_consult')}
                  </button>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* GALLERY SECTION */}
        <section id="gallery" className="py-14 px-6 md:px-12 bg-transparent border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 text-left">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#C8922C]">{t('nav_gallery')}</span>
                <h2 className="text-3xl md:text-5xl font-bold text-slate-950 font-display tracking-tight mt-2 mb-2">
                  {t('gallery_title')}
                </h2>
                <p className="text-slate-600 text-sm max-w-xl font-medium">
                  {t('gallery_subtitle')}
                </p>
              </div>
            </div>

            {/* Interactive Before & After comparative Slider */}
            <div className="mb-16">
              <div className="text-center mb-6">
                <span className="inline-block text-[10px] uppercase tracking-widest text-blue-600 font-mono font-extrabold bg-blue-50 px-3.5 py-1.5 rounded-full mb-2">Taqqoslash Slayderi</span>
                <h3 className="text-lg font-black text-slate-900 font-display">Oldin va Keyin Natija Solishtiruvchi</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Slayderni chapga va o'ngga surib klinikamiz natijasini solishtirib ko'ring</p>
              </div>
              
              <div 
                className="relative w-full max-w-4xl mx-auto aspect-[16/10] sm:aspect-[16/9] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-150 select-none cursor-ew-resize"
                onMouseMove={(e) => {
                  if (isDraggingSlider || e.buttons === 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
                  }
                }}
                onTouchMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (e.touches[0]) {
                    const x = e.touches[0].clientX - rect.left;
                    setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
                  }
                }}
                onMouseDown={() => setIsDraggingSlider(true)}
                onMouseUp={() => setIsDraggingSlider(false)}
                onTouchStart={() => setIsDraggingSlider(true)}
                onTouchEnd={() => setIsDraggingSlider(false)}
              >
                {/* After Image - Background */}
                <img 
                  src={beforeAfter.after} 
                  alt="Keyin" 
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] uppercase font-mono tracking-wider px-3 py-1.5 rounded-full font-black z-10 shadow-md">
                  Keyin (Natija)
                </div>

                {/* Before Image - Clip-masked overlay */}
                <img 
                  src={beforeAfter.before} 
                  alt="Oldin" 
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  referrerPolicy="no-referrer"
                  style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                />
                <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] uppercase font-mono tracking-wider px-3 py-1.5 rounded-full font-black z-10 shadow-md">
                  Oldin
                </div>

                {/* Vertical Divider line */}
                <div 
                  className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                  style={{ left: `${sliderPosition}%` }}
                >
                  {/* Slider Knob */}
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-lg z-30">
                    <div className="flex gap-1 text-blue-500 font-bold text-xs select-none">
                      <span>◀</span><span>▶</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Consolidated Masonry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleryItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setLightboxImage(item.image)}
                  className="group relative rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.12)] border border-[#E2E8F0]/80 hover:border-amber-500/35 aspect-[4/3] bg-white cursor-pointer transition-all duration-300"
                >
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 text-left">
                    <span className="text-[10px] tracking-widest uppercase text-amber-400 font-mono mb-1">{item.category}</span>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section id="reviews" className="py-14 px-6 md:px-12 bg-transparent border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8922C]">{t('nav_reviews')}</span>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-950 font-display tracking-tight mt-2 mb-4">
                {t('reviews_title')}
              </h2>
              <p className="text-slate-600 text-sm md:text-base">
                {t('reviews_subtitle')}
              </p>
            </div>

            {/* Review Cards Grid + Live Write Review Column */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
              {/* List of Reviews (Left 8 cols) */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {serverReviews.map((rev) => (
                  <div 
                    key={rev.id}
                    className="p-6 rounded-3xl bg-white/85 border border-[#E2E8F0]/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.12)] hover:border-amber-500/35 transition-all duration-300 flex flex-col justify-between text-left"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-xs text-[#C8922C]">
                            {rev.name.charAt(0)}
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-slate-950">{rev.name}</span>
                            <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {t('reviews_verified')}
                            </span>
                          </div>
                        </div>
                        
                        <span className="text-[10px] font-mono font-bold text-slate-400">{rev.date}</span>
                      </div>

                      {/* Stars */}
                      <div className="flex text-amber-500 text-xs mb-3">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                        ))}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium italic">
                        "{rev.text}"
                      </p>

                      {rev.reply && (
                        <div className="mt-4 pl-3 border-l-2 border-sky-300 bg-sky-50/60 rounded-r-xl py-2 px-3">
                          <span className="block text-[10px] font-bold text-sky-700 uppercase tracking-wide mb-1">
                            Klinika javobi
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed">{rev.reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Leave a review Form (Right 4 cols) */}
              <div className="lg:col-span-4 p-6 rounded-3xl bg-white/90 border border-slate-200/80 shadow-[0_15px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.12)] transition-all duration-300 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-sm font-bold text-slate-950 font-display mb-2">{t('reviews_write_btn')}</h3>
                  <p className="text-xs text-slate-500 mb-6 font-medium">Fikrlaringiz bizning xizmat sifatimizni oshiradi.</p>

                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1.5 font-bold">{t('reviews_name_placeholder')}</label>
                      <input
                        type="text"
                        required
                        value={reviewForm.name}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('reviews_name_placeholder')}
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C8922C]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1.5 font-bold">Rating</label>
                      <select
                        value={reviewForm.rating}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C8922C]"
                      >
                        <option value="5">★★★★★ (5/5)</option>
                        <option value="4">★★★★☆ (4/5)</option>
                        <option value="3">★★★☆☆ (3/5)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1.5 font-bold">Review message</label>
                      <textarea
                        required
                        rows={3}
                        value={reviewForm.text}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, text: e.target.value }))}
                        placeholder={t('reviews_text_placeholder')}
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C8922C] resize-none"
                      />
                    </div>

                    {reviewSubmitSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] font-bold">
                        Review submitted successfully! Thank you.
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-slate-950 hover:bg-[#C8922C] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      {t('reviews_submit')}
                    </button>
                  </form>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* APPOINTMENT SECTION */}
        <section id="appointment" className="py-14 px-6 md:px-12 bg-transparent border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
              
              {/* Left Column Text details */}
              <div className="lg:col-span-5 flex flex-col items-start text-left">
                <span className="text-xs font-bold uppercase tracking-widest text-[#C8922C]">{t('nav_appointment')}</span>
                <h2 className="text-3xl md:text-5xl font-bold text-slate-950 font-display tracking-tight mt-2 mb-4">
                  {t('booking_title')}
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                  {t('booking_subtitle')}
                </p>

                <div className="space-y-4 w-full">
                  <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0]/80 flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-[#C8922C]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-950">Shoshilinch tibbiy yordam</h4>
                      <p className="text-xs text-[#C8922C] font-bold mt-0.5">+998 90 613 46 66</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0]/80 flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-[#C8922C]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-950">Full Hygiene Sterilization</h4>
                      <p className="text-xs text-slate-500 mt-0.5">ISO-certified hygiene & sterilization safety protocols.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column Booking Form */}
              <div className="lg:col-span-7 bg-white/95 border border-[#E2E8F0]/80 p-8 rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.08)] transition-all duration-300 relative overflow-hidden">
                
                {bookingSuccess && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-6">
                      <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950 mb-2">Arizangiz qabul qilindi!</h3>
                    <p className="text-xs text-slate-600 max-w-sm mb-6 font-semibold">
                      {t('booking_success')}
                    </p>
                    <button
                      onClick={() => setBookingSuccess(false)}
                      className="px-6 py-2 rounded-full bg-slate-950 hover:bg-[#C8922C] text-xs text-white font-bold transition-all cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                )}

                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 font-bold">
                        {t('booking_name')}
                      </label>
                      <input
                        type="text"
                        required
                        value={bookingForm.name}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={t('booking_name_ph')}
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] focus:ring-1 focus:ring-[#C8922C] rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 font-bold">
                        {t('booking_phone')}
                      </label>
                      <input
                        type="tel"
                        required
                        value={bookingForm.phone}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder={t('booking_phone_ph')}
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] focus:ring-1 focus:ring-[#C8922C] rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none transition-all"
                      />
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 font-bold">
                        {t('booking_date')}
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] focus:ring-1 focus:ring-[#C8922C] rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 font-bold">
                        {t('booking_service')}
                      </label>
                      <select
                        value={bookingForm.department}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] focus:ring-1 focus:ring-[#C8922C] rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none"
                      >
                        {SERVICES.map(s => (
                          <option key={s.id} value={s.id} className="bg-white text-slate-800">
                            {t(s.titleKey) || s.titleKey}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 font-bold">
                        {t('booking_doctor')}
                      </label>
                      <select
                        value={bookingForm.doctor}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, doctor: e.target.value }))}
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] focus:ring-1 focus:ring-[#C8922C] rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none"
                      >
                        {DOCTORS.map(d => (
                          <option key={d.id} value={d.name} className="bg-white text-slate-800">
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 font-bold">
                      {t('booking_comments')}
                    </label>
                    <textarea
                      rows={3}
                      value={bookingForm.comments}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, comments: e.target.value }))}
                      placeholder={t('booking_comments_ph')}
                      className="w-full bg-slate-50/80 border border-slate-200 focus:border-[#C8922C] focus:ring-1 focus:ring-[#C8922C] rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {bookingError && (
                    <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      {bookingError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full py-4 rounded-2xl bg-slate-950 hover:bg-[#C8922C] disabled:opacity-60 disabled:cursor-wait text-white font-extrabold text-sm tracking-wide shadow-sm hover:shadow-md cursor-pointer transition-colors duration-300"
                  >
                    {bookingSubmitting ? "Yuborilmoqda..." : t('booking_submit')}
                  </button>
                </form>

              </div>

            </div>

          </div>
        </section>

             {/* MAPS & LOCATOR SECTION */}
        <section id="contact" className="py-14 px-6 md:px-12 bg-transparent border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto">
            
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8922C]">{t('nav_contact')}</span>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-950 font-display tracking-tight mt-2 mb-4">
                {t('contact_title')}
              </h2>
              <p className="text-slate-600 text-sm md:text-base">
                {t('contact_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
              
              {/* Information Card (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0]/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_0_25px_rgba(200,146,44,0.3)] hover:border-[#C8922C] hover:-translate-y-1 transition-all duration-300">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-[#C8922C]">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-950 mb-2">Clinic Address</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-bold">{t('contact_address')}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0]/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_0_25px_rgba(200,146,44,0.3)] hover:border-[#C8922C] hover:-translate-y-1 transition-all duration-300">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-[#C8922C]">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-950 mb-2">Working Hours</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-bold">{t('contact_hours')}</p>
                      <p className="text-[10px] text-emerald-600 mt-2 font-extrabold">{t('contact_hours_sub')}</p>
                    </div>
                  </div>
                </div>

                {/* Telefon & Aloqa Card */}
                <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0]/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_0_25px_rgba(200,146,44,0.3)] hover:border-[#C8922C] hover:-translate-y-1 transition-all duration-300">
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-[#C8922C]">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-950 mb-2">Telefon & Aloqa</h4>
                      <p className="text-sm text-[#C8922C] font-extrabold font-mono mb-1.5">
                        <a href={`tel:${siteContacts.phone.replace(/\s+/g, '')}`} className="hover:underline">{siteContacts.phone}</a>
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                        Shuningdek <a href={siteContacts.telegram} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">Telegram</a> yoki <a href={siteContacts.whatsapp} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">WhatsApp</a> orqali yozishingiz mumkin.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={copyCoordinates}
                    className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#C8922C] transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-[#C8922C]" />
                    <span>{t('contact_copy_gps')}</span>
                  </button>

                  <a
                    href="https://geoportal.uz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-950 hover:bg-[#C8922C] text-white transition-all text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('contact_get_directions')}</span>
                  </a>
                </div>
              </div>

              {/* Map Frames (8 cols) */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Google Map Mock Frame */}
                <a 
                  href={siteContacts.google_maps || "https://www.google.com/maps/place/41%C2%B016'58.4%22N+69%C2%B012'48.2%22E/@41.2829,69.2134,17z/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-3xl border border-blue-500/20 overflow-hidden bg-slate-950 h-72 relative group shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.25)] hover:border-blue-500/40 transition-all duration-300 cursor-pointer"
                >
                  {/* Real Clinic environment background image */}
                  <img
                    src="/images/clinic-hero.webp"
                    alt="Clinic Location Map Background"
                    width={1376}
                    height={768}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700 filter brightness-75 grayscale-20"
                    referrerPolicy="no-referrer"
                  />
                  {/* Glassmorphic overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-950/40"></div>

                  <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/25 backdrop-blur-sm text-blue-200 border border-blue-400/30 font-mono text-[9px] uppercase font-bold tracking-wider">Google Maps</span>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-blue-500/20 backdrop-blur-md flex items-center justify-center text-blue-400 mx-auto mb-3 border border-blue-400/30 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-lg">
                        <MapPin className="w-7 h-7 animate-bounce" />
                      </div>
                      <h4 className="text-sm font-black text-white mb-1">Dr Ilhom Dental Clinic</h4>
                      <p className="text-[10px] text-slate-300 font-mono font-bold">Toshkent, Chilonzor (Google Maps)</p>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-300 font-bold">
                      <span>Chilonzor, Tashkent</span>
                      <span className="text-blue-400 hover:text-white hover:underline cursor-pointer flex items-center gap-1">
                        <span>Xaritada ochish (Open)</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </a>

                {/* Yandex Map Mock Frame */}
                <a 
                  href={siteContacts.yandex_maps || "https://yandex.com/maps/?ll=69.2134%2C41.2829&z=17&pt=69.2134%2C41.2829"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-3xl border border-yellow-500/20 overflow-hidden bg-slate-950 h-72 relative group shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_40px_rgba(234,179,8,0.25)] hover:border-yellow-500/40 transition-all duration-300 cursor-pointer"
                >
                  {/* Real Clinic environment background image */}
                  <img
                    src="/images/clinic-interior.webp"
                    alt="Clinic Location Yandex Background"
                    width={1200}
                    height={896}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700 filter brightness-75 grayscale-20"
                    referrerPolicy="no-referrer"
                  />
                  {/* Glassmorphic overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-950/40"></div>

                  <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-1 rounded-md bg-yellow-500/25 backdrop-blur-sm text-yellow-200 border border-yellow-400/30 font-mono text-[9px] uppercase font-bold tracking-wider">Yandex Navigator</span>
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-yellow-500/20 backdrop-blur-md flex items-center justify-center text-yellow-400 mx-auto mb-3 border border-yellow-400/30 group-hover:scale-110 group-hover:bg-yellow-500 group-hover:text-black transition-all duration-300 shadow-lg">
                        <MapPin className="w-7 h-7 animate-bounce" />
                      </div>
                      <h4 className="text-sm font-black text-white mb-1">Доктор Ильхом Стоматология</h4>
                      <p className="text-[10px] text-slate-300 font-mono font-bold">Ташкент, Чиланзар (Yandex Карты)</p>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-300 font-bold">
                      <span>Чиланзар, Ташкент</span>
                      <span className="text-yellow-400 hover:text-white hover:underline cursor-pointer flex items-center gap-1">
                        <span>Xaritada ochish (Open)</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </a>

              </div>

            </div>

          </div>
        </section>

        {/* PROMOTIONAL NEWSLETTER SECTION */}
        <section className="py-16 px-6 md:px-12 bg-white/80 border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-left lg:max-w-xl">
              <h3 className="text-sm font-bold text-slate-950 font-display mb-2">{t('footer_newsletter')}</h3>
              <p className="text-xs text-slate-600 font-bold">Bizning yangi aksiyalarimiz va foydali tibbiy maslahatlarimizdan birinchilardan bo'lib boxabar bo'ling!</p>
            </div>

            <div className="flex gap-2 w-full lg:w-auto max-w-md">
              <input 
                type="email" 
                placeholder={t('footer_newsletter_ph')} 
                className="flex-1 min-w-[200px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#C8922C] focus:ring-1 focus:ring-[#C8922C]"
              />
              <button 
                onClick={() => alert('Obuna bo\'linganingiz uchun rahmat!')}
                className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-[#C8922C] text-white text-xs font-bold transition-all shadow-md whitespace-nowrap cursor-pointer"
              >
                {t('footer_subscribe')}
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* LIGHT PREMIUM LUXURY FOOTER */}
      <footer className="bg-white/90 border-t border-slate-100 text-slate-600 text-xs py-6 px-4 sm:px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-left">
          
          {/* Column 1 Branding */}
          <div className="space-y-1">
             <div className="flex items-center gap-1.5">
               <div className="relative w-6 h-6 rounded-full overflow-hidden bg-slate-50 border border-[#E2E8F0] flex items-center justify-center shadow-sm">
                 <img 
                   src={logo} 
                   alt="Dr. Ilhom" 
                   className="w-full h-full object-cover"
                   referrerPolicy="no-referrer"
                 />
               </div>
               <span className="text-sm font-bold text-slate-950 uppercase font-display tracking-tight">{t('clinic_title')}</span>
             </div>
             <p className="text-slate-500 leading-relaxed text-[10px] font-semibold">{t('footer_text')}</p>
          </div>

          {/* Column 2 Services */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-950 font-display uppercase tracking-widest mb-1.5">Services</h4>
            <ul className="space-y-1 text-[10px] font-semibold">
              {services.slice(0, 5).map(s => (
                <li key={s.id}>
                  <button onClick={() => scrollToSection('services')} className="hover:text-[#C8922C] transition-colors cursor-pointer text-slate-600">{t(s.titleKey)}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 Quick Links */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-950 font-display uppercase tracking-widest mb-1.5">Quick Links</h4>
            <ul className="space-y-1 text-[10px] font-semibold">
              <li><button onClick={() => scrollToSection('about')} className="hover:text-[#C8922C] transition-colors cursor-pointer text-slate-600">{t('nav_about')}</button></li>
              <li><button onClick={() => scrollToSection('doctors')} className="hover:text-[#C8922C] transition-colors cursor-pointer text-slate-600">{t('nav_doctors')}</button></li>
              <li><button onClick={() => scrollToSection('gallery')} className="hover:text-[#C8922C] transition-colors cursor-pointer text-slate-600">{t('nav_gallery')}</button></li>
              <li><button onClick={() => scrollToSection('reviews')} className="hover:text-[#C8922C] transition-colors cursor-pointer text-slate-600">{t('nav_reviews')}</button></li>
            </ul>
          </div>

          {/* Column 4 Hours */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-950 font-display uppercase tracking-widest mb-1.5">Contact Info</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed mb-0.5 font-semibold">{t('contact_address')}</p>
            <p className="text-[10px] text-[#C8922C] font-extrabold font-mono mb-0.5">
              <a href={`tel:${siteContacts.phone.replace(/\s+/g, '')}`} className="hover:underline">{siteContacts.phone}</a>
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">
              <span>Murojaat uchun: </span>
              <a href={siteContacts.telegram} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">Telegram</a>
              <span> yoki </span>
              <a href={siteContacts.whatsapp} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">WhatsApp</a>
            </p>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-3 border-t border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 text-[10px] font-extrabold text-center">
          <span>© 2026 {t('footer_rights')}</span>

          {/* Elegant Animated Creator Attribution - Created by ULUG'BEK +998906134666 (static badge, not a control) */}
          <motion.div
            animate={{
              scale: [1, 1.03, 1],
              boxShadow: ["0 0 0px rgba(200,146,44,0)", "0 0 10px rgba(200,146,44,0.12)", "0 0 0px rgba(200,146,44,0)"]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-slate-700 shadow-sm text-[9px] sm:text-[10px]"
          >
            <span>Created by</span>
            <span className="bg-gradient-to-r from-[#C8922C] to-amber-600 bg-clip-text text-transparent font-extrabold tracking-wider uppercase">
              ULUG'BEK
            </span>
            <span className="text-[#C8922C] font-mono tracking-tight border-l border-slate-200 pl-1.5 ml-0.5">+998906134666</span>
          </motion.div>
        </div>
      </footer>

      {/* Dynamic live chat widget */}
      <Suspense fallback={null}>
        <LiveChatWidget />
      </Suspense>

      {/* Floating Pulse Action Social Buttons on Bottom Left */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex flex-col gap-2.5 sm:gap-3 items-center">
        {/* Phone Call Icon with Concentric Ripples */}
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 2.3, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-amber-500 pointer-events-none"
          />
          <motion.div 
            animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
            transition={{ duration: 2.3, delay: 0.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-amber-400 pointer-events-none"
          />
          <a
            href={`tel:${siteContacts.phone.replace(/\s+/g, '')}`}
            className="relative z-10 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 text-[#0F172A] shadow-[0_0_12px_rgba(245,158,11,0.35)] hover:shadow-[0_0_22px_rgba(245,158,11,0.6)] hover:scale-110 active:scale-95 transition-all duration-300"
            title="Qo'ng'iroq"
            aria-label="Telefon orqali qo'ng'iroq qilish"
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
        </div>

        {/* Telegram Icon with Concentric Ripples */}
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-sky-500 pointer-events-none"
          />
          <motion.div 
            animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
            transition={{ duration: 2.2, delay: 0.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-sky-400 pointer-events-none"
          />
          <a
            href={siteContacts.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-sky-400 to-sky-600 text-white shadow-[0_0_12px_rgba(14,165,233,0.35)] hover:shadow-[0_0_22px_rgba(14,165,233,0.6)] hover:scale-110 active:scale-95 transition-all duration-300"
            title="Telegram"
            aria-label="Telegram orqali yozish"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 -mr-0.5 -mt-0.5 rotate-45" />
          </a>
        </div>

        {/* Instagram Icon with Concentric Ripples */}
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-pink-500 pointer-events-none"
          />
          <motion.div 
            animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
            transition={{ duration: 2.4, delay: 0.9, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-pink-400 pointer-events-none"
          />
          <a
            href={siteContacts.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.35)] hover:shadow-[0_0_22px_rgba(236,72,153,0.6)] hover:scale-110 active:scale-95 transition-all duration-300"
            title="Instagram"
            aria-label="Instagram sahifamiz"
          >
            <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
        </div>

        {/* WhatsApp Icon with Concentric Ripples */}
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-emerald-500 pointer-events-none"
          />
          <motion.div 
            animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
            transition={{ duration: 2.1, delay: 0.7, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-emerald-400 pointer-events-none"
          />
          <a
            href={siteContacts.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-emerald-400 to-green-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:shadow-[0_0_22px_rgba(16,185,129,0.6)] hover:scale-110 active:scale-95 transition-all duration-300"
            title="WhatsApp"
            aria-label="WhatsApp orqali yozish"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
        </div>
      </div>

      {/* CMS Admin Panel Modal Overlay */}
      <AnimatePresence>
        {cmsOpen && (
          <div className="fixed inset-0 bg-[#0F172A]/90 backdrop-blur-md z-50 overflow-y-auto p-4 sm:p-6 md:p-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-7xl mx-auto relative flex flex-col"
            >
              {/* Dashboard close header bar */}
              <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span className="font-bold uppercase tracking-wider text-xs">Klinika Boshqaruv Tizimi (CMS)</span>
                </div>
                <button 
                  onClick={() => {
                    setCmsOpen(false);
                    fetchSiteData(); // Refresh App state with newly saved CMS values
                  }}
                  className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all focus:outline-none flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Yopish (Chiqish)</span>
                </button>
              </div>

              {/* Mounted DashboardCMS */}
              <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-[80vh]">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-24 text-slate-400 text-sm font-semibold">
                      Boshqaruv paneli yuklanmoqda...
                    </div>
                  }
                >
                  <DashboardCMS
                    language={i18n.resolvedLanguage as LanguageCode || 'uz'}
                    isOpen={cmsOpen}
                    onClose={() => {
                      setCmsOpen(false);
                      fetchSiteData();
                    }}
                    onRefreshSiteData={fetchSiteData}
                  />
                </Suspense>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gallery Lightbox Overlay */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <button
              onClick={() => setLightboxImage(null)}
              aria-label="Rasmni yopish"
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all focus:outline-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={lightboxImage} 
              alt="Clinic Lightbox View" 
              className="max-w-full max-h-[85vh] rounded-2xl border border-slate-800 object-contain shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
