export const translations = {
  en: {
    status: {
      model: 'Model',
      tokens: 'Tokens',
      cost: 'Cost',
      messages: 'Msgs',
      fps: 'FPS',
      rt: 'RT',
      mem: 'Mem',
    },
    overlay: {
      debugTitle: '=== TUI Component Tree ===',
      debugClose: 'Press any key to close',
    },
  },
  vi: {
    status: {
      model: 'Mô hình',
      tokens: 'Tokens',
      cost: 'Chi phí',
      messages: 'Tin nhắn',
      fps: 'FPS',
      rt: 'RT',
      mem: 'Bộ nhớ',
    },
    overlay: {
      debugTitle: '=== Cây thành phần TUI ===',
      debugClose: 'Nhấn phím bất kỳ để đóng',
    },
  },
};

export type Locale = keyof typeof translations;

export function t(locale: Locale, key: string, section: string): string {
  const sec = translations[locale]?.[section as keyof typeof translations[Locale]];
  if (sec && typeof sec === 'object' && key in sec) {
    return sec[key as keyof typeof sec];
  }
  return key; // fallback to key
}
