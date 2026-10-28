# NOMADVERSE — Discover the Soul of Mongolia

A playable first demo of the Living Valley: one ger, one valley, a rideable horse, a herd, and five quests.
It runs in the browser with Next.js, React Three Fiber, Drei, Zustand and Framer Motion.
All models, textures and sounds are generated in code, so there are no asset files yet.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move (on horseback: W forward, A/D turn) |
| Shift | Run / gallop |
| Mouse drag, scroll wheel | Rotate and zoom the camera |
| E | Interact: enter the ger, mount or dismount, info |
| T | Switch time of day (morning, day, evening) |
| Esc | Menu |

On touch devices you get a joystick on the left and an E button on the right.

## Starting a journey

Title → **New Journey** (choose a man or woman, name, deel/sash/headwear/hair/boots with a live 3D preview, then a starting activity) or **Continue** (loads the save).
The starting activity only chooses the first quests; every activity stays open to every character.
Progress is saved automatically to `localStorage` (`nomadverse.save.v1`), and also from the menu.

## Activities (`src/game/activities.ts`)

Each activity is data: required and consumed items, rewards, the quest step it completes, the knowledge it unlocks, and steps (`choice`, `hold`, `taps`, `alternate`, `wait`, `stitch`).
`src/ui/ActivityPanel.tsx` plays any of them.

| Activity | Where | Needs → gives |
|---|---|---|
| Хонь хашаалах (herding) | Батбаяр, the pen | drive 5 sheep in through the gate |
| Үнээ саах (milking) | the cows | хувин → сааль сүү |
| Тараг бүрэх | the kitchen table in the ger (east side) | сүү → тараг |
| Ааруул хийх | same | тараг → ааруул (dries on the roof rack) |
| Хонь хяргах (shearing) | inside the pen | хайч → ноос ×2 |
| Эсгий хийх (felt-making) | Ганаагийн дэвсгэр | ноос ×2 → эсгий |
| Хөөргийн уут оёх (sewing) | Ганаа | торго + утас → уут |

People: Цэцэг (household, dairy), Батбаяр (herding), Ганаа (felt-making and sewing), Дорж өвөө (horses and customs).
Keys: **I** opens your items, **J** opens Монгол өвийн мэдлэг.

### How the work connects

The activities feed one another, the way they do in a real household:

