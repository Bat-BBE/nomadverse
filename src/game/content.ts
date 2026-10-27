// Quest and knowledge content. Cultural notes are written to be general;
// customs differ between regions, so wording avoids claiming one "correct" way.

export type QuestId = "morning" | "tea" | "ger" | "ride" | "ovoo" | "herd" | "milk" | "dairy" | "felt" | "sew";

export interface QuestDef {
  id: QuestId;
  title: string;
  desc: string;
  steps: { id: string; label: string }[];
  xp: number;
}

export const QUESTS: QuestDef[] = [
  {
    id: "morning",
    title: "Өглөөний аялал",
    desc: "Өнөөдрийн аяллаа эхлүүл.",
    steps: [
      { id: "leave", label: "Гэрээс гарах" },
      { id: "horses", label: "Адуундаа явах" },
      { id: "river", label: "Голын эргээс ус авах" },
    ],
    xp: 50,
  },
  {
    id: "tea",
    title: "Сүүтэй цай",
    desc: "Гэртээ буцаж, өглөөний цайгаа чана.",
    steps: [
      { id: "enter", label: "Гэрт орох" },
      { id: "brew", label: "Цай чанах" },
      { id: "serve", label: "Цай аягалах" },
    ],
    xp: 80,
  },
  {
    id: "ger",
    title: "Гэрийн бүтэц",
    desc: "Гэрийн гол хэсгүүд дээр дарж таньж мэд.",
    steps: [
      { id: "toono", label: "Тооно" },
      { id: "uni", label: "Унь" },
      { id: "khana", label: "Хана" },
      { id: "bagana", label: "Багана" },
      { id: "golomt", label: "Тулга" },
    ],
    xp: 60,
  },
  {
    id: "ride",
    title: "Морин аялал",
    desc: "Уяан дээрх морио унаад баруун хойд толгой руу гар.",
    steps: [
      { id: "mount", label: "Морь унах" },
      { id: "hill", label: "Овоонд гарах" },
    ],
    xp: 70,
  },
  {
    id: "ovoo",
    title: "Овоо тахих",
    desc: "Овоог нар зөв гурав тойрч, чулуу өргө.",
    steps: [
      { id: "circle", label: "Нар зөв 3 тойрох" },
      { id: "stone", label: "Чулуу нэмэх" },
    ],
    xp: 100,
  },
  {
    id: "herd",
    title: "Хонио хашаалах",
    desc: "Батбаярын бэлчээрт тарсан хонийг хашаанд оруулж, хаалгыг нь хаа.",
    steps: [
      { id: "talk", label: "Батбаяртай уулзах" },
      { id: "gate", label: "Хашааны хаалга нээх" },
      { id: "drive", label: "5 хонийг хашаанд оруулах" },
      { id: "close", label: "Хаалгаа хаах" },
    ],
    xp: 120,
  },
  {
    id: "milk",
    title: "Үнээ саах",
    desc: "Цэцэгээс зааварчилгаа аваад хувинтай очиж үнээгээ саа.",
    steps: [
      { id: "talk", label: "Цэцэгтэй ярилцах" },
      { id: "bucket", label: "Хувин авах" },
      { id: "milk", label: "Үнээ саах" },
    ],
    xp: 90,
  },
  {
    id: "dairy",
    title: "Тараг, ааруул",
    desc: "Сааль сүүгээр гэрийн зүүн талын ширээнд тараг бүрж, ааруул хий.",
    steps: [
      { id: "tarag", label: "Тараг бүрэх" },
      { id: "aaruul", label: "Ааруул хийх" },
    ],
    xp: 140,
  },
  {
    id: "felt",
    title: "Эсгий хийх",
    desc: "Ганаагаас хайч аваад хашааны хонийг хяргаж, ноосоор эсгий хий.",
    steps: [
      { id: "talk", label: "Ганаатай ярилцах" },
      { id: "shear", label: "Хонь хяргах" },
      { id: "felt", label: "Эсгий хийх" },
    ],
    xp: 150,
  },
  {
    id: "sew",
    title: "Хөөргийн уут оёх",
    desc: "Ганаагаас торго, утас аваад хөөргийн уут оё.",
    steps: [
      { id: "talk", label: "Ганаатай ярилцах" },
      { id: "sew", label: "Уут оёх" },
    ],
    xp: 110,
  },
];

