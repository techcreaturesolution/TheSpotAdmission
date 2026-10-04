import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const DICT = {
  en: {
    schools: 'Schools', colleges: 'Colleges', spot: 'Spot Admission', counselling: 'Counselling', news: 'News & Articles', compare: 'Compare',
    login: 'Login', register: 'Register', dashboard: 'Dashboard', logout: 'Logout',
    heroTitle: 'Find the right college or school', heroSub: 'Search, compare and enquire at schools and colleges across Gujarat — with live spot-admission seats and expert counselling.',
    searchPlaceholder: 'Search institution, course or city', search: 'Search', enquire: 'Enquire Now', apply: 'Apply Online', more: 'More',
  },
  gu: {
    schools: 'શાળાઓ', colleges: 'કોલેજો', spot: 'સ્પોટ એડમિશન', counselling: 'કાઉન્સેલિંગ', news: 'સમાચાર અને લેખ', compare: 'સરખામણી',
    login: 'લૉગિન', register: 'નોંધણી', dashboard: 'ડેશબોર્ડ', logout: 'લૉગઆઉટ',
    heroTitle: 'યોગ્ય કોલેજ અથવા શાળા શોધો', heroSub: 'ગુજરાતની શાળાઓ અને કોલેજો શોધો, સરખાવો અને પૂછપરછ કરો — લાઇવ સ્પોટ એડમિશન સીટ અને નિષ્ણાત કાઉન્સેલિંગ સાથે.',
    searchPlaceholder: 'સંસ્થા, કોર્સ અથવા શહેર શોધો', search: 'શોધો', enquire: 'પૂછપરછ કરો', apply: 'ઓનલાઇન અરજી', more: 'વધુ',
  },
  hi: {
    schools: 'स्कूल', colleges: 'कॉलेज', spot: 'स्पॉट एडमिशन', counselling: 'काउंसलिंग', news: 'समाचार और लेख', compare: 'तुलना करें',
    login: 'लॉगिन', register: 'रजिस्टर', dashboard: 'डैशबोर्ड', logout: 'लॉगआउट',
    heroTitle: 'सही कॉलेज या स्कूल खोजें', heroSub: 'गुजरात के स्कूल और कॉलेज खोजें, तुलना करें और पूछताछ करें — लाइव स्पॉट एडमिशन सीटों और विशेषज्ञ काउंसलिंग के साथ।',
    searchPlaceholder: 'संस्थान, कोर्स या शहर खोजें', search: 'खोजें', enquire: 'पूछताछ करें', apply: 'ऑनलाइन आवेदन', more: 'और',
  },
};

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'hi', label: 'हिंदी' },
];

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('tsa_lang') || 'en');
  useEffect(() => {
    localStorage.setItem('tsa_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);
  const t = useCallback((key) => DICT[lang]?.[key] || DICT.en[key] || key, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
