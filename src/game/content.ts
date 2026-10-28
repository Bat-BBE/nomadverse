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
  medal: { name: "Наадмын медаль", desc: "Наадмын уралдаанд түрүүлсний шагнал. Хадагтай хамт гардуулсан.", cat: "craft", color: "#d9a641" },
  argal: { name: "Аргал", desc: "Хатсан үхрийн аргал — тал нутгийн түлш. Бэлчээрээс түүнэ. Цай, тараг, ааруул чанахад галд түлнэ.", cat: "material", color: "#7a5a3a" },
  water: { name: "Ус", desc: "Голоос авсан цэвэр ус. Цай чанах, эсгий норгоход хэрэгтэй.", cat: "food", color: "#7fb4d6" },
  tea: { name: "Сүүтэй цай", desc: "Домботой халуун сүүтэй цай. Ахмад хүнд, зочинд барина.", cat: "food", color: "#d8bf96" },
  khadag: { name: "Цэнхэр хадаг", desc: "Хүндэтгэлийн бэлэг. Ахмад хүн ач тусыг чинь үнэлж өгсөн.", cat: "craft", color: "#5b8fd6" },
};

/** Where to get an item, for "you are missing …" hints. */
export const ITEM_SOURCE: Record<string, string> = {
  argal: "бэлчээрээс түүнэ",
  water: "голоос авна",
  milk: "үнээ саана",
  tarag: "тараг бүрнэ",
  bucket: "торхны дэргэдээс",
  wool: "хонь хяргана",
  shears: "Ганаагаас",
  fabric: "Ганаагаас",
  thread: "Ганаагаас",
};

/** What the household has ready on the first morning (Цэцэг prepared it). */
export const START_ITEMS: Record<string, number> = { milk: 1, water: 2, argal: 3 };

// ---------------------------------------------------------------- knowledge categories

export const INFO_CATS: { id: string; title: string; ids: string[] }[] = [
  { id: "ger", title: "Монгол гэр", ids: ["toono", "uni", "khana", "bagana", "golomt", "door", "khoimor"] },
  { id: "herding", title: "Мал аж ахуй", ids: ["herd", "pen", "horse", "cow", "dog", "urga"] },
  { id: "dairy", title: "Сүү, цагаан идээ", ids: ["milking", "tarag", "aaruul"] },
  { id: "craft", title: "Оёдол, гар урлал", ids: ["sewing", "pouch", "khuurug"] },
  { id: "felt", title: "Эсгий урлал", ids: ["shearing", "feltmaking", "argal"] },
  { id: "life", title: "Монгол ахуй, ёс заншил", ids: ["morinkhuur", "shagai", "khadag", "ayaga", "ovoo", "river"] },
  { id: "naadam", title: "Наадам", ids: ["naadam", "uraldaan", "uyach"] },
  { id: "wisdom", title: "Ухаан, ёс, ерөөл", ids: ["tsatsal", "erool", "zuir", "onisgo", "water"] },
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
  naadam: {
    title: "Эрийн гурван наадам",
    latin: "Naadam — the three manly games",
    body: "Бөх, морин уралдаан, сур харваа гурвыг эрийн гурван наадам гэдэг. Зун, ногоо ургаж мал таргалсан цагт нутаг бүрээр наадам болж, айл саахалт цуглаж, айраг сүүгээ дээжилдэг. 2010 онд ЮНЕСКО-гийн хүн төрөлхтний соёлын биет бус өвд бүртгэгдсэн.",
  },
  uraldaan: {
    title: "Морин уралдаан",
    latin: "Horse racing",
    body: "Наадмын морьдыг насаар нь даага, шүдлэн, хязаалан, соёолон, их нас, азарга гэж ангилан 10–30 км уралдуулна. Унаач нь ихэвчлэн 7–12 насны хүүхдүүд. Барианд дөхөхөд «гийнгоо» хэмээн дуулж морио урамшуулна. Түрүү морь, аман хүзүү, айргийн тав, сүүлчийн бөхөн тэргүүнийг бүгдийг нь цоллон магтдаг.",
  },
  uyach: {
    title: "Уяач",
    latin: "Uyach — horse trainer",
    body: "Хурдан морийг уяж сойдог хүнийг уяач гэнэ. Наадмаас хэдэн долоо хоногийн өмнөөс морио өглөө оройн сэрүүнд сунгаж, хөлсийг нь хусуураар хусаж, усыг нь хязгаарлан тураалгүйгээр «соёо»-нд нь оруулдаг. Сайн уяачийн ур ухаан үеэс үед уламжилдаг.",
  },
  tsatsal: {
    title: "Цацал өргөх",
    latin: "Tsatsal — milk offering",
    body: "Өглөө бүр шинэ сүү, цайныхаа дээжийг есөн нүдтэй модон цацлаар тэнгэр, газар, уул усанд өргөн цацдаг. Холын замд гарсан хүний араас сүү цацаж, замын нь урам, буцаж ирэхийг ерөөдөг. «Хурай, хурай» хэмээн дом хийж, цацлыг нар зөв эргүүлдэг.",
  },
  erool: {
    title: "Ерөөл, магтаал",
    latin: "Yerool — blessings",
    body: "Шинэ гэр барих, эсгий хийх, хурим найр, Наадам гээд аливаа сайн үйлсийн эхэнд ерөөлч хүн хэмжээтэй, уянгалаг үгээр сайн сайхныг хүсэн ерөөдөг. Үг нь бүтдэг гэж итгэдэг тул ерөөлд муу үг оруулдаггүй. Хурдан морь, бөх, гэр, мал бүрийг магтаалаар өргөмжилдөг.",
  },
  zuir: {
    title: "Зүйр цэцэн үг",
    latin: "Proverbs",
    body: "«Хүн ахтай, дээл захтай», «Долоо хэмжиж, нэг огтол» гэх мэт цөөн үгэнд гүн утга шингээсэн хэллэгүүд. Ахмадууд хүүхдээ сургахдаа шууд загнахын оронд зүйр үгээр сануулдаг байжээ. Нэг үгэнд хэд хэдэн давхар утга нуугддаг тул бодох тусам шинэ утга олддог.",
  },
  onisgo: {
    title: "Оньсого таавар",
    latin: "Riddles",
    body: "Өвлийн урт үдэш гал голомтын дэргэд оньсого таалцах нь хүүхдийн оюун ухааныг хурцалдаг тоглоом байв. Оньсого өдөр тутмын юмыг уран зүйрлэлээр нууж, сонсогчийг ажиглаж, сэтгэж, холбож бодоход сургадаг.",
  },
  water: {
    title: "Усны ёс",
    latin: "Respect for water",
    body: "Нүүдэлчид ус, булгийг ариун нандин гэж хүндэлдэг. Голд бохир юм угаах, хог хаях, шээх нь цээртэй. Худаг, булгийн эхийг цэвэрлэж, ус авахдаа эхлээд дээжийг нь цацдаг айл ч бий. Тал нутагт ус ховор тул түүнийг хайрлах нь амьдралаа хайрлахтай адил.",
  },
  urga: {
    title: "Уурга",
    latin: "Urga — lasso pole",
    body: "Урт шонгийн үзүүрт уяа бүхий уурга нь адуу барих малчны хэрэгсэл. Морьтой давхиж яваад уургадах нь эрдэм, ур чадвар шаарддаг.",
  },
};