/** Starting activity preferences: they only choose the first quests; everything stays open. */
export type StartPref = "herding" | "dairy" | "sewing" | "felt" | "riding" | "household";

export const START_PREFS: { id: StartPref; title: string; latin: string; desc: string; quests: QuestId[] }[] = [
  { id: "herding", title: "Малчин ахуй", latin: "Herding", desc: "Малаа хариулж, хонио хашаалан, малчны ажилтай танилц.", quests: ["herd"] },
  { id: "dairy", title: "Сүү, цагаан идээ", latin: "Dairy traditions", desc: "Үнээ саагаад тараг бүрж, ааруул хий.", quests: ["milk", "dairy"] },
  { id: "sewing", title: "Оёдол, гар урлал", latin: "Sewing & crafts", desc: "Торго сонгож, хээ угалзтай хөөргийн уут оё.", quests: ["sew"] },
  { id: "felt", title: "Эсгий урлал", latin: "Felt-making", desc: "Хонь хяргаж, ноосоо савж, эсгий хий.", quests: ["felt"] },
  { id: "riding", title: "Морь унах, байгаль судлах", latin: "Riding & exploration", desc: "Морио унаж, хөндий, овоо, голоор аялна.", quests: ["ride", "ovoo"] },
  { id: "household", title: "Монгол гэрийн ахуй", latin: "Household life", desc: "Гэрийн бүтэц, цай чанах, айлын ёс заншилтай танилц.", quests: ["tea", "ger"] },
];

const DEFAULT_ORDER: QuestId[] = ["morning", "tea", "ger", "herd", "milk", "dairy", "felt", "sew", "ride", "ovoo"];

export function questOrder(pref: StartPref | null): QuestId[] {
  const first = START_PREFS.find((p) => p.id === pref)?.quests ?? [];
  return [...first, ...DEFAULT_ORDER.filter((q) => !first.includes(q))];
}

// ---------------------------------------------------------------- items

export type ItemCat = "tool" | "food" | "material" | "craft";
export interface ItemDef {
  name: string;
  desc: string;
  cat: ItemCat;
  color: string;
}
export const ITEM_CAT_LABEL: Record<ItemCat, string> = { tool: "Багаж", food: "Хүнс", material: "Түүхий эд", craft: "Гар урлал" };

export const ITEMS: Record<string, ItemDef> = {
  bucket: { name: "Хувин", desc: "Модон хувин. Саалийн сүүг хийнэ.", cat: "tool", color: "#9a6a3e" },
  milk: { name: "Сааль сүү", desc: "Шинэхэн саасан үнээний сүү. Тараг бүрэхэд хэрэгтэй.", cat: "food", color: "#f4efe2" },
  khurungu: { name: "Хөрөнгө", desc: "Өмнөх тарагнаас үлдээсэн исгэгч. Шинэ тараг бүрэхэд хийнэ.", cat: "food", color: "#ece2c6" },
  tarag: { name: "Тараг", desc: "Исгэлэн сүү. Ааруул хийх түүхий эд.", cat: "food", color: "#efe6d2" },
  aaruul: { name: "Ааруул", desc: "Наранд хатаасан ааруул. Удаан хадгалагддаг.", cat: "food", color: "#e8d9b0" },
  shears: { name: "Хайч", desc: "Хонь хяргах төмөр хайч.", cat: "tool", color: "#8d9298" },
  wool: { name: "Ноос", desc: "Хонины ноос. Эсгий хийхэд хоёр баглаа хэрэгтэй.", cat: "material", color: "#e9e1cc" },
  felt: { name: "Эсгий", desc: "Шинэ эсгий. Гэрийн бүрээс, дэвсгэрт хэрэглэнэ.", cat: "craft", color: "#d8cdb6" },
  fabric: { name: "Торго", desc: "Уут оёх торго даавуу.", cat: "material", color: "#2e5e96" },
  thread: { name: "Утас", desc: "Оёдлын утас.", cat: "material", color: "#d9a641" },
  pouch: { name: "Хөөргийн уут", desc: "Өөрийн гараар оёсон хээтэй уут.", cat: "craft", color: "#a8381a" },
};

