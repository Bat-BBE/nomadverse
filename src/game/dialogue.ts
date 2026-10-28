import { NPCS, REQUESTS, START_PREFS, ITEMS, type NpcId } from './content';
import { useGame, world } from './store';
import { NPC_SPOTS } from '@/world/Npc';

// What each villager says depends on your progress. Actions are real: they
// start quests, hand over tools and materials, take what they asked for, or
// begin an activity. They speak the way people of the countryside do: summer
// greetings, respectful forms to elders, and old sayings where they fit.

export interface DialogueAction {
  label: string;
  run: () => void;
  primary?: boolean;
}
export interface Dialogue {
  lines: string[];
  actions: DialogueAction[];
}

const g = () => useGame.getState();
const has = (k: string) => (g().inventory[k] ?? 0) > 0;
const done = (k: string) => !!g().steps[k];
const close = () => g().setModal(null);
/** how an elder addresses you */
const child = () => (g().profile.woman ? 'миний охин' : 'миний хүү');

/** The time of day colours the greeting. */
function greeting() {
  const tod = g().tod;
  if (tod === 0) return 'Өглөөний мэнд! Сайхан зусаж байна уу?';
  if (tod === 2) return 'Оройн мэнд. Өдөржин ажил ихтэй байв уу?';
  return 'Сайн байна уу? Мал сүрэг тарган тавтай юу?';
}

const items = (r: Record<string, number>) =>
  Object.entries(r)
    .map(([k, n]) => `${ITEMS[k]?.name ?? k}${n > 1 ? ` ×${n}` : ''}`)
    .join(', ');

/** Today's request from this neighbour, if any: asking, or taking it with thanks. */
function requestPart(id: NpcId, d: Dialogue) {
  const s = g();
  const def = REQUESTS.find((r) => r.id === s.request?.id);
  if (!def || def.npc !== id) return;
  if (s.request?.done) {
    d.lines.push('Өнөөдрийн тусламжийг чинь мартахгүй ээ.');
    return;
  }
  if (s.hasItems(def.needs)) {
    d.lines.push(...def.ask.slice(0, 1), `(Чамд ${items(def.needs)} бэлэн байна.)`);
    d.actions.forEach((x) => (x.primary = false));
    d.actions.unshift({
      label: `Барих: ${items(def.needs)}`,
      primary: true,
      run: () => {
        g().fulfillRequest();
        g().setModal(null);
        setTimeout(() => g().toast(NPCS[id].name, def.thanks), 300);
      },
    });
  } else {
    d.lines.push(...def.ask, `Хэрэгтэй: ${items(def.needs)}`);
  }
}

const PREF_HINT: Record<string, string> = {
  herding:
    'Батбаяр хашааны дэргэд чамайг хүлээж байна. Тарсан хонио хашаалахад нь туслаарай. Малаа хайрласан хүнийг мал нь ч хайрладаг юм.',
  dairy: 'Өнөөдөр хамтдаа саалиа хийе. Надаас зааварчилгаа аваад хувинаа бариад үнээ рүү оч.',
  sewing: 'Ганаа гэрийн баруун урд эсгий дэвсгэр дээрээ оёдол хийж сууна. Гар нь уран хүн. Түүнээс оёдол сур.',
  felt: 'Ганаа эсгий хийх гэж байна. Хайчаа аваад хашааны хонийг хяргаж, ноосоо бэлдээрэй.',
  riding:
    'Дорж өвөө уяаны дэргэд сууж байна. Морио унаад хөндийгөөр яв. «Аавын бийд хүнтэй танилц, агтын бийд газар үз» гэдэг юм.',
  household: 'Гэрт ороод цайгаа чанацгаая. Гэрийнхээ бүтэц, айлын ёсыг ч сайн мэдэж аваарай.',
};

