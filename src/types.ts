export interface Appointment {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  department: string;
  doctor: string;
  comments: string;
  status: 'Pending' | 'Approved' | 'Completed' | 'Cancelled';
  createdAt: string;
  reply?: string;
  replyDate?: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  status: 'Pending' | 'Approved';
  reply?: string;
  replyDate?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specializationKey: string; // key for translations
  experience: number;
  image: string;
  socials: {
    telegram?: string;
    phone?: string;
    instagram?: string;
    facebook?: string;
  };
  certificates: string[];
}

export interface DentalService {
  id: string;
  titleKey: string;
  descKey: string;
  iconName: string;
  priceFrom: number;
  currency: string;
  image?: string;
}

export type LanguageCode = 'uz' | 'en' | 'ru' | 'ar' | 'zh' | 'ko' | 'fr' | 'hi';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  flag: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