// ---------------------------------------------------------------- knowledge categories

export const INFO_CATS: { id: string; title: string; ids: string[] }[] = [
  { id: "ger", title: "Монгол гэр", ids: ["toono", "uni", "khana", "bagana", "golomt", "door", "khoimor"] },
  { id: "herding", title: "Мал аж ахуй", ids: ["herd", "pen", "horse", "cow", "dog", "urga"] },
  { id: "dairy", title: "Сүү, цагаан идээ", ids: ["milking", "tarag", "aaruul"] },
  { id: "craft", title: "Оёдол, гар урлал", ids: ["sewing", "pouch", "khuurug"] },
  { id: "felt", title: "Эсгий урлал", ids: ["shearing", "feltmaking", "argal"] },
  { id: "life", title: "Монгол ахуй, ёс заншил", ids: ["morinkhuur", "shagai", "khadag", "ayaga", "ovoo", "river"] },
];

// ---------------------------------------------------------------- NPCs

export type NpcId = "tsetseg" | "batbayar" | "ganaa" | "dorj";
export interface NpcDef {
  id: NpcId;
  name: string;
  role: string;
  look: {
    woman?: boolean;
    deel: string;
    sash: string;
    trim?: string;
    skin?: string;
    hatStyle?: "malgai" | "toortsog" | "scarf" | "none";
    headColor?: string;
    hair?: "short" | "braid" | "twobraids";
  };
}
export const NPCS: Record<NpcId, NpcDef> = {
  tsetseg: { id: "tsetseg", name: "Цэцэг", role: "Гэрийн эзэгтэй · цагаан идээ", look: { woman: true, deel: "#7a2f6e", sash: "#3f8a7a", trim: "#e0b24e", skin: "#b68262", hair: "braid" } },
  batbayar: { id: "batbayar", name: "Батбаяр", role: "Малчин", look: { deel: "#6b4a2f", sash: "#2f5f9a", skin: "#a8735a", hatStyle: "toortsog", headColor: "#3a4a6a" } },
  ganaa: { id: "ganaa", name: "Ганаа", role: "Гар урлаач · эсгий, оёдол", look: { deel: "#2f6b5a", sash: "#c9762a", skin: "#b07a5e", hatStyle: "none" } },
  dorj: { id: "dorj", name: "Дорж өвөө", role: "Ахмад · морь, ёс заншил", look: { deel: "#5a5a6e", sash: "#b8461c", trim: "#c9ccd0", skin: "#a87a62", hatStyle: "malgai", headColor: "#7a2a1c" } },
};

export interface InfoDef {
  title: string;
  latin?: string;
  body: string;
}

