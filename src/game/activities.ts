import type { QuestId } from './content';
import type { HumanPose } from '@/world/Human';

// Reusable activity framework. Every cultural activity is data: what it needs,
// what it uses up and produces, which quest step it completes, which knowledge
// it unlocks, and a sequence of interactive steps. One UI component
// (ui/ActivityPanel) plays any activity; adding a new one means adding an entry.

export type Step =
  | { kind: 'choice'; title: string; text: string; options: { label: string; ok: boolean; note?: string }[] }
  /** hold a button to fill a meter; release inside the zone (or just reach full when no zone) */
  | { kind: 'hold'; title: string; text: string; seconds: number; zone?: [number, number]; button: string }
  /** press a button N times */
  | { kind: 'taps'; title: string; text: string; count: number; button: string }
  /** alternate two buttons (or ← / → keys) N times: milking, beating wool */
  | { kind: 'alternate'; title: string; text: string; count: number; left: string; right: string }
  /** a short timed stage (compressed real-world waiting) */
  | { kind: 'wait'; title: string; text: string; seconds: number }
  /** sewing: stop the moving needle over each stitch mark */
  | { kind: 'stitch'; title: string; text: string; count: number };

export interface ActivityDef {
  id: string;
  title: string;
  latin: string;
  intro: string;
  /** body pose while the activity runs */
  pose: HumanPose;
  requires: Record<string, number>;
  consumes: Record<string, number>;
  gives: Record<string, number>;
  quest?: [QuestId, string];
  knowledge: string[];
  xp: number;
  outro: string;
  steps: Step[];
}