// ---------------------------------------------------------------- daily life

/** Everyday work that comes round again each day once you have learned it. */
export type ChoreId = "milking" | "tarag" | "aaruul" | "shearing" | "tea" | "herd" | "ovoo" | "race" | "argal" | "wisdom";
export interface ChoreDef {
  title: string;
  hint: string;
  /** learned well enough to be asked again */
  unlocked: (s: { questsDone: QuestId[]; activitiesDone: string[] }) => boolean;
}
export const CHORES: Record<ChoreId, ChoreDef> = {
  milking: { title: "Үнээ саах", hint: "Хувингаа аваад үнээ рүү оч", unlocked: (s) => s.activitiesDone.includes("milking") },
  tarag: { title: "Тараг бүрэх", hint: "Сүүгээ гэрийн ширээн дээр бүр", unlocked: (s) => s.activitiesDone.includes("tarag") },
  aaruul: { title: "Ааруул хийх", hint: "Тарагнаасаа ааруул хий", unlocked: (s) => s.activitiesDone.includes("aaruul") },
  shearing: { title: "Хонь хяргах", hint: "Хашааны хониноос ноос хярга", unlocked: (s) => s.activitiesDone.includes("shearing") },
  tea: { title: "Сүүтэй цай чанах", hint: "Гэртээ цай чанаж айлдаа барь", unlocked: (s) => s.questsDone.includes("tea") },
  herd: { title: "Хонио хашаалах", hint: "Тарсан таван хонийг хашаанд оруул", unlocked: (s) => s.questsDone.includes("herd") },
  ovoo: { title: "Овоо тойрох", hint: "Овоог нар зөв гурав тойр", unlocked: (s) => s.questsDone.includes("ovoo") },
  race: { title: "Морио сунгах", hint: "Наадмын уралдаанд нэг оролц", unlocked: (s) => s.questsDone.includes("ride") },
  argal: { title: "Аргал түүх", hint: "Бэлчээрээс гурван аргал түүж ир", unlocked: (s) => s.activitiesDone.includes("tarag") || s.questsDone.includes("tea") },
  wisdom: { title: "Өвгөний оньсого таах", hint: "Дорж өвөөтэй ухаан сорих", unlocked: (s) => s.activitiesDone.includes("wisdom") },
};

// ---------------------------------------------------------------- neighbours' requests and honour

/**
 * Each day one of the camp's people asks for something you can make. Bringing
 * it raises your нэр хүнд (standing) and they give something back, so the
 * crafts feed one another: tea and aaruul for the elder, felt for the herder…
 */