- **Аргал** (dried dung, the steppe's firewood) is gathered from patches on the pasture (E). Each patch gives one a day, and new ones appear each morning.
- **Water** is fetched at the river bank (E, on foot).
- **Tea** needs water, аргал and milk. **Tarag** and **aaruul** each burn one аргал. **Felt** needs water to wet the wool.
- Each **cow** gives milk once a day, because the calf's share is left.
- A new journey starts with Цэцэг's morning stock: milk ×1, water ×2, аргал ×3.
- **Neighbours' requests:** each day one neighbour asks for something you know how to make.
  Дорж wants tea and aaruul. Цэцэг wants аргал and water. Ганаа wants wool. Батбаяр wants felt.
  Bringing it earns **нэр хүнд** (standing) with titles (Айлсаг хүн → Ахуйч → Нутгийн түшиг → Тал нутгийн мэргэн) and a return gift.

### Thinking steps and language

- After a right choice, a short **insight** explains the custom behind it.
- **Order puzzles** (`order` step) ask for the right sequence: building a ger, the steps of sewing.
- **Дорж өвөөгийн оньсого** (daily): one proverb to complete, one riddle and one question on customs, different each day.
- In the tea mini game you pour for the elder in the хоймор first, then the mother of the house, and yourself last.
- Every activity ends with its **Цаад утга** (the meaning behind the work) and a closing **ерөөл** (blessing).
  Characters greet by time of day and season, and address you as an elder would.

### Star rating and craft levels

Every activity is rated from the mistakes made while doing it: a wrong choice, overshooting or stopping short of a meter zone, pressing the same hand twice, or missing a stitch.
0 mistakes gives ★★★, 1–2 gives ★★, more gives ★.
Flawless milking, aaruul and shearing earn extra produce, and each star adds XP.
How often you have done an activity sets its craft level: Шинэхэн → Суралцагч (1) → Дадлагатай (3) → Ур чадвартай (6) → Мастер (10).
The levels are shown in the journal (**J**).

## Daily life (returning play)

- **Days and chores:** each day lists up to three chores, drawn from the work you have already learned: milking, tarag, aaruul, shearing, tea, penning the flock, circling the ovoo and the horse race.
  The sun moves with the work: it is noon after the first chore and dusk when all are done.
  Lie down on a bed in the ger at dusk, or once the chores are done, to sleep to the next morning.
  A new day brings new chores, the flock back out on the pasture, and the pen sheep's wool grown again.
- **Daily return gift:** opening a saved journey on a new calendar day gives a small gift and XP.
  Coming back on consecutive days builds a streak, which increases the XP.

## Naadam horse race (`src/game/race.ts`, `src/world/Naadam.tsx`)

The racecourse is on the steppe east of the camp, with a start/finish arch, flagged gates, the officials' tent and three child jockeys.
Ride your horse to the arch and press **E**. After the 3-2-1 countdown, ride three laps through the gates in order; the next gate's flags turn gold.
Dismounting or riding far off the course ends the race.
The places use the traditional names (Түрүү морь, Аман хүзүү, Айргийн тавд, Бөхөн тэргүүн).
Winning gives a Наадмын медаль. Your race count, wins and best time are saved.

## Quests

1. **Өглөөний хөндий**: leave the ger, approach the horses, explore the river bank.
2. **Сүүтэй цай**: enter the ger and make tea (pot, water, boil, brick tea, milk/salt, ladling, pouring).
3. **Гэрийн бүтэц**: click the тооно, унь, хана, багана and гал голомт inside the ger.
4. **Морин аян**: mount the saddled horse and ride to the ovoo on the hill.
5. **Овоо тахих**: circle the ovoo clockwise three times, then add a stone.

## World and characters

- **People** (`src/world/Human.tsx`): jointed figures in deel with knees and elbows that bend, a face with eyes that blink, the энгэр lapel, sash, хэт хутга knife set and гутал boots. They walk, run, breathe, glance around and ride.
- **Ээж** stands by the door and you can talk to her. **Аав** rides around the sheep with an уурга. A **банхар** dog lies by the ger.
- **Horses** (`src/world/Horse.tsx`): body, neck and head built as continuous lofted surfaces (`src/game/geo.ts`), jointed legs, walk/trot/gallop gaits, ears that flick, tilt to the ground slope, bridle and reins, arched Mongolian saddle.
- **Sheep, goats and camels**: fat-tailed sheep with a fleece surface and legs that step; two-humped camels from lofted surfaces.
- **Grass** follows the player everywhere; ground height and density come from a heightmap texture.
- **Interactions**: the ger door opens when you go in, the pen gate opens and closes with E, and the fence is solid.
- **Light and atmosphere**: golden hour, sunset, sun-lit clouds, snow-capped mountains, a rippling river that reflects the sky, and wildflowers.

## Testing

`window.__nv` gives automated tests access to the game state and the 3D camera.
A playtest script completes all 5 quests with real inputs.

## Structure

```
src/game/      state + save (store), content (quests, items, NPCs, knowledge), activities, dialogue, terrain, audio, input, time of day, textures
src/world/     3D: Sky, Terrain/Mountains, Nature (grass, river, clouds, flowers), Ger, Animals, Horse, Livestock (cattle, herding sheep), Human, Npc, Life, Player, Interior, InteriorPlayer, Director
src/ui/        Overlay (title, HUD, dialogue, inventory, journal, joystick), Create (character creation), ActivityPanel, TeaPanel
```

To add a new quest, add it to `QUESTS` in `src/game/content.ts` and call `complete(quest, step)` from the matching trigger.
Map locations are in `LOC` in `src/game/terrain.ts`.