function tsetseg(): Dialogue {
  const s = g();
  const name = s.profile.name;
  if (!done('seen.welcome')) {
    const pref = START_PREFS.find((p) => p.id === s.startPref);
    return {
      lines: [
        `Ай, ${name} минь ирчихэж! Сайхан зусаж байна уу? Манай хотонд тавтай морил.`,
        'Өглөө эрт босоод саалиа хийчихлээ. Нэг хувин сүү, ус, хэдэн аргал бэлдэж тавьсан. Цай чанахад хүрнэ.',
        pref ? PREF_HINT[pref.id] : PREF_HINT.household,
      ],
      actions: [
        {
          label: 'Баярлалаа, ээж ээ',
          primary: true,
          run: () => {
            useGame.setState({ steps: { ...g().steps, 'seen.welcome': true } });
            close();
          },
        },
      ],
    };
  }
  if (!done('milk.talk')) {
    return {
      lines: [
        'Үнээгээ саах цаг боллоо. Тугалууд эхээ эрээд мөөрөөд байна.',
        'Гэрийн хажууд торхны дэргэдээс хувин аваад зэл дээрх үнээ рүү оч. Эхлээд тугалыг нь хөхүүлж сүүг ивүүлдэг юм шүү.',
      ],
      actions: [
        {
          label: 'За, саалиа хийе',
          primary: true,
          run: () => {
            g().complete('milk', 'talk');
            if (has('bucket')) g().complete('milk', 'bucket');
            close();
          },
        },
        { label: 'Дараа', run: close },
      ],
    };
  }
  const d: Dialogue = { lines: [], actions: [] };
  if (has('milk') && !done('dairy.tarag')) {
    d.lines.push(
      'Ямар сайхан сүү вэ! Гэрийн зүүн талын ширээн дээр тараг бүрээрэй.',
      'Аргалын галаа бадрааж буцалгаад, хуруу дүрэхэд бүлээн болтол хөргөөд хөрөнгөө хийнэ.'
    );
  } else if (has('tarag') && !done('dairy.aaruul')) {
    d.lines.push('Тараг чинь зөөлөн исчээ. Одоо ааруул хийе. Ээдмээ шүүж, дараад, хэрчээд дээвэр дээр наранд хатаана.');
  } else {
    d.lines.push(
      greeting(),
      'Айлд зочин ирвэл эхлээд цай аягалж, хоймор луу залдаг юм. Цай нь халуун, сэтгэл нь дулаан байвал айл сайхан.'
    );
  }
  d.actions.push({ label: 'Цацал өргөх ёсны тухай', run: () => g().learn('tsatsal', true) });
  d.actions.push({ label: 'Хоймрын тухай', run: () => g().learn('khoimor', true) });
  d.actions.push({ label: 'Баяртай', primary: !d.actions.some((a) => a.primary), run: close });
  return d;
}

function batbayar(): Dialogue {
  const s = g();
  if (!done('herd.talk')) {
    return {
      lines: [
        'Сайн байна уу! Таван хонь маань бэлчээрт тарчихаж. Хашаанд оруулахад туслаач.',
        'Эхлээд хашааны хаалгыг нээ. Тэгээд хонины ар талаас тайван хөө. Хэт ойртвол тараад гүйнэ. Мал хөөхөд яарвал хоёр дахин удна.',
      ],
      actions: [
        {
          label: 'За, туслая',
          primary: true,
          run: () => {
            g().complete('herd', 'talk');
            g().learn('pen');
            if (g().gateOpen) g().complete('herd', 'gate');
            close();
          },
        },
        { label: 'Дараа', run: close },
      ],
    };
  }
  if (!done('herd.drive')) {
    return {
      lines: [
        `Хашаанд ${s.penned}/5 хонь орсон байна.`,
        s.gateOpen
          ? 'Хонины ар талаас тойрч очоод хаалга руу нь чиглүүл. Хонь сүргээ дагадаг. Нэгийг нь оруулбал бусад нь дагана.'
          : 'Эхлээд хаалгаа нээгээрэй, тэгэхгүй бол орох газаргүй шүү дээ.',
      ],
      actions: [{ label: 'За', primary: true, run: close }],
    };
  }
  if (!done('herd.close')) {
    return { lines: ['Бүгд орлоо! Одоо хаалгаа хаачих, тэгэхгүй бол буцаад гарчихна.'], actions: [{ label: 'За', primary: true, run: close }] };
  }
  const d: Dialogue = {
    lines: [greeting(), 'Малаа шөнө хашаанд хашвал чоно, хүйтнээс аюулгүй. Банхар маань ч харуулдаа сайн.'],
    actions: [],
  };
  d.actions.push({ label: 'Таван хошуу малын тухай', run: () => g().learn('herd', true) });
  d.actions.push({ label: 'Уургын тухай', run: () => g().learn('urga', true) });
  d.actions.push({ label: 'Баяртай', primary: !d.actions.some((a) => a.primary), run: close });
  return d;
}