export interface RequestDef {
  id: string;
  npc: NpcId;
  needs: Record<string, number>;
  gives: Record<string, number>;
  honor: number;
  ask: string[];
  thanks: string;
  /** you know how to make what is asked */
  unlocked: (s: { questsDone: QuestId[]; activitiesDone: string[] }) => boolean;
}
export const REQUESTS: RequestDef[] = [
  {
    id: "dorj_tea",
    npc: "dorj",
    needs: { tea: 1, aaruul: 2 },
    gives: { khadag: 1 },
    honor: 20,
    ask: [
      "Энэ өвгөний хоолой хуурайшаад байна.",
      "Нэг аяга сүүтэй цай, хоёр ширхэг ааруул байвал хөөрөг зөрүүлэн удаан яриа өрнүүлэх юм сан.",
    ],
    thanks: "Ачтай, ачтай! Халуун цай ахмад хүний сэтгэлийг дулаацуулдаг юм. Энэ цэнхэр хадгийг ав, миний хүүхэд. Хадаг шиг цагаан сэтгэлтэй яваарай.",
    unlocked: (s) => s.questsDone.includes("tea") && s.activitiesDone.includes("aaruul"),
  },
  {
    id: "tsetseg_fire",
    npc: "tsetseg",
    needs: { argal: 3, water: 2 },
    gives: { milk: 1 },
    honor: 15,
    ask: [
      "Гал голомт маань суларч, хувин ч хоосорчээ.",
      "Бэлчээрээс гурван аргал түүж, голоос хоёр хувин ус авчраад өгөөч.",
    ],
    thanks: "Гал голомт бадарвал айл өнөр гэдэг. Баярлалаа. Өглөөний саалийнхаа сүүг чамд өгье.",
    unlocked: (s) => s.questsDone.includes("tea") || s.activitiesDone.includes("tarag"),
  },
  {
    id: "ganaa_wool",
    npc: "ganaa",
    needs: { wool: 2 },
    gives: { fabric: 1, thread: 1 },
    honor: 15,
    ask: ["Хүүхдүүддээ өвлийн оймс сүлжих гэтэл ноос минь дуусчихаж.", "Хоёр баглаа ноос олж өгвөл торго, утсаараа хариулъя."],
    thanks: "Ямар цэвэрхэн ноос вэ! Хогийг нь сайн түүжээ. Торго, утсаа ав. Сайхан юм оёорой.",
    unlocked: (s) => s.activitiesDone.includes("shearing"),
  },
  {
    id: "batbayar_felt",
    npc: "batbayar",
    needs: { felt: 1 },
    gives: { tarag: 1, aaruul: 2 },
    honor: 25,
    ask: ["Хонины хашааны хаяа салхинд цоорчээ.", "Нэг эсгий байвал хурганы хаяаг бөглөж, шөнийн хүйтнээс хамгаалах юм."],
    thanks: "Ингээд хургад маань дулаахан боллоо. Малаа хайрласан хүнийг мал нь ч хайрладаг. Манай гэргийн бүрсэн тараг, ааруулаас ав.",
    unlocked: (s) => s.activitiesDone.includes("felting"),
  },
  {
    id: "dorj_pouch",
    npc: "dorj",
    needs: { pouch: 1 },
    gives: { khadag: 1 },
    honor: 30,
    ask: ["Хөөргийн уут маань элэгдэж, хээ нь арилах шахжээ.", "Чиний гараар оёсон уут байсан бол хөөргөө нандигнан хийх юм сан."],
    thanks: "Ай, хээ нь ямар тод вэ! Хүний гар хүрсэн юм сэтгэлтэй байдаг. Энэ хадгийг хүлээж ав. Чамаар бахархаж байна.",
    unlocked: (s) => s.activitiesDone.includes("sewing"),
  },
];

/** Titles of standing earned by helping the neighbours. */
export const HONOR = [
  { min: 0, label: "Шинэ хүн" },
  { min: 20, label: "Айлсаг хүн" },
  { min: 60, label: "Ахуйч" },
  { min: 120, label: "Нутгийн түшиг" },
  { min: 200, label: "Тал нутгийн мэргэн" },
];
export function honorTitle(n: number) {
  let i = 0;
  while (i + 1 < HONOR.length && n >= HONOR[i + 1].min) i++;
  return { label: HONOR[i].label, next: HONOR[i + 1] ?? null };
}
export const CHORES_PER_DAY = 3;

/** Craft levels by how many times an activity has been done. */
export const MASTERY = [
  { min: 0, label: "Шинэхэн" },
  { min: 1, label: "Суралцагч" },
  { min: 3, label: "Дадлагатай" },
  { min: 6, label: "Ур чадвартай" },
  { min: 10, label: "Мастер" },
];
export function masteryLevel(times: number) {
  let i = 0;
  while (i + 1 < MASTERY.length && times >= MASTERY[i + 1].min) i++;
  return { index: i, label: MASTERY[i].label, next: MASTERY[i + 1] ?? null };
}

/** Small gifts for coming back on a new calendar day (cycled by streak). */
export const DAILY_GIFTS: Record<string, number>[] = [
  { milk: 1 },
  { fabric: 1, thread: 1 },
  { tarag: 1 },
  { wool: 1 },
  { aaruul: 2 },
];

export const CHEST_ITEMS = ["shagai", "khuurug", "khadag", "ayaga"] as const;
