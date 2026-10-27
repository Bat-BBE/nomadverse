import { START_PREFS, type NpcId } from './content';
import { useGame, world } from './store';
import { NPC_SPOTS } from '@/world/Npc';

// What each villager says depends on your progress. Actions are real: they
// start quests, hand over tools and materials, or begin an activity.

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

const PREF_HINT: Record<string, string> = {
  herding: 'Батбаяр хашааны дэргэд чамайг хүлээж байна. Тарсан хонио хашаалахад нь туслаарай.',
  dairy: 'Өнөөдөр хамтдаа саалиа хийе. Надаас зааварчилгаа ав, дараа нь хувинаа аваад үнээ рүү оч.',
  sewing: 'Ганаа гэрийн баруун урд эсгий дэвсгэр дээрээ оёдол хийж сууна. Түүнээс оёдол сур.',
  felt: 'Ганаа эсгий хийх гэж байгаа. Хайчаа аваад хашааны хониноос ноос хяргаарай.',
  riding: 'Дорж өвөө уяаны дэргэд сууж байна. Морио унаад хөндийгөөр аялаарай.',
  household: 'Гэрт ороод цайгаа чанацгаая. Гэрийнхээ бүтэц, ёс заншлыг ч сайн мэдэж аваарай.',
};

function tsetseg(): Dialogue {
  const s = g();
  const name = s.profile.name;
  if (!done('seen.welcome')) {
    const pref = START_PREFS.find((p) => p.id === s.startPref);
    return {
      lines: [`Сайн байна уу, ${name}! Манай хотонд тавтай морил.`, 'Энд аав, ээж, ах дүүс маань малаа маллаж, ахуйгаа хөтөлж амьдардаг.', pref ? PREF_HINT[pref.id] : PREF_HINT.household],
      actions: [
        {
          label: 'Баярлалаа, ээж ээ',
          primary: true,
          run: () => {
            useGame.setState({ steps: { ...g().steps, 'seen.welcome': true } });
            g().setModal(null);
          },
        },
      ],
    };
  }
  if (!done('milk.talk')) {
    return {
      lines: ['Үнээгээ саах цаг боллоо. Гэрийн дэргэдэх торхны хажуугаас хувин аваад зэл дээрх үнээ рүү оч.', 'Саахын өмнө тугалыг нь хөхүүлж сүүг ивүүлдэг юм шүү.'],
      actions: [
        {
          label: 'За, саалиа хийе',
          primary: true,
          run: () => {
            g().complete('milk', 'talk');
            if (has('bucket')) g().complete('milk', 'bucket');
            g().setModal(null);
          },
        },
        { label: 'Дараа', run: () => g().setModal(null) },
      ],
    };
  }
  if (has('milk') && !done('dairy.tarag')) {
    return {
      lines: ['Ямар сайхан сүү вэ! Гэрийн зүүн талын ширээн дээр тараг бүрээрэй.', 'Буцалгаад бүлээн болтол хөргөөд хөрөнгөө хийнэ. Дараа нь дулаан бүрнэ.'],
      actions: [{ label: 'Ойлголоо', primary: true, run: () => g().setModal(null) }],
    };
  }
  if (has('tarag')) {
    return {
      lines: ['Тараг чинь сайхан исчээ. Одоо ааруул хийе. Ээдмээ шүүж, дараад, хэрчээд дээвэр дээр наранд хатаана.'],
      actions: [{ label: 'За', primary: true, run: () => g().setModal(null) }],
    };
  }
  return {
    lines: ['Айлд зочин ирвэл эхлээд цай аягалж, хоймор луу залдаг юм.', 'Ахуйгаа сайн мэддэг хүн хаана ч очсон айлсаг байдаг.'],
    actions: [
      { label: 'Хоймрын тухай', run: () => g().learn('khoimor', true) },
      { label: 'Баяртай', primary: true, run: () => g().setModal(null) },
    ],
  };
}

