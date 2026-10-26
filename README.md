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
src/game/      state (store), quest and info content, terrain math, audio, input, time of day, textures
src/world/     3D: Sky, Terrain/Mountains, Nature (grass, river, clouds, flowers), Ger, Animals, Human, Npc, Life, Player, Interior, Director
src/ui/        Overlay (title, HUD, modals, joystick), TeaPanel
```

To add a new quest, add it to `QUESTS` in `src/game/content.ts` and call `complete(quest, step)` from the matching trigger.
Map locations are in `LOC` in `src/game/terrain.ts`.