export const INFO: Record<string, InfoDef> = {
  toono: {
    title: "Тооно",
    latin: "Toono — roof crown",
    body: "Гэрийн оройн дугуй цонх. Утаа гарч, гэрэл ордог. Тоонооор тусах нарны гэрэл хана, унинд хаана хүрснээр өдрийн цагийг тооцдог уламжлалтай.",
  },
  uni: {
    title: "Унь",
    latin: "Uni — roof poles",
    body: "Тооно ба ханыг холбож, дээврийг бүрдүүлэх урт нарийн мод. Гэрийн хэмжээнээс хамаарч хэдэн арваар тоологдоно.",
  },
  khana: {
    title: "Хана",
    latin: "Khana — lattice wall",
    body: "Эвхэгддэг сараалжин модон хана. Гэрийн хэмжээг ханын тоогоор нэрлэдэг: дөрвөн ханатай, таван ханатай гэр гэх мэт. Нүүхэд эвхэж ачихад хялбар.",
  },
  bagana: {
    title: "Багана",
    latin: "Bagana — columns",
    body: "Тоонотой дээврийг тулж тогтоох хос багана. Ихэвчлэн хээ угалзаар чимдэг. Баганыг түшиж, голоор нь гарч орохоос зайлсхийдэг ёс бий.",
  },
  golomt: {
    title: "Тулга",
    latin: "Golomt — hearth",
    body: "Гэрийн төвд байрлах гал, зуух — өрхийн залгамж, амьдралын бэлгэдэл. Галд хог хаяхгүй, хутга мэт хурц юмаар галыг догшоохыг цээрлэл бий.",
  },
  door: {
    title: "Хаалга ба босго",
    latin: "Khaalga — door",
    body: "Гэрийн хаалгыг ихэвчлэн урагш, нар талд харуулж барьдаг. Орж гарахдаа босго гишгэхгүй байх нь уламжлалт ёс.",
  },
  khoimor: {
    title: "Хоймор",
    latin: "Khoimor — place of honor",
    body: "Хаалганы эсрэг талын хойд хэсэг. Хүндтэй зочин, ахмад настан суудаг, авдар, гэрэл гэгээ залдаг газар.",
  },
  morinkhuur: {
    title: "Морин хуур",
    latin: "Morin khuur — horsehead fiddle",
    body: "Толгойгоо морины толгойгоор сийлсэн хоёр утастай нумт хөгжим. Морин хуурын урлагийг ЮНЕСКО хүн төрөлхтний биет бус соёлын өвд бүртгэсэн.",
  },
  shagai: {
    title: "Шагай",
    latin: "Shagai — ankle bones",
    body: "Хонины шагайгаар морь уралдуулах, шагай харвах, мэлхий няслах зэрэг олон тоглоом тоглодог. Буусан талаараа морь, тэмээ, хонь, ямаа гэж нэрлэгдэнэ.",
  },
  khuurug: {
    title: "Хөөрөг",
    latin: "Khuurug — snuff bottle",
    body: "Танилцаж мэндлэхдээ хөөрөг зөрүүлэх ёс бий. Чулуу, шил, мөнгөөр урлаж, хадагтай уут, даруулгатай хэрэглэдэг.",
  },
  khadag: {
    title: "Хадаг",
    latin: "Khadag — ceremonial scarf",
    body: "Хүндэтгэл, ерөөл илэрхийлэх торгон алчуур. Цэнхэр өнгө нь мөнх хөх тэнгэрийг бэлгэддэг. Хоёр гараар, задгай тал нь өгөх хүн рүү харуулан барина.",
  },
  ayaga: {
    title: "Мөнгөн аяга",
    latin: "Silver bowl",
    body: "Хүндэтгэлийн зочныг мөнгөн аягаар цай, айргаар дайлдаг. Аягыг баруун гараар, эсвэл хоёр гараар барьж өгдөг.",
  },
  argal: {
    title: "Аргал",
    latin: "Argal — dried dung fuel",
    body: "Хатсан үхрийн баас — модгүй тал нутагт зуухны гол түлш. Удаан шатаж, тогтвортой дулаан өгдөг.",
  },
  horse: {
    title: "Монгол адуу",
    latin: "Mongolian horse",
    body: "Намхан боловч тэсвэр хатуужилтай. Жилийн турш задгай бэлчээрт сүргээрээ амьдардаг. Морийг зүүн талаас нь унаж, буудаг заншилтай.",
  },
  herd: {
    title: "Таван хошуу мал",
    latin: "Five snouts",
    body: "Адуу, үхэр, тэмээ, хонь, ямаа. Хонь, ямааг ихэвчлэн хамт бэлчээдэг. Малчид бэлчээрийг улирлаар сэлгэж, газрыг амраадаг.",
  },
  river: {
    title: "Голын эрэг",
    latin: "River bank",
    body: "Нүүдэлчид ус ойрхон, гэхдээ үерт автахгүй өндөрлөг газар буудаг. Ус, голыг бохирдуулахгүй байх нь эртний цээрлэлийн нэг.",
  },
  ovoo: {
    title: "Овоо",
    latin: "Ovoo — sacred cairn",
    body: "Уулын орой, даваа зэрэг газар чулуугаар овоолж, хадаг уясан тахилгын газар. Хажуугаар өнгөрөхдөө нар зөв гурав тойрч, чулуу нэмж, сайн сайхныг ерөөдөг.",
  },
  dog: {
    title: "Банхар нохой",
    latin: "Bankhar — herding dog",
    body: "Малчны айлын үнэнч хамгаалагч. Айлд ойртохдоо \"Нохой хорио!\" гэж дуудаж, гэрийнхнийг гарч ирэхийг хүлээдэг ёстой.",
  },
  pen: {
    title: "Хашаа, хороо",
    latin: "Khashaa — livestock pen",
    body: "Шөнө малыг хүйтэн салхи, чоно зэргээс хамгаалж хашаа хороонд хашдаг. Хонь сүргээрээ явдаг тул хойноос нь тайван хөөж, хаалга руу чиглүүлдэг.",
  },
  cow: {
    title: "Үнээ, үхэр",
    latin: "Cattle",
    body: "Таван хошуу малын нэг. Монгол үхэр намхан, хүйтэнд тэсвэртэй. Хангайн бүсэд сарлаг, хайнаг ч бий.",
  },
  milking: {
    title: "Саалт",
    latin: "Milking",
    body: "Үнээг ихэвчлэн өглөө, орой саадаг. Саахын өмнө тугалыг хөхүүлж сүүг ивүүлдэг. Шинэ сүүний дээжийг өргөх заншил олон айлд бий.",
  },
  tarag: {
    title: "Тараг",
    latin: "Tarag — yogurt",
    body: "Буцалгаад бүлээн болтол хөргөсөн сүүнд хөрөнгө буюу өмнөх тарагнаас үлдээсэн исгэгч хийж, дулаан газар бүрж исгэдэг.",
  },
  aaruul: {
    title: "Ааруул",
    latin: "Aaruul — dried curd",
    body: "Тарагийг буцалгаж ээдэм гаргаад шар усыг нь шүүж, дарж, хэрчээд наранд хатаадаг. Хатаахдаа гэрийн дээвэр, тавиур дээр дэлгэдэг. Айл бүр, нутаг бүр жороо ялгаатай хийдэг.",
  },
  shearing: {
    title: "Хонь хяргах",
    latin: "Shearing",
    body: "Хонио ихэвчлэн хаврын сүүл, зуны эхээр хяргадаг. Ноосыг эсгий, олс, дэвсгэр хийхэд хэрэглэнэ.",
  },
  feltmaking: {
    title: "Эсгий хийх",
    latin: "Felt-making",
    body: "Ноосыг саваагаар цохиж сэвсийлгээд, эх эсгий дээр давхарлан дэлгэж, ус цацаж, ороож, морь эсвэл үхрээр чирж нухдаг. Ихэвчлэн айл саахалт хамтран хийдэг ажил.",
  },
  sewing: {
    title: "Оёдол, хатгамал",
    latin: "Sewing & embroidery",
    body: "Дээл, гутал, уут зэргийг гэртээ оёдог байсан. Өлзий, алхан хээ зэрэг хээ угалзыг хатгамал, наамлаар чимдэг.",
  },
  pouch: {
    title: "Хөөргийн уут",
    latin: "Snuff-bottle pouch",
    body: "Хөөргөө хийж бүсэндээ зүүдэг торгон уут. Хатгамал хээ, залаатай байдаг.",
  },
  urga: {
    title: "Уурга",
    latin: "Urga — lasso pole",
    body: "Урт шонгийн үзүүрт уяа бүхий уурга нь адуу барих малчны хэрэгсэл. Морьтой давхиж яваад уургадах нь эрдэм, ур чадвар шаарддаг.",
  },
};

export const CHEST_ITEMS = ["shagai", "khuurug", "khadag", "ayaga"] as const;
