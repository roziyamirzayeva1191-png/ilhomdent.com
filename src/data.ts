import { Doctor, DentalService, LanguageInfo } from "./types";

export const LANGUAGES: LanguageInfo[] = [
  { code: 'uz', name: 'O\'zbekcha', flag: '🇺🇿' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
];

export const SERVICES: DentalService[] = [
  {
    id: "implants",
    titleKey: "service_implants_title",
    descKey: "service_implants_desc",
    iconName: "Implant",
    priceFrom: 3500000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "ortho",
    titleKey: "service_ortho_title",
    descKey: "service_ortho_desc",
    iconName: "Braces",
    priceFrom: 2000000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "cosmetic",
    titleKey: "service_cosmetic_title",
    descKey: "service_cosmetic_desc",
    iconName: "Sparkles",
    priceFrom: 1000000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1513412527319-f004eed66294?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "veneers",
    titleKey: "service_veneers_title",
    descKey: "service_veneers_desc",
    iconName: "ShieldCheck",
    priceFrom: 1500000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "whitening",
    titleKey: "service_whitening_title",
    descKey: "service_whitening_desc",
    iconName: "Smile",
    priceFrom: 800000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "pediatric",
    titleKey: "service_pediatric_title",
    descKey: "service_pediatric_desc",
    iconName: "Baby",
    priceFrom: 100000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "surgery",
    titleKey: "service_surgery_title",
    descKey: "service_surgery_desc",
    iconName: "Scissors",
    priceFrom: 400000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "rootcanal",
    titleKey: "service_root_title",
    descKey: "service_root_desc",
    iconName: "Activity",
    priceFrom: 300000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "prostho",
    titleKey: "service_prostho_title",
    descKey: "service_prostho_desc",
    iconName: "Layers",
    priceFrom: 1200000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: "periodon",
    titleKey: "service_periodon_title",
    descKey: "service_periodon_desc",
    iconName: "HeartPulse",
    priceFrom: 250000,
    currency: "so'm",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=400"
  }
];

export const DOCTORS: Doctor[] = [
  {
    id: "doc-ilhom",
    name: "Dr. Ilhom Abduvaliyev",
    specializationKey: "doc_ilhom_specialty",
    experience: 15,
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400&h=400",
    socials: { telegram: "@dr_ilhom", phone: "+998901234567", instagram: "@dr_ilhom_dental", facebook: "dr.ilhom.dental" },
    certificates: ["International Implantology Diploma (Germany)", "FDI World Dental Federation Member"]
  },
  {
    id: "doc-malika",
    name: "Dr. Malika Karimova",
    specializationKey: "doc_malika_specialty",
    experience: 10,
    image: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=400&h=400",
    socials: { telegram: "@dr_malika_ortho", phone: "+998931234567", instagram: "@malika_braces" },
    certificates: ["European Orthodontics Congress Certificate", "Invisalign Certified Specialist"]
  },
  {
    id: "doc-saidbek",
    name: "Dr. Saidbek Nurmatov",
    specializationKey: "doc_saidbek_specialty",
    experience: 8,
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400&h=400",
    socials: { telegram: "@dr_saidbek", phone: "+998977654321", facebook: "saidbek.nurmatov" },
    certificates: ["Advanced Endodontics Micro-surgery (Seoul)", "Esthetic Dentistry Award 2024"]
  },
  {
    id: "doc-dildora",
    name: "Dr. Dildora Rustamova",
    specializationKey: "doc_dildora_specialty",
    experience: 6,
    image: "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&q=80&w=400&h=400",
    socials: { telegram: "@dr_dildora_kids", phone: "+998949998877", instagram: "@dildora_pediatric_dentist" },
    certificates: ["Pediatric Dental Traumatology Specialist", "Child Psychology in Dental Care Course"]
  }
];

export const GALLERY_ITEMS = [
  {
    id: "gal-1",
    title: "Modern Surgery Room",
    category: "Equipment",
    image: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=800&h=600"
  },
  {
    id: "gal-2",
    title: "Clinic Lounge Area",
    category: "Interior",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800&h=600"
  },
  {
    id: "gal-3",
    title: "Dr. Ilhom Performing Implant",
    category: "Treatment",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800&h=600"
  },
  {
    id: "gal-4",
    title: "Pediatric Friendly Cabinet",
    category: "Interior",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800&h=600"
  },
  {
    id: "gal-5",
    title: "3D Dental Scanner",
    category: "Equipment",
    image: "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&q=80&w=800&h=600"
  },
  {
    id: "gal-6",
    title: "Veneers Smile Design",
    category: "Before / After",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800&h=600"
  }
];