function batbayar(): Dialogue {
  const s = g();
  if (!done('herd.talk')) {
    return {
      lines: [
        'Сайн уу! Таван хонь маань бэлчээрт тарчихаж. Хашаанд оруулахад туслаач.',
        'Эхлээд хашааны хаалгыг нээ. Тэгээд хонины ар талаас тайван хөө. Хэт ойртвол тараад гүйнэ.',
      ],
      actions: [
        {
          label: 'За, туслая',
          primary: true,
          run: () => {
            g().complete('herd', 'talk');
            g().learn('pen');
            if (g().gateOpen) g().complete('herd', 'gate');
            g().setModal(null);
          },
        },
        { label: 'Дараа', run: () => g().setModal(null) },
      ],
    };
  }
  if (!done('herd.drive')) {
    return {
      lines: [`Хашаанд ${s.penned}/5 хонь орсон байна.`, s.gateOpen ? 'Хонины ар талаас тойрч очоод хаалга руу нь чиглүүл. Морьтой хөөвөл бүр амар.' : 'Эхлээд хаалгаа нээгээрэй, тэгэхгүй бол орох газаргүй шүү дээ.'],
      actions: [{ label: 'За', primary: true, run: () => g().setModal(null) }],
    };
  }
  if (!done('herd.close')) {
    return { lines: ['Бүгд орлоо! Одоо хаалгаа хаачих, тэгэхгүй бол буцаад гарчихна.'], actions: [{ label: 'За', primary: true, run: () => g().setModal(null) }] };
  }
  return {
    lines: ['Баярлалаа, малчин хүн шиг л хөөлөө шүү.', 'Малаа шөнө хашаанд хашвал чоно, хүйтнээс аюулгүй.'],
    actions: [
      { label: 'Таван хошуу малын тухай', run: () => g().learn('herd', true) },
      { label: 'Уургын тухай', run: () => g().learn('urga', true) },
      { label: 'Баяртай', primary: true, run: () => g().setModal(null) },
    ],
  };
}

function ganaa(): Dialogue {
  const actions: DialogueAction[] = [];
  const lines: string[] = ['Сайн уу! Эсгий хийх, оёдол оёх хоёр бол миний дуртай ажил.'];
  if (!done('felt.talk')) {
    actions.push({
      label: 'Эсгий хийж сурах',
      primary: true,
      run: () => {
        g().complete('felt', 'talk');
        if (!has('shears')) g().addItems({ shears: 1 });
        g().toast('Хайч авлаа', 'Хашааны хонийг хяргаж ноос ав');
        g().setModal(null);
      },
    });
  } else if (!done('felt.felt')) {
    lines.push(has('wool') && (g().inventory.wool ?? 0) >= 2 ? 'Ноос чинь хангалттай. Хажууд маань эх эсгий дэлгэчихсэн байгаа, эхлээд ноосоо савна.' : 'Хашаан доторх хонийг хайчаараа хяргаад хоёр баглаа ноос авчир.');
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
        g().setModal(null);
      },
    });
  } else if (has('fabric') && has('thread')) {
    actions.push({
      label: 'Одоо уут оёх',
      primary: true,
      run: () => {
        const sp = NPC_SPOTS.ganaa;
        world.activitySpot = { x: sp.x + 1.0, z: sp.z + 0.3, heading: -Math.PI / 2 - 0.3 };
        g().setModal(null);
        g().startActivity('sewing');
      },
    });
  }
  actions.push({ label: 'Баяртай', run: () => g().setModal(null) });
  return { lines, actions };
}

function dorj(): Dialogue {
  return {
    lines: ['Сайн байна уу, миний хүү. Морь бол монгол хүний хамгийн ойрын нөхөр.', 'Морио зүүн талаас нь унаж, буудаг юм. Овоонд очвол нар зөв гурав тойроорой.'],
    actions: [
      { label: 'Монгол адууны тухай', run: () => g().learn('horse', true) },
      { label: 'Овооны ёс', run: () => g().learn('ovoo', true) },
      { label: 'Морин хуурын тухай', run: () => g().learn('morinkhuur', true) },
      { label: 'Баяртай', primary: true, run: () => g().setModal(null) },
    ],
  };
}

export function dialogueFor(id: NpcId): Dialogue {
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