function ganaa(): Dialogue {
  const actions: DialogueAction[] = [];
  const lines: string[] = [greeting(), 'Эсгий хийх, оёдол оёх хоёр бол миний хамгийн дуртай ажил. Гар завгүй бол сэтгэл амар.'];
  if (!done('felt.talk')) {
    actions.push({
      label: 'Эсгий хийж сурах',
      primary: true,
      run: () => {
        g().complete('felt', 'talk');
        if (!has('shears')) g().addItems({ shears: 1 });
        g().toast('Хайч авлаа', 'Хашааны хонийг хяргаж ноос ав');
        close();
      },
    });
  } else if (!done('felt.felt')) {
    lines.push(
      (g().inventory.wool ?? 0) >= 2
        ? (g().inventory.water ?? 0) >= 1
          ? 'Ноос, ус хоёр чинь бэлэн. Хажууд маань эх эсгий дэлгэчихсэн. Эхлээд ноосоо савна.'
          : 'Ноос чинь хангалттай. Эх эсгийгээ норгох ус хэрэгтэй. Голоос нэг хувин ус авчраарай.'
        : 'Хашаан доторх хонийг хайчаараа хяргаад хоёр баглаа ноос авчир.'
    );
  }
  if (!done('sew.talk')) {
    actions.push({
      label: 'Оёдол сурах',
      primary: !actions.length,
      run: () => {
        g().complete('sew', 'talk');
        if (!has('fabric')) g().addItems({ fabric: 1 });
        if (!has('thread')) g().addItems({ thread: 1 });
        g().toast('Торго, утас авлаа', 'Ганаагийн дэвсгэр дээр суугаад уутаа оё');
        close();
      },
    });
  } else if (has('fabric') && has('thread')) {
    actions.push({
      label: 'Одоо уут оёх',
      primary: !actions.some((a) => a.primary),
      run: () => {
        const sp = NPC_SPOTS.ganaa;
        world.activitySpot = { x: sp.x + 1.0, z: sp.z + 0.3, heading: -Math.PI / 2 - 0.3 };
        close();
        g().startActivity('sewing');
      },
    });
  }
  const d = { lines, actions };
  actions.push({ label: 'Баяртай', run: close });
  return d;
}

function dorj(): Dialogue {
  const s = g();
  const solved = s.mastery.wisdom;
  const solvedToday = !!s.steps[`wisdom.${s.day}`];
  const d: Dialogue = {
    lines: [
      `Сайн байна уу, ${child()}. ${s.tod === 0 ? 'Эрт босвол нэгийг үзнэ, орой унтвал нэгийг сонсоно гэдэг. Эрт боссон чинь сайн.' : 'Ая тухтай сууж, хөөрөг зөрүүлье.'}`,
      'Морь бол монгол хүний хамгийн ойрын нөхөр. Морио зүүн талаас нь унаж, бууж сур. Овоонд очвол нар зөв гурав тойрч, чулуугаа өргөөрэй.',
    ],
    actions: [],
  };
  if (!solvedToday) {
    d.actions.push({
      label: solved ? 'Өнөөдрийн оньсогыг таах' : 'Ухаан сорих (оньсого таах)',
      primary: !d.actions.some((a) => a.primary),
      run: () => {
        const sp = NPC_SPOTS.dorj;
        world.activitySpot = { x: sp.x + Math.sin(sp.heading) * 1.3, z: sp.z + Math.cos(sp.heading) * 1.3, heading: sp.heading + Math.PI };
        close();
        g().startActivity('wisdom');
      },
    });
  } else {
    d.lines.push('Өнөөдрийн оньсогоо тааччихлаа. Маргааш шинийг бэлдэж байя.');
  }
  d.actions.push({ label: 'Монгол адууны тухай', run: () => g().learn('horse', true) });
  d.actions.push({ label: 'Овооны ёс', run: () => g().learn('ovoo', true) });
  d.actions.push({ label: 'Морин хуурын тухай', run: () => g().learn('morinkhuur', true) });
  d.actions.push({ label: 'Баяртай', primary: !d.actions.some((a) => a.primary), run: close });
  return d;
}

export function dialogueFor(id: NpcId): Dialogue {
  const d = talk(id);
  // today's request is part of every conversation (not during the first welcome)
  if (done('seen.welcome')) requestPart(id, d);
  return d;
}

function talk(id: NpcId): Dialogue {
  switch (id) {
    case 'tsetseg':
      return tsetseg();
    case 'batbayar':
      return batbayar();
    case 'ganaa':
      return ganaa();
    case 'dorj':
      return dorj();
  }
}