export const ACTIVITIES: Record<string, ActivityDef> = {
  milking: {
    id: 'milking',
    title: 'Үнээ саах',
    latin: 'Milking',
    intro: 'Үнээний баруун талд суугаад хувингаа өвдөг дээрээ тавина.',
    pose: 'milk',
    requires: { bucket: 1 },
    consumes: { bucket: 1 },
    gives: { milk: 1 },
    quest: ['milk', 'milk'],
    knowledge: ['milking', 'cow'],
    xp: 30,
    outro: 'Хувин дүүрэн шинэ сүү. Сүүний дээжийг тэнгэрт өргөх заншил олон айлд бий.',
    steps: [
      {
        kind: 'choice',
        title: 'Бэлтгэл',
        text: 'Саахын өмнө юу хийх вэ?',
        options: [
          { label: 'Тугалыг хөхүүлж сүүг ивүүлэх', ok: true },
          { label: 'Шууд саах', ok: false, note: 'Үнээ сүүгээ ивүүлэхгүй бол сайн саагдахгүй. Тугалаа түрүүлж хөхүүлдэг.' },
        ],
      },
      { kind: 'alternate', title: 'Саах', text: 'Хоёр гараараа ээлжлэн шахаж саана. ← → эсвэл товчлуурыг ээлжлэн дар.', count: 16, left: 'Зүүн гар', right: 'Баруун гар' },
    ],
  },
  tarag: {
    id: 'tarag',
    title: 'Тараг бүрэх',
    latin: 'Making tarag',
    intro: 'Гэрийн зүүн талын ширээн дээр сүүгээ тогоонд хийнэ.',
    pose: 'work',
    requires: { milk: 1 },
    consumes: { milk: 1 },
    gives: { tarag: 1 },
    quest: ['dairy', 'tarag'],
    knowledge: ['tarag'],
    xp: 30,
    outro: 'Тараг исэж бэлэн боллоо. Нэг аягыг хөрөнгө болгон дараагийнхаа тарагт үлдээдэг.',
    steps: [
      { kind: 'hold', title: 'Буцалгах', text: 'Сүүгээ буцалгана. Товчийг дарж байгаад шар бүсэд хүрмэгц тавь.', seconds: 3, zone: [0.75, 0.95], button: 'Дарж халаах' },
      { kind: 'wait', title: 'Хөргөх', text: 'Хуруу дүрэхэд бүлээн болтол хөргөнө.', seconds: 3 },
      {
        kind: 'choice',
        title: 'Хөрөнгө хийх',
        text: 'Бүлээн сүүнд юу хийх вэ?',
        options: [
          { label: 'Өмнөх тарагны хөрөнгө', ok: true },
          { label: 'Давс', ok: false, note: 'Давс исгэхгүй. Тараг бүрэхэд хөрөнгө буюу исгэгч хэрэгтэй.' },
          { label: 'Хүйтэн ус', ok: false, note: 'Ус нэмбэл шингэрнэ. Исгэгч хэрэгтэй.' },
        ],
      },
      {
        kind: 'choice',
        title: 'Бүрэх',
        text: 'Тогоогоо яах вэ?',
        options: [
          { label: 'Тагласаар эсгий, хөнжлөөр бүрж дулаан газар тавих', ok: true },
          { label: 'Задгай орхих', ok: false, note: 'Сүү хөрчихвөл исэхгүй. Дулаанаар бүрдэг.' },
        ],
      },
      { kind: 'wait', title: 'Исэх', text: 'Тараг исэж байна… (жинхэнэдээ хагас өдөр орчим)', seconds: 4 },
    ],
  },
  aaruul: {
    id: 'aaruul',
    title: 'Ааруул хийх',
    latin: 'Making aaruul',
    intro: 'Тарагаа тогоонд хийж зууханд тавина.',
    pose: 'work',
    requires: { tarag: 1 },
    consumes: { tarag: 1 },
    gives: { aaruul: 3 },
    quest: ['dairy', 'aaruul'],
    knowledge: ['aaruul'],
    xp: 40,
    outro: 'Ааруулаа гэрийн дээвэр дээрх тавиурт дэлгэлээ. Хэдэн өдөр наранд хатна.',
    steps: [
      { kind: 'hold', title: 'Ээдэм гаргах', text: 'Тарагаа буцалгахад ээдэм бүлэгнэж, шар ус салж гарна.', seconds: 3, button: 'Дарж буцалгах' },
      { kind: 'taps', title: 'Шүүх', text: 'Ээдмээ даавуун уутанд хийж шар усыг нь шахаж гаргана.', count: 6, button: 'Шахах' },
      { kind: 'hold', title: 'Дарах', text: 'Хавтгай банзан доор чулуугаар дарж хатууруулна.', seconds: 2.5, button: 'Дарж байх' },
      { kind: 'taps', title: 'Хэрчих', text: 'Хутгаар нарийн зүсэм болгон хэрчинэ.', count: 8, button: 'Хэрчих' },
      {
        kind: 'choice',
        title: 'Хатаах',
        text: 'Ааруулаа хаана хатаах вэ?',
        options: [
          { label: 'Гэрийн дээвэр дээрх тавиурт наранд', ok: true },
          { label: 'Гэрийн дотор харанхуйд', ok: false, note: 'Наранд, салхинд хатаадаг. Дотор чийгтэй газар мууддаг.' },
        ],
      },
    ],
  },
  shearing: {
    id: 'shearing',
    title: 'Хонь хяргах',
    latin: 'Shearing',
    intro: 'Хонио зөөлөн хэвтүүлж, хөлийг нь хөнгөхөн боож тайвшруулна.',
    pose: 'milk',
    requires: { shears: 1 },
    consumes: {},
    gives: { wool: 2 },
    quest: ['felt', 'shear'],
    knowledge: ['shearing'],
    xp: 25,
    outro: 'Ноосоо хоёр баглаа болгож уялаа. Хонь хөнгөрч гүйгээд явчихлаа.',
    steps: [
      {
        kind: 'choice',
        title: 'Хонио бэлдэх',
        text: 'Хонио хэрхэн барих вэ?',
        options: [
          { label: 'Зөөлөн хэвтүүлж, хөлийг нь хөнгөн боох', ok: true },
          { label: 'Зогсож байхад нь хяргах', ok: false, note: 'Хонь сандарч зугтана. Тайван хэвтүүлдэг.' },
        ],
      },
      { kind: 'taps', title: 'Хяргах', text: 'Гэдэс, хажуу, нуруу гэсэн дарааллаар ноосыг нэг бүтнээр нь хяргана.', count: 10, button: 'Хяргах' },
    ],
  },
  felting: {
    id: 'felting',
    title: 'Эсгий хийх',
    latin: 'Felt-making',
    intro: 'Эх эсгий, мод, ус бэлэн. Ноосоо дэлгэх газраа цэвэрлэлээ.',
    pose: 'work',
    requires: { wool: 2 },
    consumes: { wool: 2 },
    gives: { felt: 1 },
    quest: ['felt', 'felt'],
    knowledge: ['feltmaking'],
    xp: 50,
    outro: 'Шинэ эсгий бэлэн боллоо. Үүнийг гэрийн бүрээс, дэвсгэр, гутлын улавч болгоно.',
    steps: [
      { kind: 'alternate', title: 'Ноос савах', text: 'Хоёр саваагаар ээлжлэн цохиж ноосоо сэвсийлгэнэ.', count: 12, left: 'Зүүн саваа', right: 'Баруун саваа' },
      {
        kind: 'choice',
        title: 'Дэлгэх',
        text: 'Ноосоо хаана дэлгэх вэ?',
        options: [
          { label: 'Эх эсгий дээр жигд давхарлан', ok: true },
          { label: 'Газар шууд', ok: false, note: 'Шороо наалдаж, нийлэхгүй. Хуучин эсгий буюу эх эсгий дээр дэлгэдэг.' },
        ],
      },
      { kind: 'hold', title: 'Ус цацах', text: 'Ноосыг жигд норгоно. Хэт их ус цацвал урсаж, бага бол нийлэхгүй.', seconds: 2.5, zone: [0.55, 0.85], button: 'Дарж ус цацах' },
      { kind: 'taps', title: 'Ороох', text: 'Эх эсгийтэй нь хамт модонд ороож, арьсаар бооно.', count: 5, button: 'Ороох' },
      { kind: 'hold', title: 'Чирэх', text: 'Боодлыг мориор чирж, эргэлдүүлэн нухна.', seconds: 4, button: 'Дарж чирэх' },
      { kind: 'wait', title: 'Задлах, хатаах', text: 'Боодлоо задалж, шинэ эсгийгээ наранд хатаана.', seconds: 3 },
    ],
  },
  sewing: {
    id: 'sewing',
    title: 'Хөөргийн уут оёх',
    latin: 'Sewing a pouch',
    intro: 'Ганаагийн эсгий дэвсгэр дээр суугаад торгоо дэлгэнэ.',
    pose: 'sew',
    requires: { fabric: 1, thread: 1 },
    consumes: { fabric: 1, thread: 1 },
    gives: { pouch: 1 },
    quest: ['sew', 'sew'],
    knowledge: ['sewing', 'pouch'],
    xp: 40,
    outro: 'Хөөргийн уут чинь бэлэн боллоо. Бүсэндээ зүүж явж болно.',
    steps: [
      {
        kind: 'choice',
        title: 'Хээ сонгох',
        text: 'Уутан дээрээ ямар хээ хатгах вэ?',
        options: [
          { label: 'Өлзий хээ', ok: true },
          { label: 'Алхан хээ', ok: true },
          { label: 'Эвэр хээ', ok: true },
        ],
      },
      { kind: 'stitch', title: 'Оёх', text: 'Зүү тэмдэг дээр ирэхэд товчийг дар (эсвэл Space).', count: 8 },
      { kind: 'taps', title: 'Утас бэхлэх', text: 'Утсаа зангидаж бэхэлнэ.', count: 3, button: 'Зангидах' },
    ],
  },
};
