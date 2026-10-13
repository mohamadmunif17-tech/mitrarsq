// Mushaf order, 1–114. References: https://quran.com (chapter index).
// Alternative spellings are explicit; unknown names are never assigned a guessed number.
const names = `Al-Fatihah|Al-Baqarah|Ali Imran|An-Nisa|Al-Maidah|Al-Anam|Al-Araf|Al-Anfal|At-Tawbah|Yunus|Hud|Yusuf|Ar-Rad|Ibrahim|Al-Hijr|An-Nahl|Al-Isra|Al-Kahf|Maryam|Taha|Al-Anbiya|Al-Hajj|Al-Muminun|An-Nur|Al-Furqan|Ash-Shuara|An-Naml|Al-Qasas|Al-Ankabut|Ar-Rum|Luqman|As-Sajdah|Al-Ahzab|Saba|Fatir|Ya-Sin|As-Saffat|Sad|Az-Zumar|Ghafir|Fussilat|Ash-Shura|Az-Zukhruf|Ad-Dukhan|Al-Jathiyah|Al-Ahqaf|Muhammad|Al-Fath|Al-Hujurat|Qaf|Adh-Dhariyat|At-Tur|An-Najm|Al-Qamar|Ar-Rahman|Al-Waqiah|Al-Hadid|Al-Mujadilah|Al-Hashr|Al-Mumtahanah|As-Saff|Al-Jumuah|Al-Munafiqun|At-Taghabun|At-Talaq|At-Tahrim|Al-Mulk|Al-Qalam|Al-Haqqah|Al-Maarij|Nuh|Al-Jinn|Al-Muzzammil|Al-Muddaththir|Al-Qiyamah|Al-Insan|Al-Mursalat|An-Naba|An-Naziat|Abasa|At-Takwir|Al-Infitar|Al-Mutaffifin|Al-Inshiqaq|Al-Buruj|At-Tariq|Al-Ala|Al-Ghashiyah|Al-Fajr|Al-Balad|Ash-Shams|Al-Layl|Ad-Duha|Ash-Sharh|At-Tin|Al-Alaq|Al-Qadr|Al-Bayyinah|Az-Zalzalah|Al-Adiyat|Al-Qariah|At-Takathur|Al-Asr|Al-Humazah|Al-Fil|Quraysh|Al-Maun|Al-Kawthar|Al-Kafirun|An-Nasr|Al-Masad|Al-Ikhlas|Al-Falaq|An-Nas`.split('|');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const order = new Map(names.map((name,i) => [normalize(name),i+1]));
const aliases = {
  1:['Al-Fatihah','Al-Fatiha'],3:['Al Imran'],9:['At-Taubah'],20:['Ta Ha','Tha Ha','Thaha'],21:['Al-Anbya'],
  26:['Asy-Syuara'],28:['Al-Qashash'],35:['Fathir'],36:['Yasin'],37:['Ash-Shaffat'],38:['Shad'],
  40:['Al-Mumin'],41:['Fushshilat'],42:['Asy-Syura','Ash-Shuraa'],45:['Al-Jasiyah','Al-Jatsiyah'],
  51:['Az-Zariyat','Adz-Dzariyat'],52:['Ath-Thur'],57:['Al-Hadiid'],58:['Al-Mujadila'],59:['Al-Hasyr'],
  61:['As-Saf','Ash-Shaff'],65:['At-Talaaq','Ath-Thalaq'],74:['Al-Muddassir','Al-Muddatstsir'],
  76:['Ad-Dahr'],78:['An-Nabaa'],79:['An-Naaziat'],82:['Al-Infithar'],83:['Al-Muthaffifin'],
  84:['Al-Insyiqaq'],86:['Ath-Thariq'],88:['Al-Ghasyiyah'],91:['Asy-Syams'],92:['Al-Lail'],
  93:['Ad-Duhaa','Adh-Dhuha','Ad-Dhuha'],94:['Al-Insyirah','Al-Inshirah','Asy-Syarh'],
  99:['Az-Zilzal'],102:['At-Takatsur'],106:['Quraisy','Al-Quraisy','Quraish'],108:['Al-Kautsar'],111:['Al-Lahab']
};
for (const [number, variants] of Object.entries(aliases)) for (const name of variants) order.set(normalize(name),Number(number));
export function surahNumber(surah) {
  const explicit = Number(surah.nomor ?? surah.number ?? surah.nomor_surah);
  if (Number.isInteger(explicit) && explicit >= 1 && explicit <= 114) return explicit;
  return order.get(normalize(surah.nama)) ?? null;
}
export function sortSurahs(surahs) {
  return [...surahs].sort((a,b) => (surahNumber(a) ?? 999) - (surahNumber(b) ?? 999) || String(a.nama).localeCompare(String(b.nama),'id'));
}
export function surahsForJuz(surahs,juz) {
  return sortSurahs(surahs.filter(s => Number(s.juz) === Number(juz)));
}
