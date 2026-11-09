# Gemini prompts for TapkoTyper assets

Images and background music for the game. Sound effects stay synthesized in code.

## How to use

1. Copy one prompt (the whole code block) into Gemini.
2. Save the result into this folder (`assets-src/`) with **exactly the file name** in the
   heading, for example `assets-src/tapko-fox-idle.jpg`. Images are delivered as jpg;
   music as mp3, wav or m4a.
3. Run `npm run assets` (or ask Claude to) and commit `public/assets/`. It removes the flat
   background, trims (except companions and outfits, which keep their square), resizes
   and writes web files to `public/assets/`; the game uses each file that exists.
   Raw files in this folder are not committed, only the processed ones.

The game works without any of these files (it draws simple shapes instead), so you can make
them in any order, skip some, or redo one later with the same name.

### Tips
- **Title first:** start every prompt with `Generate an image: <short title>`, for example
  `Generate an image: Song sheet`, then an empty line and the prompt, so the Gemini chat
  shows at once what the picture is.
- **Same look everywhere:** every prompt carries the same style paragraph. Keep it.
- **Companions and accessories** always start from `base-template.jpg` (see section 1).
- **Background must stay flat:** sprites ask for a flat single-color background
  (magenta or green). The script removes it. If Gemini adds a floor, shadow or gradient,
  ask: "Same image, but the background must be one flat color, no shadow."
- **No text in images.** If letters appear, ask for the same image without text.
- If a result is scary, sharp-toothed or angry, ask again; everything must feel friendly and safe.

### Lessons from generating
Notes from real Gemini runs; add new ones here.
- **Less detail is often better** (the owner, 2026-11-06). For an everyday object, name it and
  let Gemini draw it as it really looks ("one ordinary brown pine cone, as it really looks").
  A precise description of its shape bends the picture into something wrong: "a short stem at
  the top" made the pine cone stand on its tip, and "kidney-shaped" made the poppy seed a bean.
  Do not describe where the stem, tip or parts go; give colors only where they matter, and keep
  only the rules about face, background and margin. The owner regenerates odd pictures.
- An object standing on the ground (the upright rocket on its fins) came with a dark floor
  shadow despite "no shadow, no floor"; one follow-up "remove the shadow under it completely,
  the background one flat color everywhere" fixed it.
- A background layer painted on a clean cyan key (the owner's valley layers) keys out without
  the purple rim a magenta key leaves in grass tips; its blue art leans to the key, so it skips
  the pocket rules (`CLEAN_KEY` in scripts/assets.mjs).
- A soft glow or halo (a light bulb) blends into the magenta and leaves a pink fringe after
  keying. Ask for light as "a few short thin ray lines with dark outlines, no soft glow, no halo".
- Hands (section 12): a photo of real hands as a reference made Gemini redraw the keyboard (extra
  rows, the keys moved) and curl the fingertips into an arc; without photos, editing one finger of
  the finished home picture keeps the keyboard. "Bigger hands" made them chubby and broke the
  keyboard (the hands now come from the hand tool, section 12). A follow-up in the bridge sometimes
  runs in a new empty chat (an unrelated picture comes back): queue a new picture with the home
  picture attached instead.
- With an attached character picture, "a new pose" keeps its stance and only changes the arms
  (Ms Turtle came back standing the same way twice). Say "the body pose must be completely
  different from the attached picture" and describe the legs and the view concretely (sits
  with the hind legs stretched forward, walks on all four legs seen from the side).
- A motion word on an object ("bouncing", "running") makes Gemini add arms and legs. Say
  "no arms, no legs" when the object should stay an object.
- The common prompt's "friendly faces ... where the object has a face" gives a face to things
  that should have none (a stone of the fire pit). Say "NO face, no eyes" for every thing.
- A word for a part is taken literally: "a pale cream heart" (the flame's core) drew a heart
  shape. Name the shape instead ("a soft pale cream teardrop core").
- A near band the owner drew as one tall picture kept a soft pink halo on its grass tips that no
  keying cleaned; the sheet of low strips (near prompt) comes with crisp edges. A seam repaint of
  such a strip came back tinted purple: joining the strip's own two ends along the column path
  where they match best is safer. Attaching a picture as a style sample makes Gemini copy it.
- Pictures of one set (the four flames) come out alike only from one chat, or with the first
  one attached; separate chats drift in shape and color.
- A vague technical object ("a round gate with three panels") turns into a character with a
  face. Describe the shape concretely (material, how the parts are split, where they meet),
  add "no face" and "strictly front view, symmetrical".
- The common sprite prompt ("faces where the object has a face", "side view facing right")
  gives flat things like a picture frame a face and a skewed shape. For such objects say
  "no face, no eyes" and "strictly front view, not tilted".
- When the game draws a state itself (battery charge bars, a glowing ring), ask for the
  empty or neutral state, otherwise Gemini fills it with colors.
- The "flat" background is never perfectly flat: magenta varies by about 40 in the green
  channel across the image. `npm run assets` copes with it; only a floor, shadow or real
  gradient needs a fix.
- Clear or shiny things (a water drop, glass) take on the key color: the dew drop came out
  pink on magenta. Give such objects their own color in hex ("light blue water #BFE6F7").
- A follow-up keeps the wrong shape of the first picture. Use it only for color or a small
  detail; when the shape or the view is wrong, send a new prompt. The nut stayed a
  front-view hexagon with a hole drawn from the side (thread wall visible) after a follow-up.
  Front-view objects with a hole: "the hole is a clean flat circle, no inner wall, no depth".
- "The image can repeat horizontally" in a room scene made Gemini draw the room twice, as
  two rows stacked in one picture. Add "one single continuous scene filling the whole image,
  not split into rows, panels, strips or a grid" and list different things ("nothing repeated").
- An image whose subject is tall (a flower on a stem) gets cut at the bottom edge. Say where
  it ends ("the stem ends well above the bottom edge, nothing touches any edge").
- In a strip, "ground in the ground color of the world" can come out pink-violet (garden near)
  and the key then eats it. Name the ground color in hex and add "never pink, purple or magenta".
- With the whole WORLD STYLE block in a strip prompt (sky and hill colors), Gemini painted a
  sky, hills and a camp behind the pieces (a camp strip, since removed). Leave the sky and hill colors
  out of the strip palette, open with "THE WHOLE IMAGE IS ONE FLAT SOLID PURE MAGENTA EXCEPT
  THE PIECES AND A LOW GROUND BAND" and list what is absent ("NO sky, NO hills, NO tents").
- A switched-on lamp in a strip throws a pink glow into the magenta. Ask for lamps switched
  off and "no glow, nothing behind the pieces except magenta".
- "Silver" alone comes out cream or white. Say "blue-grey steel" and give hex shades.
- With an attached reference, Gemini keeps its pose: "curled up asleep" on a sitting dragon
  stayed sitting. Describe the new pose in full ("lying on its belly, curled like a
  sleeping cat, head on its paws") and add "clearly lying, not sitting".
- The background tone drifts (the twig got a dull 229,85,216 instead of 255,0,255). The
  script samples the key from the corners, so it still works.
- A back item cut from an outfit (butterfly wings, backpack) keeps the hole where the body
  was, and "complete the hidden part" alone turned the backpack into a plain slab. Dress the
  template in the single item first, then name what the hidden part shows ("a front pocket
  with a zipper, a flap with a buckle").
- "A carry loop above the shoulders" put a loop on top of the head; leave it out.
- Phase pictures edited from one base (the poppy's bud to seed head) keep the stem, its leaves
  and its bottom end. Gemini hardly changes the height on request ("one fifth lower"), so the
  game scales the phases.
- "Walking stick with a crook handle" reads as a crutch; say "straight, a round knob on top".
- A hand item still moves the arm. In the cut-out list every part of the character
  ("head, face, eyes, both arms, paws, legs"), or the whole figure can stay; a cut-out in a
  new chat with the dressed picture attached worked where a follow-up did not.
- A thin gold chain cut out on green came out green-gold (the key mixed into the links). Cut
  thin gold or yellow lines out on magenta and give the gold in hex. "Make it bolder" in a
  follow-up made the chain three times larger; it was scaled back to the first size locally.
- A strip "standing on a low ground band" came out with a flat green stripe along the bottom,
  which does not look like a meadow. Let the plants grow out of the bottom edge ("cut by the
  bottom edge, no ground, no soil, no horizontal line").
- "As if the viewer lies in the grass" gave a magenta-to-grey haze behind the plants (Gemini
  said so in its answer). A follow-up "the background one flat magenta, keep the plants" fixed it.
- A follow-up carries the whole chat: asking for closed flowers "in the same daytime colors"
  after an evening recolor in the same chat came out dark again. Ask from the right picture.
- A plank floor in a near strip comes out with planks fanning out from the middle (perspective),
  so every join of the repeated strip shows a V. Even "ALL PLANKS PERFECTLY VERTICAL AND PARALLEL,
  NO perspective, NO fanning" fixed only one strip of the three (robohome near, 2026-10-26: the
  bottom strip, squashed to 150 px and quilted with itself as the donor).
- A sun with rays got uneven rays; for a calm sun ask for "a smooth perfect circle, no rays".
- A Gemini seam repaint of a band on magenta tinted the magenta in the repainted middle pink, and the
  key kept it, and dark violet rim pixels along the band's top were left as a purple fringe. Run
  `node scripts/defringe.mjs <layer.png> <layer.png>` before `npm run assets`: tinted pixels touching
  the key become the key, things inside keep their colors (planet, 2026-10-28).
- "A few little grass blades at its foot" or "a tiny second mushroom" in a small object's prompt gave
  a sprite that cannot be reused; for one object say "ONE single ..." and "NOTHING else: no grass,
  no leaves, no ground, no second ..." (mushrooms, 2026-10-28).
- A detailed near and mid layer (grass with crystals, mushrooms, bulbs and ferns) swallowed the game's
  own crystals, signposts and words on the planet's meadow (2026-10-28). Where objects with words
  stand on a layer, ask for "LOW detail, calm and simple", "mostly plain grass, lots of calm empty
  green" and name what must not be in it (the things the game draws).
- Pieces the page animates on their own (sun, clouds, moon, stars) are one picture each. A
  picture with pieces that do not touch can be cut apart locally (the moon and its stars).
- A short sprite prompt ("a butterfly with pink wings and round spots") gives a plain, simple
  picture. For a richer one describe the details (veins, cells, edge band, eye-spots, colors
  in hex). Do not attach an older sprite as the model: the new one then barely differs.
- "Silver" again failed (no picture); the screw worked with "blue-grey steel" hex shades and
  "strictly front view, symmetrical, no face".
- A single strip on magenta always came out about half the picture tall, whatever the pixel
  heights in the prompt; an attached layout (magenta with a white band to fill) was ignored too.
  A "sheet of three low strips stacked above each other" came at the asked scale (190 px each).
- A far seam repaint with the usual 30 % gap drew a pass or valley with distant low mountains in
  it (egg, 2026-10-31); `prep <img> <dir> 0.14` and "one big peak as high as the ones beside it, NO
  pass, NO valley" kept the ridge line. A low strip at the bottom of a tall magenta frame came back
  drawn twice, the second copy in the magenta; "a single low strip at the bottom ... the magenta area
  stays empty, do not add a second strip" fixed it, and naming the things to draw ("low flat rocks,
  one mushroom, one crystal group; no stacked stones") gave a middle like the sides.
- A colored fill (blue) in a seam repaint tinted the sky painted into it; white "empty paper"
  did not. An inpainting prompt that starts with "Generate an image" gets a new picture.
- A follow-up "less sky" stacked the landscape twice in one picture; ask again from scratch.
- Attached style samples are copied almost one to one (composition too) and cost the limit;
  describe the style in words.
- Small scattered things (stars, sparkles) on flat magenta came out as a sticker sheet: neat
  groups of the same shape at even spacing. On black ("a natural star field like a real
  photograph") Gemini scatters them at random; see `black` in section 3.
- Saying that a landscape "repeats horizontally" made Gemini draw the scene twice side by side
  in one picture (dragon valley), as with the room before. The seam is made by the tool: the
  far prompt does not mention repeating at all.
- "The sky is only a thin band at the top" gave a sky band cut off by a hard line (planet).
  "The horizon is high: only a little sky shows above the hills" does not.
- "The sun hidden behind the mountains" still paints one bright glow, which repeats along the
  layer; ask for "evenly lit sky, the same brightness across the whole width, no bright spot".
- "Nothing touches the image edges" makes a layer of scattered things repeat without any seam fix.
- A layer repeats every screen width: one big object in it (a planet 200 px wide) shows twice
  side by side on a wide screen. Keep things in the mid and near layers small and many.
- The space layers looked like ghosts when the game drew them at 40 %; designed layers are drawn
  opaque.
- Black outlines on soft space objects looked like stickers; "soft gentle shading, no dark
  outlines" fits painted space.
- The key colour takes everything near it: a bronze bust with "a hint of green patina" on green lost
  its greenish folds to holes (2026-11-09). Pick the background the object has no shade of, and say
  "never green or teal" (or pink) for the object when it could drift there.
- Small throwables (46 px): "a bold, simple shape with a clear outline, easy to recognise as a
  tiny icon of about 46 pixels" plus hex colors gave 36 of 36 clean pictures on the first try.
  A second state of a thing (a cracked egg, a lit bulb) kept its size and outline when the
  first picture was attached with "redraw the attached ... in exactly the same style, size,
  position" and only the change named.
- "Palms facing the right side, three-quarter view" (goalkeeper gloves) gave palms toward the
  viewer every time; the game leans the picture to the right instead of asking again.
- Layers of one figure (the space suit, then the suit with its helmet): make the first on the
  template, then a follow-up in the same chat that adds only the next part, saved to another
  file. Both stayed within 2 px of the template, so the game can stack and cut them.
- Editing a sprite with two attachments ("replace the figure in the window of the first picture
  with the astronaut of the second, keep everything else exactly the same") kept the rocket's
  size and position to the pixel: the two pictures swap without a jump.
- Animation frames from an attached picture ("the next frame of a wing-flap") keep the body in
  place, but Gemini also keeps the pose: "wings level" and "wings halfway" came back raised as
  before. What moved them was a measurable rule: "the highest point of both wings is lower than
  the top of the head, the upper half above the head stays empty". A follow-up "lower the wings
  to horizontal" only cut the wings' top edge flat; to move a part, ask to turn it "as one rigid
  piece around the shoulder by about 30 degrees, not squashed or trimmed" and say where its tip
  ends.
- A certificate frame that scales: ask for sides that are "completely plain, so it can be
  stretched" and put all ornaments in the corners; or ask for parts (one L-shaped corner whose
  arms run plain to the image edges, and a "sheet of three border bands" cut by both side
  edges). All five such prompts came out clean and symmetrical on the first try; the page joins
  the parts with CSS border-image (bands repeat, cut between two motifs).
- Mountain layers (2026-10-31): a sheet of two strips came on a dull pink key (196,82,154), not magenta,
  so `strips` found nothing; turning the pixels near that tone to #FF00FF locally first fixed it. The mid
  strips came 130 px tall although 330 was asked. Quilting a mid strip from itself repeated a slab and
  a mushroom pair side by side; the other strip of the sheet as donor did not. Gemini's seam repaint gave
  the middle sky a greyer tone than the sides (a visible rectangle): a per-row offset on the sky-like
  pixels inside the gap fixed it. The near sheet's path came 18 px too high: `lift <img> -14` put its
  middle at 89 % of the stage.
- A follow-up that asks for a different aspect ("four times wider than tall", "ten times taller than
  wide") changed almost nothing: the mud puddles stay 2.3 and 2.7 times wider than tall, the poles 1.7,
  3.3 and 3.9 times taller (the planet's posts are 3.1, 5.8 and 6.1). An object of a square picture keeps
  about its shape; plan for the game to scale it or accept the shape.
- Fill levels of one container (Rytmus's basket, 2026-11-07): drawing each fill again from the empty
  basket attached kept the basket but put the letters anywhere, so the steps did not follow each other.
  Make the **full** picture first and each smaller fill by removing things from it in follow-ups of the
  same chat ("only remove letters so that about N remain, change nothing else"), not by drawing each
  variant again: what stays keeps its size and position.
- Swapping one thing in a picture (the badger's notebook for a keyboard, the squirrel's backpack for a
  basket, 2026-10-31) worked best as a new picture in a new chat with the old one attached: "Redraw the
  attached picture with exactly the same ... Change only one thing: ...". Two animals made from the same
  prompt and style sample came out in the same pose and layout; moving the desk to the other side for a
  difference was not wanted, a different prop (a basket of acorns) was enough.
- A treasure map with a dashed route through eight places (2026-11-09): only the first, simplest prompt
  gave one unbroken line; every richer prompt (obstacles, a river, positions, the line split into named
  segments A to B ...) broke it into pieces or drew places twice. A follow-up "make the parchment bigger"
  laid a second sheet around the first (two torn edges). The anime background style on a map came out
  worst (the owner); the storybook vector style suits it. "A town beside a cloud" put the town on the
  cloud; say "standing on green grass, the cloud floating behind it". A "wooden table" around the paper
  needs a magenta background from the start.

---

## 1. Tapko and friends (companions)

All companions and all accessories are built on **one shared body template**, drawn
straight from the front and symmetrical. Every animal keeps exactly the same pose, size and
position as the template, so every accessory fits every animal without any adjustment.

How it works:
1. Make the template once (`base-template.jpg`).
2. Make the accessories: dress the template in an outfit set, then ask Gemini to remove the
   figure and keep only the clothes in place (section 2).
3. Make each animal from the template (this section). Faces change only the eyes and mouth.

**Always attach `base-template.jpg` to the chat** (new chat for each animal or outfit), so
Gemini starts from the same figure. Image size: square, keep what Gemini gives (at least
1024 x 1024). Do not crop the images; the empty space around the figure matters, because
everything is placed by its position in the square.

### base-template.jpg
```
Cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, rounded friendly shapes, soft dark-brown outlines (not black), light soft shading. No text, no letters, no watermark.

A neutral character template for a children's game: a small chubby cute creature with no species features yet - no ears, no tail, no beak, no fur pattern, no clothes. Plain warm light-grey color. Strictly front view, facing the viewer directly, perfectly left-right symmetrical. Proportions like a plush toy: a big round head (about 45 % of the total height) with large shiny dark eyes with white highlights, a tiny smile and small pink cheeks; a short round body; short arms hanging down slightly away from the body, with round paw hands at hip height; two short legs with round feet, standing, feet slightly apart. Calm, friendly expression.

Composition: square image, the figure is centered horizontally, the top of the head at about 15 % of the image height and the bottom of the feet at about 90 %, with empty space on both sides. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no floor, no shadow, no other objects.
```

### Animals: tapko-KIND-idle.jpg
Attach `base-template.jpg` and use this prompt; replace ANIMAL with the text from the table.
```
Turn the attached character template into ANIMAL. Keep exactly the same front view, symmetry, pose, size, position in the image, head size and position, eye position, arm and leg positions and outline thickness. Only add the animal features: ears, fur colors and patterns, tail, muzzle or beak. Ears must stay close to the head (no long upright ears sticking far above it), so that a hat could still sit on top of the head. A tail may peek out from the side behind the body. No clothes, no accessories.

Same style: cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, soft dark-brown outlines, light soft shading, friendly, suitable for children and young teens aged 10 to 15. No text. Background: one perfectly flat solid pure magenta color (#FF00FF), no shadow, no floor. Same square size as the template.
```

| File (KIND) | ANIMAL |
|---|---|
| `tapko-fox-idle.jpg` | Tapko, a baby fox: soft orange fur, cream belly, muzzle and cheeks, small rounded triangle ears with dark tips, fluffy orange tail with a cream tip |
| `tapko-cat-idle.jpg` | a kitten: light grey fur with soft darker stripes on the head, white belly, muzzle and paws, small triangle ears, striped tail |
| `tapko-bunny-idle.jpg` | a lop-eared bunny: warm cream fur, ears hanging down along the sides of the head, pink nose, round fluffy white tail |
| `tapko-owl-idle.jpg` | a baby owl: soft teal and cream feathers, small feather tufts as ears, big golden rings around the eyes, tiny orange beak, wing tips instead of hands |
| `tapko-dog-idle.jpg` | a puppy: golden-beige fur, white muzzle and belly, soft floppy brown ears, black round nose, short wagging tail |
| `tapko-bear-idle.jpg` | a teddy bear cub: warm brown fur, light tan muzzle and belly, small round ears |
| `tapko-panda-idle.jpg` | a baby panda: white fur with black round ears, black eye patches around the (still big and shiny) eyes, black arms and legs |
| `tapko-penguin-idle.jpg` | a baby penguin: dark blue-grey back and head, white face and belly, small orange beak and orange feet, flippers instead of hands, no ears |
| `tapko-lion-idle.jpg` | a lion cub: golden fur, small round ears, a short fluffy light-brown mane that stays close around the head, cream muzzle, tail with a brown tuft |

### The astronaut: tapko-astronaut-suit.jpg, then tapko-astronaut.jpg
The space world's suit-up: the game draws the suit below its collar over the companion, then
the whole astronaut. Attach `base-template.jpg`:
```
Generate an image: Astronaut suit on the template

Dress the attached character template in this one item, and nothing else: a puffy white children's astronaut space suit without a helmet. The suit covers the whole body, both arms and both legs completely, so no grey skin is visible below the neck: white padded fabric with soft light-grey folds, white gloves on the paws, chunky white boots on the feet, a round light-grey collar ring at the neck where a helmet would attach, a small square control panel with two tiny colored buttons on the chest. No helmet: the head stays exactly as in the template, uncovered. Keep exactly the same front view, symmetry, pose, size, position and outline of the character. Both arms stay exactly as in the template, hanging down with the paws at hip height: never raise, bend or move an arm or paw. The suit must fit the figure closely, be symmetrical and be complete (no part cut off). Same style: cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, soft dark-brown outlines. No text, no letters, no flags, no logos. Background: one perfectly flat solid pure magenta color (#FF00FF), no shadow. Same square size, 1024 x 1024 pixels.
```
Then a follow-up in the same chat, saved as `tapko-astronaut.jpg`:
```
Same picture, and now add a round astronaut helmet on the head, attached to the collar ring. The helmet is a big white rounded shell that fully covers the whole head, slightly larger than the head, with a large opaque visor in front: the visor is glossy deep blue (#2B3F7A) with one soft white highlight stroke, completely opaque, so the face and the head are not visible at all through it. Keep the suit, the pose, the size, the position and everything else exactly the same. Background: one perfectly flat solid pure magenta color (#FF00FF), no shadow. Same square size, 1024 x 1024 pixels.
```
The collar's top edge (52 % of the height) is `SUIT_NECK` in `src/game/modes/space.ts`.

### Faces: tapko-KIND-happy.jpg and tapko-KIND-thinking.jpg
Attach that animal's `tapko-KIND-idle.jpg` and use one of these. The body must not move;
the game animates jumping and swaying itself.
```
Edit only the face of the attached character: change the eyes to happy closed upward curves and the mouth to a big open smile. Everything else must stay exactly the same: pose, arms, legs, ears, colors, position, size and the flat background.
```
```
Edit only the face of the attached character: the eyes look up and to the side as if thinking kindly, the mouth is a small curious "o". Everything else must stay exactly the same: pose, arms, legs, ears, colors, position, size and the flat background.
```

## 2. Accessories (outfit sets)

Each outfit set dresses the template in several items that do **not overlap** each other
(one item per body area: top of head, eyes, neck, body, hand, back, feet). Two steps per
set, in the same chat:

1. Attach `base-template.jpg` and use the dress prompt with the set's ITEMS.
   Save the result as `outfit-X-dressed.jpg` (it is only for checking).
2. Use the remove prompt on that result. Save it as `outfit-X.jpg`. The game splits it into
   single items by their position.

### Dress prompt (replace ITEMS)
```
Dress the attached character template in these items, and nothing else: ITEMS. Keep exactly the same front view, symmetry, pose, size, position, colors and outline of the character. The items must fit the figure closely, be symmetrical where possible, must not overlap each other and must not hide the eyes (glasses are transparent in the middle). Same style: cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, soft dark-brown outlines. No text. Background: one perfectly flat solid pure magenta color (#FF00FF), no shadow. Same square size.
```

### Remove prompt
```
Remove the character completely and keep only the clothes and accessories, each one exactly where it was, same size, same shape and colors. Where the character's body was hidden behind an item, the item stays as it is; where the character was visible, now there is only the flat background. Background: one perfectly flat solid pure green color (#00FF00) everywhere, no shadow, no outline of the character. Same square size.
```

| Set | ITEMS |
|---|---|
| `outfit-a` | a red baseball cap with a white star on the top of the head; round orange glasses; a blue and white striped knitted scarf around the neck; red sneakers on the feet |
| `outfit-b` | a small golden crown with blue gems on the top of the head; yellow star-shaped glasses; a red bow tie at the neck; light blue and yellow butterfly wings on the back, visible on both sides of the body |
| `outfit-c` | a purple wizard hat with yellow stars on the top of the head; a dark blue cape with stars hanging from the shoulders behind the body, visible on both sides; a small magic wand with a star in the right hand; brown boots on the feet |
| `outfit-d` | a flower wreath of yellow, white and blue flowers on the top of the head; a cozy green knitted vest on the body; yellow rain boots on the feet; a small orange backpack on the back, its straps visible over the shoulders |
| `outfit-e` | a soft blue beanie with a white pompom on the top of the head; a yellow neckerchief with white dots tied at the neck; small soft orange baby-dragon wings on the back, visible on both sides; a red balloon on a string held in the left hand |
| `outfit-f` | a big pink polka-dot hair bow on the top of the head; heart-shaped red glasses; a light purple t-shirt with a white star on the body; white sneakers with pink laces on the feet |
| `outfit-g` | a green explorer hat on the top of the head; a light brown explorer vest with pockets on the body; a small lantern in the right hand; green boots on the feet |

### Needs new art: single items

In an outfit set, items that touch cut each other: the glasses lose their top edge
under the cap, a balloon string or wand crosses a wing, backpack straps stay on the
vest. These items need a picture of their own. A file `acc-<id>.jpg` replaces the
item cut from its outfit (same id, same slot); the outfit's other items stay.

Two steps per item, in the same chat, as for the sets:
1. Attach `base-template.jpg` and use the dress prompt below with ITEM.
2. Use the remove prompt from the sets above on that result. Save it as `acc-<id>.jpg`.
Then run `npm run assets`.

```
Dress the attached character template in this one item, and nothing else: ITEM. Keep exactly the same front view, symmetry, pose, size, position, colors and outline of the character. Both arms stay exactly as in the template, hanging down with the paws at hip height: never raise, bend or move an arm or paw; a held item is placed into the paw where it is. The item must fit the figure closely, be symmetrical where possible, be complete (no part cut off) and must not hide the eyes. Same style: cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, soft dark-brown outlines. No text. Background: one perfectly flat solid pure magenta color (#FF00FF), no shadow. Same square size.
```

Glasses need their own two prompts: the eyes behind the lenses must go, and nothing
white may stay inside a lens (the script cannot tell an eye's white from a glass
highlight). The highlight is painted pale green; the script turns key-tinted light
pixels inside a lens into a soft white glass shine.

Glasses dress prompt (replace FRAME, for example "yellow star-shaped glasses with a soft
dark-brown outline, a thin bridge between the two stars, and two short temple arms
reaching toward the sides of the head"):
```
Dress the attached character template in exactly one item and nothing else: FRAME. The glasses sit over the eyes, centered and perfectly symmetrical, and are complete: nothing is cut off or hidden. The lenses are clear and empty: no tint, no color, no pattern inside them; each lens has only one small solid white highlight stroke in its upper left part. Keep exactly the same front view, symmetry, pose, size, position, colors and outline of the character. Same style: cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, soft dark-brown outlines. No text. Background: one perfectly flat solid pure magenta color (#FF00FF), no shadow. Same square size.
```

Glasses remove prompt (tested with `star-glasses`):
```
Keep only the glasses frames, exactly where they are, with the same size, shape, colors and outline. Remove everything else completely: the whole character with its head, fur, skin, ears, eyelashes, eyebrows, the pink blush on the cheeks, nose, mouth and body, and both eyes entirely, including the white of the eyes, the pupils and every white shine dot or white circle in them. Fill all removed areas, including the whole inside of both lenses, with one perfectly flat solid pure green color (#00FF00). Inside each lens draw only one small soft oval highlight in its upper left part, painted in a pale light green (a lighter shade of the background green), not white. There must be no white pixels anywhere inside the lenses. Do not redraw or add any part of the character, no shading, no shadow, no outline where the character was, no gradient. The rest of the image is the same flat green (#00FF00). Same square size.
```
If a piece of an eye stays, add in the same chat: "Inside both lenses there must be only
flat green (#00FF00) and the one pale green highlight; remove every remaining part of the eyes."

Body clothing (raincoat, vest) remove prompt (replace ITEM). Unlike the back items, nothing
hidden is completed: the game draws the body under the item, so only what is visible stays:
```
Make a cut-out of the ITEM: keep only the pixels of the ITEM that are visible in the attached image, exactly where they are, with the same size, shape, colors and outline. Do not draw or complete anything that was hidden behind the character: no inner back of the collar, no inside of the sleeves, no curved lines behind the neck opening or behind the sleeve openings. The neck opening and both sleeve openings are filled with the flat green background, together with the rest of the removed character (head, ears, face, body, arms, paws, legs, feet) and every outline line of the character. Nothing but the ITEM may remain: no stray arcs, lines, dots or shadows. Everything that is not the ITEM is one perfectly flat solid pure green color (#00FF00). No shading, no gradient. Same square size.
```
If a stray arc remains, add in the same chat: "Remove the arc behind the collar and the arcs behind the sleeves; there must be only flat green there."

Back items (wings, cape, backpack) remove prompt (replace ITEM; the parts hidden behind
the body are completed, the game draws the body over them anyway):
```
Keep only the ITEM, exactly where it is, with the same size, shape, colors and outline. Remove the whole character completely: head, fur, skin, ears, eyes, cheeks, arms, legs and body. Where the body covered the middle of the ITEM, complete the hidden part of the ITEM naturally so it is one whole, unbroken piece, in the same style and colors. Nothing else may cross or cut the ITEM: no lines, no strings, no other objects. Fill everything that is not the ITEM with one perfectly flat solid pure green color (#00FF00). No shading, no shadow, no outline where the character was, no gradient. Same square size.
```

A worn item cut for the paw (a stick the paw closes over) shows badly alone in the
wardrobe: save the whole item as `acc-<id>-full.jpg` and the wardrobe card uses it.

A back item may have a front part (a cape's clasp, a backpack's straps): save it as
`acc-<id>-front.jpg` at the same position. The game draws the item behind the body and
its front part over the body. To split one generated picture, attach it in a new chat
for each part, so both keep the same position:

Back part (replace ITEM and FRONT):
```
In the attached image keep only the ITEM itself and remove FRONT. Where FRONT was, continue the ITEM naturally in the same style, colors and pattern, so it is one whole piece. Keep everything exactly where it is, with the same size, shape, colors and outline. Everything else is one perfectly flat solid pure green color (#00FF00). No shadow, no gradient. Same square size.
```

Front part (replace FRONT):
```
In the attached image keep only FRONT, exactly where it is, with the same size, shape, colors and outline. Remove everything else and fill it with one perfectly flat solid pure green color (#00FF00). Do not redraw or add anything. No shadow, no gradient. Same square size.
```

| File | ITEM | What is wrong now |
|---|---|---|
| `acc-round-glasses.jpg` | glasses: FRAME = round orange glasses with a soft dark-brown outline, a short curved bridge, and two short temple arms reaching toward the sides of the head | done 2026-10-21 |
| `acc-star-glasses.jpg` | glasses: FRAME = yellow star-shaped glasses with a soft dark-brown outline, a thin bridge between the two stars, and two short temple arms reaching toward the sides of the head | done 2026-10-21 |
| `acc-sunglasses.jpg` | glasses: FRAME = cool black wayfarer sunglasses: a thick glossy black frame with a slightly wider, raised top edge and lenses that are a bit narrower at the bottom, a straight bridge, and two short temple arms reaching toward the sides of the head | done 2026-10-21 (the script makes the lenses a soft see-through dark tint) |
| `acc-dragon-wings.jpg` | back: ITEM = small soft orange baby-dragon wings on the back, visible on both sides | done 2026-10-21 (longer than before; drawn behind the body) |
| `acc-star-cape.jpg` | a dark blue cape with stars hanging from the shoulders behind the body, visible on both sides | done 2026-10-21 (with `acc-star-cape-front.jpg`: clasp and collar over the body) |
| `acc-knit-vest.jpg` | a cozy green knitted vest on the body | done 2026-10-21 |
| `acc-backpack.jpg` | back: a small orange school backpack worn on the back; its rounded sides with small side pockets stick out a little on both sides of the body at chest height, a small carry loop shows above the shoulders behind the head, two orange shoulder straps with small buckles run over both shoulders | done 2026-10-23 (the old one looked like a gravestone in the wardrobe; with `acc-backpack-front.jpg`: straps over the body) |
| `acc-butterfly-wings.jpg` | back: light blue (#8FC5EF) and yellow (#F5D76E) butterfly wings, on each side a big rounded upper wing and a smaller lower wing with a short rounded tail, yellow spots and dark-brown veins, not fairy wings | done 2026-10-23 (the wings cut from `outfit-b` showed the body's cut-out in the wardrobe) |
| `acc-lantern.jpg` | a small lantern in the right hand | done 2026-10-21 (the wire handle has a small gap at the top) |
| `acc-wand.jpg` | hand: ITEM = a small magic wand with a golden star on top, held in the right hand | done 2026-10-21 (fixed by hand in GIMP: the generator kept moving the paw) |
| `acc-balloon.jpg` | hand: ITEM = a red balloon on a thin string, the string held in the left hand | done 2026-10-21 (fixed by hand in GIMP) |
| `acc-boots.jpg` | feet: ITEM = brown boots on the feet | done 2026-10-21 |

Wardrobe additions (all `SINGLES`; capes and other back items use the back remove prompt,
necklaces and gloves the body clothing remove prompt, masks the glasses remove prompt without
the lens highlight: the eye holes are only flat green):

| File | ITEM / FRAME | Status |
|---|---|---|
| `acc-hero-cape.jpg` | back: a bright red hero cape with a golden-yellow inner lining, hanging from the shoulders behind the body down to the knees, visible on both sides with a soft wave at its lower edge, fastened at the neck by a small round golden clasp with a short red collar | done 2026-10-23, finished by the owner (with `acc-hero-cape-front.jpg`: clasp and collar) |
| `acc-chain.jpg` | neck: a thin golden chain necklace with small round links, in a soft U shape on the upper chest, no pendant | done 2026-10-23 |
| `acc-medallion.jpg` | neck: a thin dark-brown leather cord in a soft V shape with a round bronze medallion (#C98A3A, a small engraved leaf) in the middle of the chest | done 2026-10-23 |
| `acc-hair-clip.jpg` | head: two small hair clips side by side, turquoise (#2BB5B0) and yellow (#F5C542), short flat bars with rounded ends, on the top right side of the head | done 2026-10-23 |
| `acc-walking-stick.jpg` | hand: a simple straight wooden walking stick (#9A6A3C) with a small round knob on top, no hook (a crook looked like a crutch), in the right paw (viewer's left), standing straight down beside the leg, its tip on the ground | done 2026-10-23, fitted to the paw by the owner (the paw is cut out of it; `acc-walking-stick-full.jpg` is the whole stick for the wardrobe) |
| `acc-white-gloves.jpg` | hand: soft white gloves (#F7F7F2, light grey shading) on both paws, a small cuff at each wrist | done 2026-10-23 |
| `acc-black-gloves.jpg` | hand: `acc-white-gloves.jpg` attached and recolored black (#2A2A2E) with dark grey highlights | done 2026-10-23 |
| `acc-eye-mask.jpg` | eyes: a simple black eye mask like a masked hero wears, a smooth band with two almond-shaped eye holes and slightly pointed outer ends | done 2026-10-23 |
| `acc-carnival-mask.jpg` | eyes: a festive carnival masquerade mask, deep purple (#5B2A86) with golden swirls along the edges, small gems at the outer corners and three short gold and teal feathers from its upper left corner | done 2026-10-23 |

Fixed in code, no new picture needed: green spots in `heart-glasses` lenses (done 2026-10-21). Pink sneakers: their back side showed; fixed by hand in GIMP in `outfit-f.jpg` (done 2026-10-21).

## 3. World backgrounds

Each world has 3 parallax layers, all 1376 x 768 (16:9) and laid over each other pixel for
pixel: `far` (the whole scene with a small sky), `mid` (a band of middle distance, about the
lower 45 %) and `near` (the closest band, about the lower 20 to 25 %), the two bands on flat
magenta. Every layer repeats horizontally with its left and right edges joining exactly, so
the game draws the copies side by side with no blending. Style: hand-drawn Japanese anime
background art, detailed like `temp/background-redesign/style-sample-*.jpg` (local only),
described in words: attaching the samples costs the daily limit and makes Gemini copy their
composition.

Work files live in `assets-src/bg-work/<world>/` (not committed); the finished layers are
saved as `assets-src/bg-<world>-<layer>.png` and processed by `npm run assets`.

### Procedure per world (`scripts/bg-seam.mjs`)
1. **far**: generate with the far prompt; `check <img>` wants 1376 x 768 and a sky of at most
   30 % (judge sunset or night skies by eye). Then `prep <img> <dir>`: the picture is rolled
   by half its width (the old middle becomes the edges, which therefore join) and the middle
   30 % is painted white like empty paper. Send `<dir>/seam-in.png` with the seam prompt and
   `merge <dir> <gemini> <out>`: the sides come back pixel for pixel, only Gemini's middle is
   kept, joined along the cheapest path. `merge` fails when Gemini redrew the sides or left
   white; look at `<out>-joins.png` for a stripe of another tone (the sky).
2. **mid and near**: Gemini draws a single strip as tall as half its picture whatever the
   prompt or an attached layout says. Ask for a **sheet of strips stacked above each other**
   (near: three of about 190 px, mid: two of about 330 px); they come at the right scale.
   `strips <img> <dir>` cuts them apart and puts each at the bottom of a magenta frame.
   Pick the best, `prep` it, then join the middle without Gemini: `quilt <dir> <donor> <out>`
   fills the gap with the best fitting piece of a strip: take the same strip as the donor first,
   its lines run at the same heights (a sibling strip left visible steps in a calm band, which
   looked like overlapping copies), another strip of the sheet when the piece repeats. Gemini's
   seam repaint (as for far) is the fallback; on strips it often redrew the whole picture.
   Stars and other small scattered things come out in neat groups on magenta (a sticker
   sheet). Ask for them on black ("a natural star field like a real photograph"); `black <img>
   <out> [floor]` turns brightness into coverage on magenta and takes out stars at the side
   edges, so the layer repeats as it is (space mid: floor 120 keeps the brighter stars).
3. `lift <img> <near> <out>` moves the mid strip up as high as its bottom still stays 12 px
   behind the near layer's solid band (meadow 140 px, planet 44 px); a number lifts by that.
4. Copy the three layers to `assets-src/bg-<world>-{far,mid,near}.png`, run
   `npm run assets bg-<world>`, then `preview <world> <out>` (the layers repeated 2.5 times,
   a red tick above each seam) and look at the world in the game.

### Prompt for `far` (replace SCENE)
```
Generate an image: <title>

Hand-drawn Japanese anime background art with clean thin dark ink line art, fresh saturated natural colors, light watercolor shading and a lot of fine detail (single trees with drawn leaves, grass strokes, small flowers, stones, paths); not blurry, not pale, not washed out.

Landscape image, 1376 x 768 pixels (16:9), background for a 2D side-scrolling platformer game for children and young teens aged 12 to 15: SCENE. One single continuous scene filling the whole image, not split into rows or panels, every part of it different. The horizon is high: only a little sky with a few small clouds shows above the scenery, about 15 % of the image height, flowing straight into it with no line, frame or border; the sky has the same brightness across the whole width, no bright spot, no sun, no sun glow, no moon. The lower half is middle distance full of detail but with NO large objects close to the viewer (no big flowers, tall grass, rocks, fences, steps or bridges in front), because closer layers are drawn over it. Balanced composition across the whole width, no single dominant object. No text, no letters, no watermark, no characters, no people, no animals.
```

### Prompt for the seam (attach `seam-in.png`)
```
Inpainting task on the attached image (1376 x 768 pixels), do not create a new picture. The attached drawing is unfinished: the white area in the middle is empty paper. Draw only into that white area. Everything outside it must stay pixel for pixel identical, with exactly the same colors: do not move, redraw, recolor or recompose anything. Inside the white area, draw the missing part of the same landscape so that everything from the left side continues smoothly into the right side, in exactly the same drawing style and colors: the sky in the middle has exactly the same color as on both sides, no lighter or darker stripe, no visible border. No white left anywhere. Output the whole image at exactly 1376 x 768 pixels.
```
Do not start it with "Generate an image": Gemini then draws a new picture.

### Prompt for `near` (a sheet of three strips; replace PLANTS)
```
Generate an image: Three <world> strips

Image 1376 x 768 pixels (16:9) on a flat solid pure magenta (#FF00FF) background. The image is a sheet with THREE separate long, low horizontal strips stacked above each other, with a clear band of flat magenta between the strips and above the top strip. Each strip runs all the way from the left edge to the right edge of the image, cut by both edges, no margin at the sides; the bottom strip continues down to the bottom edge. Each strip is about 190 pixels tall: a side view of the closest foreground of the world for a 2D side-scrolling platformer game, seen from a few metres away: PLANTS. The bottom of each strip is cut straight, with no line, no outline and no ground drawn under it. The top of each strip is uneven. The three strips are different from each other. The magenta touches the drawing directly, no halo, no glow, no white rim.

Hand-drawn Japanese anime background art, clearly a drawing and not a photo: thin soft dark green outlines (not black), simple color areas with light watercolor shading, fresh natural colors, moderate detail. No pink, purple or violet. No text, no characters, no animals. Flat side view, no vanishing point.
```

### Prompt for `mid` (a sheet of two strips; replace BAND)
Like the near prompt, with TWO strips of about 330 pixels, "a side view of a band of the world
seen from some distance: BAND", "rich small details" and "clean thin dark ink outlines".

The tables below (here and in the later sections) say what each world shows; all 16 worlds were
redrawn on 2026-10-25 with the prompts above, so the Height and Status columns are from the earlier
flat storybook style and no longer apply.

| File | SCENE / LAYER | Height | Status |
|---|---|---|---|
| `bg-meadow-far.jpg` | a training meadow in soft daylight with soft blue sky, a few fluffy clouds, gentle green hills far away and a small wooden fence | full | redone 2026-10-25 (anime style, far prompt above) |
| `bg-meadow-mid.jpg` | a round grassy hill with a small tree, a bush with yellow flowers, an apple tree, a short wooden fence piece, a haystack, a tall birch, a bush with pink flowers and a beehive on a stand | 45 % | redone 2026-10-25 (sheet of two strips, quilted, lifted 130 px) |
| `bg-meadow-near.jpg` | tall grass blades, clover with a pink flower, daisies, a dandelion seed ball, a smooth stone, a tall buttercup, a small wooden stake and a curled leaf | 25 % | redone 2026-10-25 (sheet of three strips, seam by Gemini) |
| `bg-space-far.jpg` | deep friendly space in dark blue and violet with soft glowing stars, a pastel nebula and the curve of a blue-green Earth at the bottom left | full | |
| `bg-space-mid.jpg` | **use the far prompt instead**, SCENE: "only scattered soft glowing stars and tiny distant pastel planets on a flat pure magenta (#FF00FF) background" | full | not a strip |
| `bg-space-near.jpg` | **use the far prompt instead**, SCENE: "only a few small soft star sparkles and tiny space dust on a flat pure magenta (#FF00FF) background" | full | not a strip |
| `bg-planet-far.jpg` | (redone 2026-10-28) the dragons' planet, almost like the Earth in natural greens, blues and earthy browns (not mint, purple or turquoise): rolling green hills, a blue river, a small waterfall, dark green forests, a few giant mushroom trees with red-brown, ochre or cream caps, groups of big pale crystals (amber, rose quartz, aquamarine) in the hillsides, a light blue sky with a few small jagged sawtooth clouds tinted soft orange | full | done 2026-10-28 (seam by Gemini) |
| `bg-planet-swamp-mid.jpg` | (the owner's picture, 2026-10-28) calm blue-green swamp water with low mossy islands, a willow, a few small trees, crystals and a mushroom | 66 % | done 2026-10-28 (seam by Gemini, tint cleaned to magenta, moved down 150 px) |
| `bg-planet-swamp-near.jpg` | (the owner's picture, 2026-10-28) calm blue-green water in front, a low mossy shore with reeds, a few mushrooms, a glowing mushroom and a crystal | 66 % | done 2026-10-28 (seam by Gemini, tint cleaned, moved down 236 px so the water starts at 70 %) |
| `bg-planet-swamp-shore.jpg` | (the owner's picture, 2026-10-30, on a cyan key, 1376 x 330) a grassy meadow bank with a steep earthen cliff on its left, a few flowers and pebbles, the grass reaching the right edge. A strip drawn at the swamp band's scale on its bottom, lowered with the band, in front of it where the swamp ends; the band goes on behind it | 34 % | done 2026-10-30 |
| `bg-planet-mid.jpg` | (the owner's picture, 2026-10-28) soft yellow-green hills with small mushrooms and flower bushes, then a wide calm grass field | full | done 2026-10-28 (seam by Gemini, tint cleaned, moved down 200 px) |
| `bg-planet-near.jpg` | (the owner's picture, 2026-10-28) a sandy path with pebbles, small crystals and mushrooms along its upper edge, calm grass below | full | done 2026-10-28 (seam by Gemini, tint cleaned, moved down 240 px: the path's middle at 89 % of the stage, where Tapko walks) |
| `bg-dragons-far.jpg` | a peaceful dragon valley at sunset, warm orange and pink colours in the sky, the sun hidden behind the mountains, soft rounded mountains and a waterfall | full | done 2026-10-23 |
| `bg-dragons-mid.jpg` | (the owner's picture on a cyan key, 2026-10-29) wooded hills, a big fly agaric, a mossy cave with a glowing crystal, a tree with red and yellow blossoms, then a wide calm meadow | full | done 2026-10-29 (seam by Gemini, moved down 8 px: its skyline at 62 % from the bottom) |
| `bg-dragons-near.jpg` | (the owner's picture on a cyan key, 2026-10-29) a low grassy edge with a red crystal, a stump, fly agarics, pebbles, blue flowers, then wide calm grass | full | done 2026-10-29 (seam by Gemini, moved down 284 px: its skyline at 22 % from the bottom) |
| `bg-egg-far.jpg` | (the owner's picture, 2026-10-31) rocky grey-brown and ochre peaks with big groups of pale crystals (amber, rose quartz, aquamarine), moss patches and one fly agaric, a light blue sky with small jagged orange-tinted clouds | full | done 2026-10-31 (seam by Gemini with a narrow 14 % gap and "one big peak, no pass": a 30 % gap got a pass down to the horizon) |
| `bg-egg-mid.jpg` | (the owner's picture, 2026-10-31) a wide field of rounded mossy boulders and ochre slabs with fly agarics and small crystals, to the bottom edge | full | done 2026-10-31 (seam by Gemini, moved down 100 px: its skyline at about 40 % of the stage) |
| `bg-egg-near.jpg` | (the owner's picture, 2026-10-31, 1376 x 300) a pale stone path with low rocks, crystals, fly agarics and one bush along its upper edge, a cracked rock wall below | full | done 2026-10-31 (put at the bottom of a magenta frame, seam by Gemini on the 3rd try, moved down 84 px: the path's middle at 89 % of the stage) |

## 4. Game objects (sprites)

### Common prompt (replace OBJECT and BG)
```
Cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, rounded friendly shapes, soft dark-brown outlines (not black), warm pastel palette, light soft shading. Friendly faces with big eyes and small smiles where the object has a face. Calm, never scary, suitable for children and young teens aged 10 to 15. No text, no letters, no watermark.

A single game object, shown alone: OBJECT. Side view facing right unless said otherwise, centered, full object visible, wide empty margin. Background: one perfectly flat solid pure BG, no gradient, no shadow, no floor, no other objects. Square image.
```
BG is `magenta color (#FF00FF)` unless the table says `green`, then use `green color (#00FF00)`.

| File | OBJECT | BG |
|---|---|---|
| **Meadow** | | |
| `obj-bee.jpg` | a chubby friendly bumblebee flying, smiling | magenta |
| `obj-butterfly.jpg` | a friendly butterfly with blue and yellow wings, flying | magenta |
| `obj-butterfly-2.jpg` | (start page, 2026-10-24) a friendly butterfly flying, seen from the side and slightly from the front, facing right: two big rounded upper wings and two smaller lower wings with soft scalloped tails, the far wings peeking out behind the near ones. Richly detailed wings: dark-brown veins divide each wing into many rounded cells; the cells are coral pink #F4A6A0 near the body, warm apricot #F8C79A in the middle and cream #FFF1D6 at the tips, each cell with a lighter soft highlight; a darker coral border along the wing edge with a row of small round cream dots; a small round eye-spot on each lower wing. A plump soft peach body with gentle stripes, a round head with big shiny friendly eyes, a small smile and rosy cheeks, two long curly antennae with round tips | green |
| `obj-butterfly-3.jpg` | (start page, 2026-10-24) a cheerful, colorful peacock butterfly flying, seen from the side and slightly from the front, facing right: two big rounded upper wings and two rounded lower wings, the far wings peeking out behind the near ones. Bright, rich wings in warm red-orange #E8643C with a soft darker rim, and on every wing one big round eye-spot like a peacock feather: a deep blue #3F6FD1 ring around a sky-blue #9FD3F5 center with a yellow #F6D55C crescent and a small white highlight, outlined by a thin cream ring; small cream dots along the upper wing edge; a few dark-brown veins. A plump soft brown body with gentle stripes, a round head with big shiny friendly eyes, a small smile and rosy cheeks, two long curly antennae with round tips | green |
| `obj-ladybug.jpg` | a round friendly ladybug with a happy face, flying with small wings | green |
| `obj-fly.jpg` | a funny little housefly with big eyes and a smile, flying | magenta |
| `obj-mouse.jpg` | a small grey mouse with big ears, running happily | magenta |
| `obj-spider.jpg` | a tiny cute round spider with big friendly eyes, eight short soft legs, waving, not scary at all | magenta |
| `obj-leaf-birch.jpg` | a single small birch leaf, oval with a pointed tip and finely toothed edge, golden yellow autumn color, short stem, lying flat seen from above, no face | magenta |
| `obj-leaf-ginkgo.jpg` | a single small ginkgo leaf, fan shaped with a small notch in the middle, warm golden yellow, short stem, lying flat seen from above, no face | magenta |
| `obj-leaf-oak.jpg` | a single oak leaf with soft rounded lobes, orange-brown autumn color, short stem, lying flat seen from above, no face | green |
| `obj-leaf-maple.jpg` | a single big maple leaf with five pointed lobes, bright red-orange autumn color, stem, lying flat seen from above, no face | green |
| `obj-leaf-chestnut.jpg` | a single big horse chestnut leaf made of five long fingers spreading from the stem, green turning yellow-brown at the edges, lying flat seen from above, no face | magenta |
| `obj-gloves.jpg` | a pair of thick padded football goalkeeper gloves, chunky and puffy like a toy, with thick padded fingers and a wide wrist strap. Both gloves show their palms to the viewer: cream white padding (#FFF4DC) with an orange rim (#F59A3C), mirror images of each other, thumbs touching in the middle. Empty gloves: no hands, no arms, no body, no face, no eyes | magenta |
| `obj-hedgehog.jpg` | a chubby friendly hedgehog standing on the ground, soft brown rounded spikes with a few colorful autumn leaves stuck on its back, big eyes, happy smile, small pink nose | magenta |
| **Space** | | |
| `obj-rocket.jpg` | a round cute red and white children's rocket with a round window and small fins, flying to the right, small soft flame | green |
| `obj-rocket-pilot.jpg` | **not the common prompt:** attach `obj-rocket.jpg` and `tapko-astronaut.jpg`: "Edit the first attached picture (the red rocket): replace the little figure in its round window with the astronaut from the second attached picture. In the window we see the astronaut from the chest up, sitting inside behind the glass and looking forward to the right: the same white round helmet with the same opaque glossy deep blue visor (#2B3F7A) and white highlight, the same white suit with the light-grey collar ring. The astronaut fits inside the round window, a bit smaller than the glass, not cut by the frame except at the bottom of the chest. The glass stays light and clear around the helmet. Keep everything else in the first picture exactly the same: the rocket's shape, size, position, colors, stripes, fins, flame, the little stars and the flat green background. Same style: ... No text. Same square size, 1024 x 1024 pixels." | green |
| `obj-rocket-empty.jpg` | **not the common prompt:** attach `obj-rocket-pilot.jpg`: "Generate an image: edit the attached picture (a red rocket with an astronaut in its round window). Remove the astronaut completely from the round window: no helmet, no suit, no figure, nobody inside. The window shows only empty clear glass: light blue-turquoise glass (#BFE6EE in the middle, a bit darker #86CBD8 at the rim) with one soft white highlight in the upper left, nothing seen through it. Keep everything else exactly the same, to the pixel: the rocket's shape, size, position, colors, stripes, window frame, fins, flame, the little stars and the flat green background. Same style. No text. Same square size, 1024 x 1024 pixels." | green |
| `obj-console.jpg` | (2026-10-27, tall portrait 2 : 3) a small chunky toy-like onboard computer of a spaceship, used to type in flight codes. Strictly front view, not tilted, symmetrical. A rounded rectangular box, taller than wide, in light grey-white #E8EEF5 with a dark navy rim #24345F; at the top a small square screen glowing soft cyan #7FD1FF with two thin empty lines on it (no letters); below it a grid of 3 by 3 round chunky buttons in soft yellow #FFD36B, coral #FF9F7A and mint #8FE3C0; one small round green light and one small round red light on top of the box; a short antenna with a round tip on the top left corner. No face, no eyes, no arms, no legs, no numbers | green |
| `obj-asteroid-small.jpg` | a small round grey-brown space rock with soft craters, sleepy face | magenta |
| `obj-asteroid-big.jpg` | a big round space rock with visible soft crack lines, calm face | magenta |
| `obj-planet-1.jpg` | a small round pastel orange planet with a ring, front view | green |
| `obj-planet-2.jpg` | a small round pastel blue planet with soft stripes, front view | magenta |
| `obj-planet-3.jpg` | a small round pastel purple planet with spots, front view | green |
| **New planet** | | |
| `obj-swamp-stone-1.jpg`, `-2`, `-3` | (the owner's pictures, 2026-10-30) a round mossy stepping stone without a face in three looks (a red crystal, blue flowers, thick moss), each stone in the swamp picks one at random; all three keep one outline, so `obj-swamp-stone-broken` fits each | magenta |
| `obj-swamp-log.jpg` | (the owner's picture, 2026-10-30) a short mossy log lying slanted, with a white flower and a small red mushroom on its moss, the cut end on the right; it floats in the great swamp | magenta |
| `obj-swamp-stone-broken.jpg` | **attach `obj-swamp-stone.jpg`**: "... the stone is half crumbled: its top and one side have broken off into four or five chunks falling apart, the rest still holds together; no face any more; no water, no ground, no shadow" | magenta |
| `obj-crystal-amber.jpg` | (2026-10-28, tall portrait) one big six-sided crystal standing upright with two smaller points low at its sides, translucent amber (#F2B65A, facets #FFD98A, edges #C98A2E), one soft white highlight; the base cut straight, no rock or ground; no face, no glow (the game draws its glow) | magenta |
| `obj-crystal-rose.jpg` | (2026-10-28, tall portrait) two tall six-sided points of different height from one base, leaning slightly apart, rose quartz (#F3B3BE, facets #FCD9DE, edges #D07A8C); as amber otherwise | green |
| `obj-crystal-aqua.jpg` | (2026-10-28) three short thick points fanning out from one base, the middle one tallest, light aquamarine (#9ED8E2, facets #D2F1F5, edges #5FA9B8); as amber otherwise | magenta |
| `obj-crystal-*-cracked.jpg` | **attach the crystal**: "redraw the attached ... crystal in exactly the same style, size, position and shape ... Only change: several clear dark-brown zigzag crack lines across its points, one small chip broken off a tip, the color a bit duller (amber #D9A85E, rose #DDA9B2, aqua #A9C9CE), no white highlight, no pieces lying around" | as the crystal |
| `obj-mound-1.png` to `obj-mound-3.png` | (the owner's pictures, 2026-10-28) three grey-brown heaps of crumbly earth with pebbles at their foot, moss and a few small crystals and mushrooms; no hollow, the crystal grows from behind the crown. Defringed (`scripts/defringe.mjs`); the game also mirrors them | magenta |
| `obj-signpost-1.jpg` | (2026-10-28, the crossroads' posts, no board: the game draws the word bubble on top) a short sturdy round wooden post (#A8774A) with grain and knots, a small red-brown mushroom-cap top with cream spots, a tuft of grass and a tiny crystal at its foot; about three times taller than wide | magenta |
| `obj-signpost-2.jpg` | a tall slim pole of light honey wood (#C99A62) with three carved rings, a green vine with small leaves on its lower half, a small amber crystal in a wooden cup on top; about seven times taller than wide | magenta |
| `obj-signpost-3.jpg` | a very tall thin straight pole of dark brown wood (#7A5434), a moss patch at its foot, two leafy twigs halfway up, a round bulb plant with a softly glowing yellow bud on top; about twelve times taller than wide | magenta |
| `obj-arrow-1.jpg` | (2026-10-28) a long flat wooden arrow board pointing right, about seven times wider than tall: light natural wood (#D8A86A) with a pointed tip, a straight cut tail with one nail head, the long middle smooth and plain for a word; nothing on it | magenta |
| `obj-arrow-2.jpg` | (2026-10-28) the same long arrow in warm walnut wood (#9A6A44) with a swallow-tail end, a carved groove along its border, a plain lighter middle; no paint, nothing growing on it (a sprout looked wrong when turned) | magenta |
| `obj-cradle.jpg` | (2026-10-28, the Cradle of Life, not an altar) an old round carved stone pedestal on two low round steps, warm light grey stone (#B8B0A4) with moss and a few small glowing yellow flowers at its foot, carved crystal shapes and curling leaf lines on its sides, a wide shallow empty hollow on its flat top; about as wide as tall, no face, no crystal on it; strictly front view, symmetrical | magenta |
| `obj-life-crystal-amber.jpg`, `-rose`, `-aqua` | (2026-10-28, the three crystals of life) ONE single tall six-sided crystal standing upright, about three times taller than wide, pointed tip, bottom cut flat, in amber (#F2B65A), rose quartz (#F3B3BE) or aquamarine (#9ED8E2) with facets and one highlight; ONE point only, no cluster, no rock, no glow | magenta, green for rose |
| `obj-mushroom-red.jpg` | (2026-10-28, the spell's slips, usable anywhere) ONE single fly agaric: a round half-sphere red cap (#D9543A) with five cream spots, a short thick cream stem with a small frill; NOTHING else: no grass, no leaves, no ground, no second mushroom; strictly front view | green |
| `obj-mushroom-gold.jpg` | ONE single slender parasol mushroom: a wide flat slightly pointed golden ochre cap (#E2A93B) with fine scales, a long thin cream stem with a ring halfway up; nothing else (as above) | magenta |
| `obj-mushroom-brown.jpg` | ONE single plump porcini: a round glossy chestnut-brown cap (#8B5A2B) like a bun, a thick bulbous light beige stem with a fine net; nothing else (as above) | magenta |
| **Dragons** | | |
| `obj-dragon-baby-1.jpg` | a chubby baby dragon, mint green, tiny wings, sitting, big eyes, happy | magenta |
| `obj-dragon-baby-2.jpg` | a chubby baby dragon, sky blue, tiny wings, sitting, big eyes, happy | magenta |
| `obj-dragon-baby-3.jpg` | a chubby baby dragon, sunny yellow, tiny wings, sitting, big eyes, happy | magenta |
| `obj-dragon-baby-4.jpg` | (plan 83, done 2026-10-30; the owner wants it from Gemini, never drawn in code) **attach `obj-dragon-baby-1.jpg`**: "redraw the attached baby dragon in exactly the same drawing style, outline, shading, size, position and the same sitting pose, only change its colour: the body is a warm soft cherry red (#E0565B, darker shade #B83E45), never orange, never pink or magenta; the belly lighter warm cream-rose (#F7C9B8); the tiny wings a slightly darker red. Same big eyes and happy face" | magenta |
| `obj-rock-falling.jpg` | a small round space rock falling with a soft light trail behind it, sleepy face, front view | magenta |
| `obj-flame-1.jpg` to `obj-flame-4.jpg` | (the owner's pictures, 2026-10-29, the valley) four flames of one look from the smallest to the biggest: a golden drop (1), then flames with more and more tips, orange at the biggest (4); each with a cream core and a brown outline. The flying flames take them by word length; in the burning pit they stand from the smallest in front to the biggest at the back | muted magenta |
| `obj-flame-out.jpg` | (the owner's picture, 2026-10-29) a gone-out flame: a thin grey curl of smoke in a flame's shape with a small glowing ember at its foot | magenta |
| `obj-torch.jpg` | (the owner's picture, 2026-10-29) a wooden torch held upright, honey wood with carved rings, the top wrapped in cloth bound with a cord, no flame (the game lights it with the first caught flame) | green |
| `obj-firepit.jpg` | (the owner's picture, 2026-10-29) a round fire pit a little from above: smooth grey stones round burnt logs and ash with a few dull embers; no flame, no face. The burning pit is this picture with the four flames flickering in front of it (in code), so there are no burning pictures | magenta |
| `obj-bush-1.jpg` | (the valley's overgrown path, done 2026-10-29) a low, wide, round, thick bush of small dark-green leaves (#4F8A4A, lighter #6FA85F highlights) with a few tangled brown twigs (#7A5434) sticking out of it, about one and a half times wider than tall, its bottom edge cut straight as if it stands on a path; NO face, no eyes, no flowers, no berries, no ground, no grass, no stones | magenta |
| `obj-bush-3.jpg` | (done 2026-10-29) **attach `obj-bush-1.jpg`**: "Draw a new bush in exactly the same drawing style, outline, shading and leaf pattern as the attached bush ..., but a different bush: a bit smaller and narrower, slightly taller than wide, an upright oval shape, the greens a little lighter and more yellow-green (#6B9A4A with #8DB860 highlights)"; NO face, no flowers, no ground | magenta |
| `obj-bush-2.jpg` | (done 2026-10-29; the branch tangle that was bush 2 is dropped) **attach `obj-bush-1.jpg`**: as bush 3, "smaller and thinner than the attached one, a little taller than wide, slightly bluish green leaves (#4F8A5E with #74AE7E highlights), and ONE single small pale pink flower with five round petals sitting near its top" | magenta |
| **World 5, the mountain** | | |
| `obj-mud-1.jpg`, `-2` | (2026-10-31) a flat glossy sticky dark brown mud puddle (#5A3A24, highlights #7A5236) on a path, a little from above, with a few bubbles, very wide and flat (four times wider than tall); two outlines (a blob, two lobes joined by a neck); NO face, nothing else | magenta |
| `obj-mud-drip.jpg` | (2026-10-31, stuck behind the lower right corner of the word the crawling puddle is under) **attach `obj-mud-1.jpg`**, "exactly the same drawing style and colors": a blob of sticky dark brown mud seen strictly from the front, a rounded lumpy blob at the top as if stuck to the corner of a sign, three thick drips of different lengths running down, each ending in a round drop, one small bubble; about as tall as wide; NO face, nothing else | magenta |
| `obj-boulder-1.jpg` to `-3` | (2026-10-31) a big round rolling boulder, roughly a ball so it can spin: grey-brown stone with cracks (1), warm grey with moss patches (2), ochre-brown with one pale aquamarine crystal speck (3); NO face, no ground | magenta |
| `obj-signpost-stone-1.jpg` to `-3` | (2026-10-31, mountain crossroads, no board: the game draws the arrow boards) a weathered wooden pole set in a small cairn of mossy stones, no fire, no lantern; about three, seven and twelve times taller than wide (tall narrow portrait for 2 and 3) | magenta |
| `obj-hearth.jpg` | (2026-10-31, the dragons' hearth on the summit; attach `obj-firepit.jpg`) a big ring of old carved stones seen a little from above, runes carved softly in them (not an altar), the inside empty bare ash-grey ground: the game draws flames and an egg into it; about 1.5 times wider than tall | magenta |
| **Egg journey** | | |
| `obj-egg.jpg` | a big oval dragon egg, cream with turquoise spots, front view | magenta |
| `obj-egg-cracking.jpg` | (redone 2026-10-31: the old one had eyes) **attach `obj-egg-plain.jpg`**, "redraw ... in exactly the same drawing style": the egg half cracked, a big jagged zigzag crack around its middle, the upper shell slightly lifted and tilted, a thin warm golden light out of the crack, two or three small shell chips; NO face, NO eyes, nothing peeking out | magenta |
| `obj-egg-plain.jpg` | (redone 2026-11-08, so it matches the cracked and the hatched shell) **attach `obj-egg-cracking.jpg`**: "redraw the attached cracked dragon egg in exactly the same drawing style, outline, shading, colours, size, position and shape (the same cream egg with the same turquoise spots in the same places), but whole and undamaged: no crack at all, no gap, no light, no lifted shell, no shell chips on the ground; where the crack was, the cream shell with turquoise spots simply continues. NO face, NO eyes", front view | magenta |
| `obj-egg-crack.jpg` | (2026-11-08, egg 5 at half the spell; the owner's own picture in use: one clear dark zigzag crack across the middle, closed, no light) **attach `obj-egg-cracking.jpg`**: as `obj-egg-plain.jpg`, but "the egg is still whole and closed: there is only one thin fine crack, a short delicate zigzag line on the upper part of the shell, no gap, no light coming out, no lifted shell, no shell chips on the ground. NO face, NO eyes, nothing peeking out" | magenta |
| `obj-stump.jpg` | a short round tree stump with a small mushroom | magenta |
| `obj-rock-round.jpg` | a smooth round grey rock with a small tuft of grass | magenta |
| `obj-mole.jpg` | a friendly mole peeking out of a small dirt hole, waving with one paw, front view | magenta |
| `obj-dragon-hatched.jpg` | a tiny newborn baby dragon sitting in half of a cream eggshell with turquoise spots, front view, very happy | magenta |
| `obj-dragon-little.jpg` | (plan 88, the dragon story's hero's journey) **attach `obj-dragon-hatched.jpg`**: "draw the same newborn baby dragon from the attached picture in exactly the same drawing style, outline, shading and colours, but now OUT of its shell (no eggshell anywhere): it stands on its two hind legs, three-quarter view facing right, its small wings open, very happy, ready to walk and flutter. The body pose must be completely different from the attached picture" | magenta |
| `obj-rocket-standing.jpg` | (plan 88, the rocket waiting on the planet's shore) **attach `obj-rocket-empty.jpg`**: "redraw the attached red and white rocket in exactly the same drawing style, colours, stripes and round window (empty clear glass, nobody inside), but standing upright on the ground: the nose points straight up, it stands on its small fins, strictly side view, symmetrical, not tilted. NO flame, no smoke, no stars, no face. Tall portrait image" | green |

## 5. Interface

### ui-icon.jpg (the game's icon: favicon and app icons; the owner's picture 2026-10-23)
```
Cute, soft 2D children's game icon, flat vector style, rounded friendly shapes, bold dark-brown outline, warm pastel palette, bold simple shapes that stay readable when very small. A single icon: the head of a cute orange baby fox, front view, big shiny dark eyes with white highlights, cream cheeks and muzzle with pink blush, a small dark nose and a gentle smile, pointed ears with cream insides and dark tips. Centered, the whole head visible, wide empty margin. No text, no letters, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-map-*.jpg (world map islands)
Replace ISLAND with the text from the table.
```
Cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, rounded friendly shapes, soft dark-brown outlines (not black), warm pastel palette, light soft shading. Calm and friendly, suitable for children and young teens aged 10 to 15. No text, no letters, no watermark, no characters.

A single game map icon: ISLAND. The island floats in the air, with a rounded rocky bottom and a few small hanging roots. Seen from the front and slightly from above. Centered, the whole island visible, wide empty margin around it. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no clouds, no shadow, no other objects. Square image.
```

| File | OBJECT |
|---|---|
| `ui-map-meadow.jpg` | a small floating island with a green meadow, flowers and a fence |
| `ui-map-space.jpg` | a small floating island with a launch pad and a cute rocket |
| `ui-map-planet.jpg` | (redone 2026-10-28) a small floating island with fresh green grass, one big mushroom tree with a wide red-brown cap with cream spots, a group of three pale amber and rose crystals, a tiny dark green swamp pond with two stepping stones and reeds, and a small round stone pedestal |
| `ui-map-dragons.jpg` | a small floating island with rounded hills and a cozy dragon cave |
| `ui-map-egg.jpg` | a small floating island with a grassy slope and a big spotted egg on top |

### ui-star.jpg and ui-star-empty.jpg (results screen, 1-5 stars)
Make `ui-star.jpg` first, then in the same chat attach it and use the second prompt.
```
Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette. A single chubby five-pointed star with rounded tips, warm golden yellow with a soft light highlight in the upper left, no face. Front view, centered, the whole star visible, wide empty margin. No text, no letters, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no sparkles, no other objects. Square image.
```
```
The same star with exactly the same shape, size, position and outline, but empty: filled with flat soft light grey, no highlight. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-stars-earned.png and ui-parrots-earned.png (the totals ever on My progress; made locally 2026-10-27, not by Gemini)
Stacks of `ui-star.jpg` (three stars stepping back up right) and `ui-act-parrot-head.jpg` (two heads,
the back one up right with its beak showing): each copy behind is smaller and a little darker, and a
key-colored gap is cut around the copy in front of it, so the stack still reads at 32 px.

### ui-medals.jpg (the growth medals' count in the third row of My progress; 2026-11-08, first try)
Attach `ui-chest.jpg` for the style.
```
Generate an image: Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. Copy only the outline and the shading style from the attached picture, not its subject or colors. A single icon: one round golden medal hanging on a short red and blue ribbon, as a sports medal really looks; the medal face is plain, no number, no letters. Front view, centered, the whole icon visible, wide empty margin. No text, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-key.jpg (mastered keys chip in the stats; the owner replaced it 2026-10-23)
```
Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: one computer keyboard key, clearly recognizable as a key: a square key with rounded corners seen a little from above, a lighter cream square top surface with a slight dip, and darker peach sloping sides below it. The key top is completely empty: no letter, no symbol, no pattern. Centered, the whole icon visible, wide empty margin. No text, no letters, no numbers, no symbols, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-world-keys.jpg (the keyboard button of an open world on the map, in a badge-sized grey-ringed disc; 2026-11-05)
The first picture had three rows of small keys and read as a thin strip at 40 px; this follow-up in the same chat made it compact.
```
Generate an image: Keyboard

Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: a small simplified computer keyboard seen gently from above and a little from the side, so its front edge and one short side are visible. A chunky rounded cream body with a soft peach front edge; on top three rows of chunky rounded pastel keys (soft mint, sky blue, butter yellow and peach mixed) and one long wide space bar in the front row. The keys are completely empty: no letters, no symbols. Not a technical drawing, not a black line icon: a friendly colourful object like a toy. Centered, the whole keyboard visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```
```
Same style and colours, but much simpler so it reads at 40 pixels inside a small round badge: a compact, almost square keyboard (only a little wider than tall), seen gently from above and a little from the side, with only two rows of three big chunky rounded keys (mint, sky blue, butter yellow, peach) and one big wide space bar below them. Thick soft dark-brown outline, big simple shapes, no small details. Keys empty, no letters. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow. Square image.
```

### ui-lock.jpg (a closed world's lock button on the map, in a grey-ringed disc a little bigger than the badge; grey, coloured and swinging when pointed at; 2026-11-09, first try)
```
Generate an image: Padlock

Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: a chubby friendly padlock, strictly front view, upright and not tilted. A rounded soft golden-yellow body (a little wider than tall) with a lighter top highlight, and a thick rounded light-grey metal shackle arch on top, closed. In the middle of the body one simple dark-brown keyhole: a small circle with a short narrow slot under it. No face, no eyes, no mouth, no key, no chain, no decorations. Perfectly symmetrical. Centered, the whole padlock visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-journey-rose.jpg (the hero's journey's badge on the map: a simple four-point compass rose, the badge's ring is round; turned by the game; 2026-11-07)
In use: the owner's own picture (2026-11-07), with four small grey diagonal points between the main ones. Drawn in the badge at 72 %. A new picture, nothing attached. The first prompt ("only four long pointed star points ..., nothing between them") came with four small diagonal points; the prompt below, saying the diagonals are empty, drops them.
```
Generate an image: Four-point compass star

Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), bold simple shapes that stay readable when very small. A single icon: a simple four-pointed star shaped like a plus sign with sharp tips, exactly FOUR points in total: one up, one down, one left, one right. There is nothing at all in the diagonal directions: no small points, no rays, no second layer of points behind, only empty background between the four points. The top point is red #E5534B; the bottom, left and right points are soft blue #5B8DD6. Each point is split lengthwise into a lighter and a darker half. A small round dark-brown pin in the middle. Strictly front view, perfectly symmetrical, not tilted. No circle, no ring, no letters, no numbers, no face, no shadow. Centered, the whole shape visible, wide empty margin. No text, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-treasure-map.jpg (easter egg: typing "mapa" on the world map shows it, the figure walks the red line to the treasure; 2026-11-09, sixth try)
The owner kept this picture although its red line has gaps and the town, forest and scrap appear twice.
```
Generate an image: Treasure map

Cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, rounded friendly shapes, soft dark-brown outlines (not black), warm pastel palette, light soft shading. Calm and friendly, suitable for children aged 6 to 15. No text, no letters, no numbers, no watermark, no characters, no people, no animals.

A pirate-style treasure map drawn on one sheet of old warm cream parchment paper with softly torn, slightly curled edges, lying flat. The parchment is big and fills almost the whole image, only a thin magenta border remains around it. The map is seen straight from above. On the map, small cute pictures of places stand along a route, spread evenly over the whole map, each clearly separate with calm parchment between them:
1. bottom left: a small cute rocket standing upright on a little launch pad (the start),
2. a big cream egg with soft brown spots lying in a little nest,
3. a small junkyard: a yellow crane whose cable holds a big red horseshoe magnet that lifts an old tire and a tin can above a small scrap pile,
4. a small town of a few colorful houses with pointed roofs standing on green grass, with a fluffy white cloud floating behind it,
5. a small green forest of a few round trees,
6. a little blue lake with water lilies,
7. one big lonely tree with a wide round crown,
8. top right: a wooden treasure chest, open, full of gold coins and gems, standing on a big red X (the end).

A thick dashed red line runs from the rocket to the treasure chest, winding gently past every place in this order, never crossing itself, passing right beside each place. The line is clear and easy to follow. In the free spaces between the bends of the line stand small obstacles, so there is no shortcut: little grey rocky mountains, thorny bushes, a few boulders. No compass rose.

Background around the parchment: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no table. Landscape image, slightly wider than tall (4:3).
```

### ui-keys-typed.jpg (letters typed in the last 14 days chip in the stats; a pile of pastel keys, one with a plus; the owner's picture 2026-10-23, replaced ui-key-star)

### ui-days-trained.jpg (days with practice in the last 14 days chip in the stats; a desk calendar page with a few days ticked off, plan 89)
```
Generate an image: Days trained

Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: a small pastel desk calendar seen a little from above, a cream page on a soft mint green stand with two round peach rings at the top. The page shows a simple grid of rounded squares in two rows; three or four of the squares are pastel green with a bold dark-brown tick mark, the others are empty. No numbers, no letters, no face. Centered, the whole icon visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-typing-time.jpg (typing time in the last 14 days chip in the stats; an alarm clock with two bells, plan 89)
```
Generate an image: Typing time

Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: a chubby pastel alarm clock, front view, a round soft peach body with a cream face, two small round pastel yellow bells on top joined by a little handle, two short stubby feet. The clock face has two dark-brown hands and only four short dark-brown tick marks, no numbers. NO face, no eyes, no mouth, no arms, no legs other than the two stubby feet. Centered, the whole clock visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-accuracy.jpg (accuracy in 14 days chip in the stats; an arrow in the middle of a target; the owner's picture)

### ui-badge-none.jpg (the world badges shelf on My progress with no badge yet, beside "none yet"; 2026-11-06)
The ui-aim-sight prompt below with "Grey empty badge" and as the icon: "an empty medal badge not earned yet, strictly front view: a thick round ring, and inside it a plain shield shape, the shield empty with no picture and no symbol on it", the same greys, "no ribbon, no star".

### ui-story-dragon.jpg, ui-story-robot.jpg, ui-story-fairy.jpg (a story's row on My progress and the certificate, shown at 36 px; 2026-11-09)
The whole figures (`obj-dragon-hatched`, `robot-happy`, `fairy-happy`) had too many details at 36 px. Each is a close-up head
made from the figure's picture, attached: "redraw the [figure] from the attached picture in exactly the same drawing style,
outline, shading and colours, but as a close-up portrait: only its head and the top of its shoulders, filling most of the
picture", then the figure's own parts named plainly (the robot's face screen with smiling turquoise eyes and the antenna;
the fairy's lavender hair with the yellow flower and the wing tips behind her shoulders; the dragon's horns, ears and big
eyes, no eggshell), and "Keep it simple and bold so it reads clearly as a tiny icon of about 36 pixels: big clear shapes,
no small details, no arms. Front view, centered". Robot and dragon on magenta, the fairy on green.

### ui-aim-arrows.jpg (a range award not found yet on My progress: two crossed arrows, greyed and turned at random by the game; the owner's picture 2026-11-09, replaced ui-aim-sight)

### ui-aim-sight.jpg (no longer in the game; its prompt is the base of ui-badge-none above; 2026-11-06)
```
Generate an image: Grey target sight

Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-grey outline (not black), bold simple shapes that stay readable when very small. A single icon: a friendly rifle-scope style target sight, strictly front view: two thick concentric circles (a big outer ring and a smaller inner ring with even space between them) and a bold cross of two straight lines through the exact center, the four arms of the cross reaching a little past the outer ring, a small round dot in the very center. Everything in soft calm greys only: rings and cross light grey #B8BEC6 with a darker grey outline #7D858F, the space inside the rings empty. Perfectly symmetrical, not tilted. No color other than grey, no face, no eyes, no gun, no target board, no shadow, no glow. Centered, the whole sight visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-chest.jpg (range finds chip in the stats, between worlds and accuracy; a pastel treasure chest with gems and leaves; the owner's picture 2026-10-24)

### ui-typing-speed.jpg (speed in 14 days chip in the stats; an arrow made of keys; the owner's picture 2026-10-23, replaced ui-speed)

### ui-icon-hr.jpg (the same fox head with thinner lines, for the large logo on the start page; the owner's picture 2026-10-23)
The ui-icon prompt with "thin dark-brown outline" instead of "bold dark-brown outline".

### ui-mentor.jpg (the mentors' turtle: the start page's mentor button, the empty results table; the owner replaced it 2026-10-23 with a turtle reading a book)
```
Generate an image: Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: a friendly wise turtle teacher with a green shell, round glasses and a small dark graduation cap, smiling, holding a small tablet in its front flipper. Three-quarter front view, centered, the whole figure visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-new-task.jpg and ui-new-task-squirrel.jpg (the phone start page's "Nová úloha" button: a pupil at a school desk; 2026-10-31)
**Attach `ui-missing-keyboard.jpg`** for the style (the mouse on the same page):
```
Generate an image: Badger pupil at a school desk

Draw a new character in exactly the same drawing style as the attached picture of the mouse: the same soft cartoon look, the same dark-brown outline weight, the same warm muted colors and gentle shading. Use the attached picture only for the style; the character, pose and composition must be completely different.

A single picture: a cute young badger, a pupil, sitting on a small wooden school chair behind a small wooden school desk, seen three quarters from the front. The badger has the classic badger face: white head with two dark-grey stripes running over the eyes to the ears, a small dark nose, big shiny friendly eyes with white highlights, a happy smile, soft grey body fur. It wears a small cozy teal sweater. On the desk lies an open notebook with a few wavy lines instead of writing, and the badger holds a yellow pencil in one paw above the notebook, the other paw resting on the desk, as if it is just noting down homework. A small school backpack leans against a leg of the desk. The whole desk, chair and badger are visible, centered, with a wide empty margin.

No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no floor, no other objects. Square image.
```
Then, in a new chat with that picture attached: "Redraw the attached picture with exactly the same badger, sweater, chair, desk, backpack, drawing style, colors, outline weight, pose and composition. Change only one thing: instead of the open notebook and the pencil, a small computer keyboard lies flat on the desk, and the badger types on it happily with both front paws on the keys. The keys are plain light keys with no letters or symbols on them." plus the no-text and magenta lines.

The squirrel: the same first prompt with "a cute young red squirrel ... warm orange-red fur, a cream belly, small tufts on the ears ... a big fluffy curled tail rising behind the chair ... a small mustard-yellow knitted vest" typing on a keyboard with plain keys; then, attached, "Change only one thing: remove the backpack completely, and in its place on the ground next to the desk leg stands a small woven basket full of brown acorns."

### ui-teacher.jpg (Ms Turtle the teacher: her tips above the worlds on the map; 2026-10-28)
**Attach `ui-mentor.jpg`:**
```
Generate an image: The same turtle teaching

Draw the turtle from the attached picture as the same character, in exactly the same drawing style, colors, shell pattern, face and outline weight, but in a new pose: she is a kind teacher explaining something. She stands upright on her hind legs, turned three quarters toward the viewer, a friendly smile, eyes open and looking at the viewer. Her right front leg is raised with one finger pointing up, as when a teacher explains a rule; her left front leg holds a short thin wooden pointer stick that points diagonally up and away from her. No book, no speech bubble, no text, no letters, no chalkboard, no desk, no other objects. The whole turtle visible, centered, wide empty margin. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no floor. Square image.
```

### ui-teacher-2.jpg and ui-teacher-3.jpg (Ms Turtle in two more poses, taking turns with ui-teacher.jpg above the worlds; 2026-10-28)
**Attach `ui-teacher.jpg`** to each:
```
Generate an image: The same turtle teacher sitting and waving

Draw the turtle from the attached picture as the same character, in exactly the same drawing style, colors, shell pattern with golden leaves, round glasses, graduation cap with tassel, face and outline weight. But the body pose must be completely different from the attached picture: she SITS on the ground on her bottom with both hind legs stretched forward toward the viewer, strictly front view, her shell behind her. An open red book lies on her lap and she holds it with one front leg; the other front leg is raised beside her head and waves hello. Big friendly smile, eyes open, looking at the viewer. No pointer stick, no speech bubble, no text, no letters, no numbers, no desk, no chair, no other objects. The whole turtle visible, centered, wide empty margin. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow under her, no floor, no marks anywhere in the background. Square image.
```
```
Generate an image: The same turtle teacher with a glowing light bulb

Draw the turtle from the attached picture as the same character, in exactly the same drawing style, colors, shell pattern with golden leaves, round glasses, graduation cap with tassel, face and outline weight. But the body pose must be completely different from the attached picture: she stands on her hind legs, front view, slightly leaning forward. In one front leg she holds a big glowing yellow light bulb in front of her chest, with soft warm light rays around the bulb, as when someone has a good idea. Her other front leg is stretched out to the right side of the image and points to the right with one finger. A happy smile, eyes open, looking at the viewer. No pointer stick, no clipboard, no book, no speech bubble, no text, no letters, no numbers, no desk, no other objects. The whole turtle visible, centered, wide empty margin. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow under her, no floor. Square image.
```
Follow-up in the same chat (the soft glow left a pink fringe after keying): "Same picture, keep everything, but the light of the bulb is drawn only as a few short thin yellow ray lines with dark outlines around the bulb: no soft glow, no halo, no blurred light anywhere, so the magenta background stays perfectly flat right up to every outline."

### ui-start-*.jpg (the start page's sky and meadow, each piece animated on its own)
`npm run assets` turns `ui-start-meadow*` into one tile that the page repeats across the window
(its ends are blended into each other); the rest are sprites.

`ui-start-meadow.jpg` (2026-10-24; a first prompt in the same chat gave a grey haze, fixed with
"the background one flat magenta, keep the plants"):
```
Generate an image: Start page meadow edge

THE WHOLE IMAGE IS ONE FLAT SOLID PURE MAGENTA (#FF00FF) EXCEPT THE MEADOW PLANTS.

Cute, soft 2D children's storybook illustration, flat vector style, rounded friendly shapes, uniform 2 px dark green-grey outline (#3F5B3A), flat fills with one soft lighter band along the top of each shape, calm and peaceful. Palette: grass greens #8CCB6A, #5FA84A and darker #3F8A45 at the bottom, accents warm yellow #F6D55C, soft pink #F2A5B8, soft lilac blue #A9C4EE, white daisies with yellow centers.

Ultra-wide panoramic image, 21:9: the edge of a lush meadow seen from the side. The plants grow up out of the bottom edge of the image: their stems and the lowest part of the grass are cut by the bottom edge, so there is NO visible ground, NO soil, NO flat green band and NO horizontal line anywhere at the bottom. The lowest quarter of the image is dense overlapping grass blades of different greens, darker toward the bottom, filling the whole width with no gaps. Out of this grass rise many different plants spread across the whole width: tufts of tall grass blades, daisies, buttercups, pink clover, a dandelion seed ball, small bluebells, a curly fern, tall grass stems with seed heads, round leafy bushes. Their tops form a soft, uneven, wavy silhouette: most plants reach about 40 percent of the image height, a few tall stems reach about 75 percent, nothing is cut by the top edge.

Above and between the plants there is only flat magenta: NO sky, NO hills, NO trees, NO fence, NO sun, NO clouds, NO distant objects, no grey, no gradient, no fog, nothing behind the plants except magenta. Every plant appears only once: nothing repeated or copied inside the image, one single continuous strip, not split into rows or panels. The strip must repeat side by side without a visible seam: at the very left and right edges there is only the same dense grass at the same height, no flower touches the left or right edge. No white or light outline, halo or sticker border around the plants: their dark outlines meet the magenta directly. Never pink, purple or magenta in the grass. No characters, no animals, no insects, no stones, no text, no letters, no watermark. Flat side view, no perspective, no vanishing point.
```
`ui-start-meadow-closed.jpg`: a follow-up in the meadow's chat, so every plant stays in place
(asked in daytime colors; an earlier evening recolor in the same chat kept its flowers open).
`npm run assets` scales it to the day meadow's size, cuts it out the same way and recolors it
into the night palette (greens to a dark blue-green, flowers a little darker and bluer), which
gives `ui-start-meadow-night`:
```
The same image with exactly the same colors, plants, shapes, positions and outlines, only the flowers are going to sleep for the night: the daisies are closed into small white buds with the petals folded up, the buttercups are closed into round yellow buds, the clover heads are a little smaller and hanging slightly, the dandelion has lost its seed ball and is a bare stem with only two or three seeds left on top, the bluebells hang lower. The grass, the fern, the tall stems and the bushes stay exactly as they are. The background behind and between all plants stays ONE perfectly flat solid pure magenta color (#FF00FF), no gradient, no fog.
```
`ui-icon-hr-darkbg.jpg`: the logo face for a dark page (the start page in the dark look): a soft
grey edge instead of the light sticker border.
`ui-start-sun.jpg`:
```
Generate an image: Sun as a simple ball

Cute, soft 2D children's game illustration, flat vector style with gentle gradients, soft dark-brown outline (#5A3D2B, not black), warm pastel palette, calm and peaceful. A single round sun drawn as a smooth perfect circle, NO rays, NO spikes, NO flames, NO lines around it, no face. Warm golden yellow #FFD25A, a soft lighter highlight #FFE9A8 in the upper left and a gentle deeper orange-yellow #F4A93A toward the lower right, like a soft glowing ball. Front view, centered, the whole circle visible, wide empty margin, nothing touches any edge. No glow, no halo, no sparkles, no clouds. No text, no letters, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no sky, no other objects. Square image.
```
`ui-start-cloud-1.jpg` and `ui-start-cloud-2.jpg`: follow-ups in a chat that drew a sun with two
clouds ("Now draw only one cloud alone, in exactly the same style ..."):
```
A wide fluffy cloud with three round bumps on top and a flat soft bottom, cream white #FFFBF2 with light blue-grey shading #DCE6F0 along the bottom. No sun, no rays, no face. Centered, wide empty margin, nothing touches any edge. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```
(cloud 2: "a small round cloud with two bumps, the left bump bigger").

`ui-start-moon.png` and `ui-start-star.png` were cut locally from one picture of a crescent moon
with three separate stars:
```
Generate an image: Crescent moon with three stars

Cute, soft 2D children's game illustration, flat vector style with gentle gradients, rounded friendly shapes, soft dark-brown outline (#5A3D2B, not black), warm pastel palette, calm and dreamy. A chubby crescent moon in soft cream yellow #FFF1C9 with a lighter highlight on its outer curve and a few gentle round craters in #EEDFAE, the crescent opens to the right, no face. Three small chubby five-pointed stars with rounded tips in warm gold #F6D55C with a light highlight, each a different size: the largest to the upper right of the moon, two smaller ones lower right, clearly separate from the moon and from each other. Front view, everything whole and visible, centered, wide empty margin, nothing touches any edge. No glow, no halo, no sparkles. No text, no letters, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no sky, no other objects. Square image.
```

### badge-*.jpg (world badges)
One round badge picture per world, shown in a medal on the map, the results and the
progress view. The ring (bronze, silver, gold) is drawn by the game, so the picture has
no ring or frame. Replace BADGE with the text from the table.
Since 2026-11-09 the prompt also attaches `badge-space.jpg` ("in exactly the same drawing style as the attached rocket
badge") and asks for the rocket's ornaments: "decorated like the rocket: small golden laurel sprigs and curly golden swirl
ornaments painted on [the object], a few soft cream wisps curling around its foot like the rocket's smoke", and "There is no
glow, haze, halo, shadow or light around [the object]": a glow or a shadow on the magenta does not key out cleanly.
```
Beautiful, richly detailed 2D game achievement icon for teenagers aged 10 to 15, polished vector illustration with layered gradients, soft glossy highlights, rim light, subtle texture and fine decorative details, rounded friendly shapes, soft dark-brown outlines (not black), harmonious saturated pastel palette with a few brighter accents. A single badge picture: BADGE. Make it look like a precious collectible emblem: a main object with several small supporting details (for example tiny sparkles, small leaves or stars, an inner glow, small ornaments) that belong to the same theme, never cluttered. Sparkles and small ornaments are only gold, white or pale yellow, never pink, purple or magenta, and there is no glow, haze or halo around the object: the flat background color reaches the object's outline directly. The object stands alone with a compact, roughly round overall shape; do not draw any circle, disc, medal, coin or plate behind it. Front view, centered, the whole composition visible, wide empty margin around it. No ring, no frame, no ribbon, no text, no letters, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

| File | BADGE | Status |
|---|---|---|
| `badge-meadow.jpg` | (2026-11-09) a lucky four-leaf clover with a short curved stem, golden laurel sprigs and swirls painted on the leaves, a golden dot in the middle | done 2026-11-09 |
| `badge-space.jpg` | a cute round red rocket flying up with a small flame | new |
| `badge-planet.jpg` | (2026-11-09, more ornate) a fly agaric mushroom, a red cap with white spots on a white stem with a frilly ring, a golden band with laurel sprigs and swirls along the cap's rim and on the stem, a small tuft of grass with two tiny leaves; add "no face" | done 2026-11-09 |
| `badge-dragons.jpg` | (2026-11-09, the first one had a glow that did not key out) a big dragon egg in cream with pastel green spots, a teal band around its middle, golden laurel sprigs and swirls painted on the shell | done 2026-11-09 |
| `badge-egg.jpg` | (2026-11-09, without the glow) a happy mint green baby dragon peeking out of a cracked egg shell, wings open, golden wavy lines, dots and swirls on the shell | done 2026-11-09 |
| `badge-junkyard.jpg` | (2026-11-09, instead of a sad robot) one old car tyre standing upright, slate grey rubber, a teal and silver rim, golden laurel sprigs and swirls on its side, a small golden bolt at its foot; no shadow under it (a follow-up removed one) | done 2026-11-09 |
| `badge-workshop.jpg` | a silver gear standing on one springy coil leg | new |
| `badge-raintown.jpg` | an open red umbrella with a few raindrops | new |
| `badge-robocity.jpg` | a blue key card with a small chip and a key symbol | new |
| `badge-robohome.jpg` | a cozy little house with a big red heart on the door | new |

### ui-posture-boy.jpg and ui-posture-girl.jpg ("Ready, steady, type!" card before every adventure, one at random)

The girl's picture is the same prompt with "a cheerful girl (about 10 years old, shoulder-length wavy hair, a simple t-shirt, jeans and sneakers)" for the child. The owner replaced both on 2026-10-28 with their own versions (the boy in a striped t-shirt on an office chair, the girl with a flower clip).

```
Cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, rounded friendly shapes, soft dark-brown outlines (not black), warm pastel palette, light soft shading. Calm and friendly, suitable for children aged 8 to 12. No text, no letters, no numbers, no watermark.

Side view of a cheerful child (about 10 years old, short tidy hair, simple t-shirt and trousers) sitting at a low desk in front of a laptop, showing good typing posture: back straight and leaning lightly against the chair backrest, both feet flat on the floor, knees at a right angle, relaxed shoulders, forearms level, wrists floating just above the keyboard (not resting on the desk), fingers gently curved on the middle row of keys, eyes looking straight at the screen, the screen at eye height about an arm's length away. A small chubby orange baby fox with big shiny eyes and a cream belly sits on the desk next to the laptop and cheers with one paw raised. Simple chair and desk only, no room, no other furniture.

Composition: landscape image (3:2), the whole child, chair and desk visible and centered, wide empty margin around. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no floor line, no shadow, no other objects.
```

---

## 6. Background music

Instrumental only, no vocals. Each track should loop smoothly. If Gemini makes short
clips (around 30 s), that is fine.

### Common prompt (replace MOOD)
```
Calm, gentle instrumental background music for a peaceful children's educational typing game. No vocals, no lyrics, no sudden loud parts, no drums that are too strong, soft dynamics, steady tempo so it does not distract from concentration. The end should flow back into the beginning so it can loop seamlessly. MOOD
```

| File | MOOD |
|---|---|
| `music-menu.mp3` | Warm and welcoming, 80 BPM, C major, soft marimba, light acoustic guitar and gentle pads, like the start of a cozy adventure. |
| `music-meadow.mp3` | Light and playful, 90 BPM, G major, pizzicato strings, glockenspiel, soft woodwinds and birds-like flute phrases, sunny meadow morning. |
| `music-space.mp3` | Dreamy and wondering, 75 BPM, D major, soft analog synth pads, twinkling celesta arpeggios, slow gentle bass, floating calmly among stars. |
| `music-planet.mp3` | Magical and curious, 85 BPM, F major (lydian feel), kalimba, harp, soft bells and airy pads, walking through an enchanted forest. |
| `music-dragons.mp3` | Warm and brave but calm, 80 BPM, E-flat major, gentle hand drums, ocarina melody, soft strings, a friendly dragon valley at sunset. |
| `music-egg.mp3` | Hopeful and bouncy, 95 BPM, A major, ukulele, light claps, glockenspiel, a happy little journey down a hill. |
| `music-break.mp3` | Very slow and relaxing, 60 BPM, C major, soft piano and warm pads, for a short stretching break and deep breathing. |

## 7. Story 2: Tapko and Bolt the robot

Plan: `.todo/.done/11-story-robot.md`. Deliver in any order; the game draws a simple shape for
anything still missing. Use the common prompts of sections 3, 4, 5 and 6 with the texts
below. Suggested order: Bolt first (he is in every level), then world by world.

### Bolt (sprites, section 4 prompt, BG magenta)
For this character replace the sentence "Side view facing right unless said otherwise" with "Strictly front view, facing the viewer directly, symmetrical, standing on nothing: no shadow or ground under the feet".
Same robot in every picture: "a small cute round robot about as tall as a child's knee,
light grey-blue metal body with soft rounded edges, a round head with a dark glass face
showing two big friendly glowing cyan eyes, one short antenna with a tiny orange ball,
small claw hands, short stubby legs, a few small rivets, front view". Make `robot-idle`
first, then attach it to the other prompts ("the same robot as in the attached image").

| File | OBJECT |
|---|---|
| `robot-idle.jpg` | the robot standing calmly, front view |
| `robot-happy.jpg` | the same robot, happy, eyes as smiling arcs, one claw waving |
| `robot-worried.jpg` | the same robot, a little worried, eyes looking up, claws together |
| `robot-wet.jpg` | the same robot shaking off a few water drops, eyes squeezed shut, smiling |
| `robot-broken.jpg` | the same robot but older: a few soft rust spots, one leg missing, antenna bent, sad but hopeful eyes |
| `robot2-idle.jpg` | the same robot with new longer legs, a bright yellow antenna ball, a golden shield-shaped plate on the chest and a thin golden rim around the glass face, standing proudly |
| `robot2-happy.jpg` | the robot of `robot2-idle`, happy, waving |
| `robot-raincoat.jpg` | only a small yellow raincoat with a hood that fits the robot of `robot2-idle`, same position and size (overlay) |

### Map islands (section 5, ui-map prompt)
| File | ISLAND |
|---|---|
| `ui-map-junkyard.jpg` | a small floating island with friendly piles of old tires, crates and cogs and a little magnet crane |
| `ui-map-workshop.jpg` | a small floating island with a cozy workshop shed, a conveyor belt and gears |
| `ui-map-raintown.jpg` | a small floating island with tiny colorful houses under a soft rain cloud and puddles |
| `ui-map-robocity.jpg` | a small floating island with rounded silver towers and a big round door with a keypad |
| `ui-map-robohome.jpg` | a small floating island with a cozy round robot house with warm lit windows |

### Backgrounds (section 3 prompts)
| File | SCENE / LAYER | Height | Status |
|---|---|---|---|
| `bg-junkyard-far.jpg` | a friendly junkyard in soft daylight with soft hills of old things far away, a rusty but cheerful crane and a light blue sky | full | done 2026-10-22 |
| `bg-junkyard-mid.jpg` | soft piles of old tires, wooden crates and round metal cans | 45 % | |
| `bg-junkyard-near.jpg` | a few big coiled metal springs, large bolts and nuts and thick grass tufts | 25 % | done 2026-10-22 (reference for the strip prompt) |
| `bg-workshop-far.jpg` | the inside of a warm cozy workshop with wooden walls, shelves with jars of screws, hanging tools and a round window | full | |
| `bg-workshop-mid.jpg` | a workbench with drawers and a vise, a tool cabinet, a mint toolbox, stacked crates, a pegboard with tools, a drill press, a stool and a barrel with rods | 45 % | done 2026-10-23 |
| `bg-workshop-near.jpg` | a conveyor belt across the whole image with rollers below, and on it in one row a gear, an open crate, a robot arm part, copper wire, a box of bolts, a wheel, a battery and a small robot head; nothing behind them | 25 % | done 2026-10-23 |
| `bg-raintown-far.jpg` | a calm small town on a rainy afternoon, soft grey-blue sky with gentle rain lines, colorful rounded houses with lit windows | full | |
| `bg-raintown-mid.jpg` | wet cobblestone street with small lamp posts and round bushes | 40 % | |
| `bg-raintown-near.jpg` | shiny puddles with ripples and a few fallen leaves | 20 % | |
| `bg-robocity-far.jpg` | a friendly futuristic city with rounded silver and pastel towers, soft light trails and a lilac evening sky | full | |
| `bg-robocity-mid.jpg` | few big shapes with air between them: a rounded fence panel with a cyan line, a power post with a yellow top, a cable into a round connector, an antenna tower, a dome transformer, a fence panel with a round window and a battery block, on a dark ground band | 40 % | done 2026-10-23 |
| `bg-robocity-near.jpg` | low chunky pieces on a thin dark ground band: round ground lights, a cable loop, a leaning manhole cover, a dome lamp, a bollard, a coiled cable and a vent box | 20 % | done 2026-10-23 |
| `bg-robohome-far.jpg` | the inside of a cozy robot home: round windows, warm lamps, soft sofa, shelves with little gadgets, pastel colors | full | |
| `bg-robohome-mid.jpg` | a row of cozy furniture: a low cabinet, a plant in a pot, a round rug | 40 % | |
| `bg-robohome-near.jpg` | a warm wooden floor of vertical parallel planks, a book, a ball and a slipper | 20 % | redone 2026-10-26 (planks parallel, no V at the joins) |

### Game objects (section 4 prompt)
| File | OBJECT | BG |
|---|---|---|
| **Junkyard** | | |
| `obj-tire.jpg` | an old rubber tire with a friendly face | magenta |
| `obj-crate.jpg` | a small wooden crate with a friendly face | magenta |
| `obj-can.jpg` | a round metal tin can with a friendly face | magenta |
| `obj-spring.jpg` | a big coiled metal spring with a friendly face, bouncing | magenta |
| `obj-magnet.jpg` | a red and silver horseshoe magnet hanging on a short chain from above | green |
| `obj-cable-knot.jpg` | a big tangled knot of soft colorful cables with a friendly face | magenta |
| **Workshop** | | |
| `obj-gear.jpg` | a shiny golden gear | magenta |
| `obj-bolt.jpg` | a big silver bolt with a nut | magenta |
| `obj-wheel.jpg` | a small rubber wheel | magenta |
| `obj-antenna.jpg` | a short robot antenna with a yellow ball on top | magenta |
| `obj-battery.jpg` | a big friendly battery with four empty charge bars on its side | magenta |
| `obj-basket.jpg` | a small wire basket | magenta |
| **Rainy town** | | |
| `obj-raindrop.jpg` | a big round friendly raindrop with a sleepy smile | magenta |
| `obj-umbrella.jpg` | a big open red umbrella seen from the side, no hand | green |
| `obj-storm-cloud.jpg` | a grumpy but cute grey storm cloud with a small yellow lightning bolt | magenta |
| **Robot city** | | |
| `obj-door.jpg` | a rounded metal door, closed, with a small keypad panel on the right | magenta |
| `obj-door-open.jpg` | the same door, open, with warm light inside | magenta |
| `obj-panel.jpg` | a small keypad panel with a tiny screen and a green light | magenta |
| `obj-gate.jpg` | a big round main gate with three panels and a glowing ring, closed | magenta |
| **Robot home** | | |
| `obj-lamp.jpg` | a cute round floor lamp, switched off | magenta |
| `obj-lamp-on.jpg` | the same lamp, switched on, warm glow | magenta |
| `obj-vacuum-robot.jpg` | a small round vacuum robot with friendly eyes | magenta |
| `obj-toaster-robot.jpg` | a toaster robot with little arms and a friendly face | magenta |
| `obj-box.jpg` | a cardboard box with the lid open | magenta |
| **Little friends** | | |
| `obj-robot-small-1.jpg` | a tiny cute robot shaped like a ball with one wheel | magenta |
| `obj-robot-small-2.jpg` | a tiny cute square robot with two springy legs | magenta |
| `obj-robot-small-3.jpg` | a tiny cute robot with a propeller on top, flying | magenta |

### Accessories for Tapko (section 2, "Needs new art" single-item prompts)
Rewards of story 2. Glasses use the glasses prompts; the jetpack is a back item with a
front part (`acc-jetpack-front.jpg` for its straps).

| File | ITEM / FRAME |
|---|---|
| `acc-umbrella.jpg` | head: only the front of a red umbrella, worn like a cap: a half-dome canopy with ribs and a scalloped rim, no handle, no underside, about 1.4 times as wide as the head so it also covers a lion's mane, the tip points up |
| `acc-raincoat.jpg` | body: a yellow raincoat with big round buttons |
| `acc-hard-hat.jpg` | head: a yellow hard hat |
| `acc-goggles.jpg` | glasses: FRAME = round safety goggles with a green rubber strap and a thick frame |
| `acc-jetpack.jpg` | back: a small silver jetpack with two round orange nozzles |
| `acc-antenna-band.jpg` | head: a headband with two springy antennas with little lights |

New accessories also need a line in `SINGLES` of `scripts/assets.mjs` (done with the
plan), otherwise the script skips them.

Optional, only for the meeting scene: `tapko-KIND-surprised.jpg` for every kind, with the
face prompt of section 1 and the mood "surprised, big round eyes, small open mouth".

### Music (section 6 prompt)
| File | MOOD |
|---|---|
| `music-junkyard.mp3` | Curious and playful, 88 BPM, F major, soft mallets on metal-like tones, light pizzicato, gentle shaker, a sunny treasure hunt among old things. |
| `music-workshop.mp3` | Busy but calm, 92 BPM, C major, ticking clock-like percussion, music-box melody, soft bass, a cozy workshop at work. |
| `music-raintown.mp3` | Gentle and cozy, 70 BPM, D major, soft piano and warm pads with very soft rain-like textures, a quiet walk in the rain. |
| `music-robocity.mp3` | Wondering and bright, 84 BPM, A major, soft synth arpeggios, gentle electric piano, light pads, a friendly city of the future. |
| `music-robohome.mp3` | Warm and happy, 80 BPM, G major, ukulele, celesta and soft strings, coming home to family. |

## 8. Story 3: Tapko and Melody the fairy

Plan: `.todo/.done/24-story-fairy-forest.md`. Deliver in any order; the game draws a simple
shape for anything still missing. Use the common prompts of sections 3, 4, 5 and 6 with the
texts below. Suggested order: Melody first (she is in every level), then world by world.

### Melody (sprites, section 4 prompt, BG green)
For this character replace the sentence "Side view facing right unless said otherwise" with "Strictly front view, facing the viewer directly, symmetrical, standing on nothing: no shadow or ground under the feet".
Same fairy in every picture: "a small cute fairy girl about as tall as a child's hand,
round friendly face with rosy cheeks and big kind eyes, short wavy lavender hair with one
small yellow flower, a soft pink dress made of flower petals, two pairs of shimmering
pale blue and pink wings, bare feet, floating in the air, front view". Green background,
because her pink dress and wings are close to magenta. Make `fairy-idle` first, then attach
it to the other prompts ("the same fairy as in the attached image"). The pictures are kept
square, so she stays the same size in every mood.

| File | OBJECT |
|---|---|
| `fairy-idle.jpg` | the fairy floating calmly, hands together, a gentle smile |
| `fairy-happy.jpg` | the same fairy twirling with joy, arms up, eyes as smiling arcs |
| `fairy-singing.jpg` | the same fairy singing, mouth a small round "o", one hand raised, two tiny music notes next to her |
| `fairy-curious.jpg` | the same fairy looking curious, head a little tilted, one finger at her chin |

### Map islands (section 5, ui-map prompt)
| File | ISLAND |
|---|---|
| `ui-map-garden.jpg` | a small floating island with a flower garden of closed and open pastel buds and a little path |
| `ui-map-forestpath.jpg` | a small floating island with a winding forest path between round trees with little birds on the branches |
| `ui-map-lilylake.jpg` | a small floating island with a round calm pond, lily pads, pink water lilies and a little frog |
| `ui-map-musictree.jpg` | a small floating island with one big round tree with colorful music notes hanging from its branches |
| `ui-map-moonball.jpg` | a small floating island at night with a round glowing dance floor in a clearing and fireflies around it |

### Backgrounds (section 3 prompts)
The far layers have no sun and no moon (they repeat); mid and near are strips (plan 22).

| File | SCENE / LAYER | Height |
|---|---|---|
| `bg-garden-far.jpg` | a quiet fairy flower garden in soft daylight with gentle hills of flower beds far away, a light blue sky with soft clouds | full |
| `bg-garden-mid.jpg` | round bushes with closed pastel flower buds and a low garden hedge | 45 % |
| `bg-garden-near.jpg` | soft grass, small daisies and a few petals on the ground | 25 % |
| `bg-forestpath-far.jpg` | a calm fairy forest with tall round trees far away, soft green light between the trunks and a pale sky | full |
| `bg-forestpath-mid.jpg` | tree trunks with low branches, ferns and soft moss | 50 % |
| `bg-forestpath-near.jpg` | a soft forest path with small mushrooms, leaves and grass tufts | 25 % |
| `bg-lilylake-far.jpg` | a still fairy lake like a mirror with soft reeds and round trees on the far shore, a pale blue sky | full |
| `bg-lilylake-mid.jpg` | calm water with reeds and a few cattails along the shore | 40 % |
| `bg-lilylake-near.jpg` | the water's edge with small round pebbles and soft ripples | 20 % |
| `bg-musictree-far.jpg` | a magical clearing in the middle of the forest in soft lilac evening light, round trees far away | full |
| `bg-musictree-mid.jpg` | soft bushes and flowers shaped like little bells around the clearing | 45 % |
| `bg-musictree-near.jpg` | soft grass with small glowing flowers | 20 % |
| `bg-moonball-far.jpg` | a fairy forest at night, deep blue and violet sky with soft glowing stars, round tree tops, no moon | full |
| `bg-moonball-mid.jpg` | dark round bushes with tiny glowing lanterns and fireflies | 40 % |
| `bg-moonball-near.jpg` | soft night grass with small glowing mushrooms | 20 % |

### Game objects (section 4 prompt)
| File | OBJECT | BG |
|---|---|---|
| **Flower garden** | | |
| `obj-bud.jpg` | a closed pastel flower bud on a short green stem, sleeping | magenta |
| `obj-flower-open.jpg` | the same flower, open, with pastel petals and a yellow middle | green |
| `obj-big-flower.jpg` | a big closed flower bud on a tall stem with big leaves, asleep with a gentle face | green |
| `obj-big-flower-open.jpg` | the same big flower, wide open and smiling, glowing softly | green |
| **Forest path** | | |
| `obj-bird.jpg` | a small round cute songbird sitting, facing left, beak a little open as if singing | magenta |
| `obj-owl.jpg` | a round wise owl sitting on a branch, big friendly eyes | magenta |
| **Lily lake** | | |
| `obj-lily-pad.jpg` | a round green lily pad seen a little from above | magenta |
| `obj-lily.jpg` | a pink and white water lily flower, open | green |
| `obj-frog.jpg` | a small cute green frog sitting, big round eyes, a happy smile | magenta |
| **Music tree** | | |
| `obj-music-tree.jpg` | a big round friendly tree with a thick trunk and a wide round crown | magenta |
| `obj-note1.jpg` | a single colorful music note (an eighth note) with a soft glow | magenta |
| `obj-note2.jpg` | a colorful pair of beamed eighth notes, a different look from note 1 | magenta |
| **Moonlight ball** | | |
| `obj-firefly.jpg` | a tiny cute firefly with a softly glowing yellow tail and small wings | magenta |
| **Little friends** | | |
| `obj-baby-bird.jpg` | a tiny fluffy baby bird with big eyes | magenta |

The firefly is also the second little forest friend.

### Accessories for Tapko (section 2, "Needs new art" single-item prompts)
Rewards of story 3 (the garden gives the flower wreath Tapko already has, the lake its lily).

| File | ITEM / FRAME |
|---|---|
| `acc-feather.jpg` | head: one soft long feather tucked behind the ear, pointing up |
| `acc-harp.jpg` | hand: a small golden harp held in the right hand |
| `acc-fairy-wings.jpg` | back: two pairs of shimmering pale blue and pink fairy wings |

If the wings need straps over the shoulders, add `acc-fairy-wings-front.jpg` for them (like
the jetpack). The lines in `SINGLES` of `scripts/assets.mjs` are done with the plan.

### Badges (section 5, badge prompt)
| File | BADGE |
|---|---|
| `badge-garden.jpg` | an open pastel pink flower with a yellow middle |
| `badge-forestpath.jpg` | a soft long feather in blue and white |
| `badge-lilylake.jpg` | (2026-11-09, badge prompt of section 4) a small sky-blue garden watering can facing right, a teal band, golden laurel sprigs and swirls on its side, three water drops | done 2026-11-09 |
| `badge-musictree.jpg` | (2026-11-09, badge prompt of section 4, the old one did not key out) one big rounded oak-like tree leaf, golden laurel sprigs and swirls along its middle vein, a thin golden edge line | done 2026-11-09 |
| `badge-moonball.jpg` | (2026-11-09, badge prompt of section 4, only the moon: the firefly's glow did not key out) a pale golden crescent moon with soft craters, golden laurel sprigs and swirls along its curve; "no firefly, no insect, no face" | done 2026-11-09 |

### Music (section 6 prompt)
| File | MOOD |
|---|---|
| `music-garden.mp3` | Gentle and blooming, 78 BPM, F major, harp arpeggios, soft flute and light celesta, flowers waking up in the morning. |
| `music-forestpath.mp3` | Light and airy, 84 BPM, G major, wooden flute melody, soft pizzicato and harp, a walk through a singing forest. |
| `music-lilylake.mp3` | Still and dreamy, 66 BPM, D major, slow harp, glassy celesta and soft pads, a calm lake like a mirror. |
| `music-musictree.mp3` | Warm and wondering, 76 BPM, C major, music-box melody, harp and soft strings, a magical tree that plays. |
| `music-moonball.mp3` | Soft and enchanted, 72 BPM, A major, celesta, harp and a gentle flute waltz in 3/4, a quiet dance under the moon. |

## 9. World rhythm: calm steps, twists and map icons

New pictures for the calm step (level 2) and the twist (level 4) of every world, and one
icon per activity for the level dots on the map
([world rhythm](../.research/game/world-rhythm.md)). Each object stays alone and readable
at a small size, since many of them stand still on screen with a word next to them.

### Game objects (section 4 prompt)
| File | OBJECT | BG |
|---|---|---|
| **Meadow** | | |
| `obj-poppy-flower.jpg` | (2026-10-27, base of the poppy set, tall portrait 2 : 3) one common wild red poppy (corn poppy, Papaver rhoeas) in full bloom on its own single stem, seen from the side and slightly from the front. Four wide rounded, softly crinkled petals in warm scarlet red #E63B2E with a lighter coral highlight #F27A5E, never pink, purple or magenta; a small dark spot at the base of each petal, a small dark green-black seed head in the middle with a ring of short dark stamens. One thin, gently curved, slightly hairy green stem (#5FA84A) going straight down, with two small narrow toothed leaves low on the stem. No face, no eyes. The flower is at the top of the picture, the stem ends well above the bottom edge, nothing touches any edge | magenta |
| `obj-poppy-bud.jpg` | **not the common prompt:** attach `obj-poppy-flower.jpg`: "Edit the attached picture (a red poppy flower on a green stem). Replace the open flower with a closed poppy bud: an oval, slightly drooping green bud (#7DBF5A with lighter #A8D98A highlights), softly hairy, with only a thin line of red petal peeking at its tip. Keep the stem, its curve, its little hairs and both toothed leaves exactly the same, same style, same colors, same position and the same bottom end of the stem; only make the whole plant a bit shorter: the stem is cut shorter at its top so the bud sits about one fifth lower than the flower did. Keep the same flat magenta background (#FF00FF), no shadow, no grass, no other objects. No face, no eyes, no text. Same image size and same tall portrait shape as the attached picture." | magenta |
| `obj-poppy-opening.jpg` | **not the common prompt:** attach `obj-poppy-flower.jpg`: as the bud, but "Replace the open flower with a poppy that is just starting to open: the green hairy bud (#7DBF5A) has split into two halves that sit like a little cap, and crumpled scarlet red petals (#E63B2E with lighter coral #F27A5E highlights, never pink, purple or magenta) push out between them, still folded and closed, about half the size of the open flower." and "the bud sits about one tenth lower than the flower did" | magenta |
| `obj-poppy-faded.jpg` | **not the common prompt:** attach `obj-poppy-flower.jpg`: "Edit the attached picture (a red poppy flower on a green stem). The flower has finished blooming: three petals have fallen off, only one single petal still hangs on one side, drooping, faded to a pale dusty coral (#E9A08E). In the middle the round poppy seed head is now clearly visible, a bit bigger: a smooth round green-grey capsule (#9DB58A) with a small flat crown of fine ridges on top, a few dry stamens under it. The stem slightly bends under the seed head. Keep the stem, its height, its little hairs and both toothed leaves the same, same style, same position and the same bottom end of the stem, only the green is a little paler. Keep the same flat magenta background (#FF00FF), no shadow, no grass, no fallen petals on the ground, no other objects. No face, no eyes, no text. Same image size and same tall portrait shape as the attached picture." | magenta |
| `obj-poppy-seedhead.jpg` | **not the common prompt:** attach `obj-poppy-flower.jpg`: "Edit the attached picture (a red poppy flower on a green stem). All petals have fallen off, no petals at all. At the top of the stem there is only a ripe round poppy seed head: a smooth round capsule, a bit bigger than the flower's center was, in soft grey-green (#A9B98E) turning light straw beige (#D8CBA0) at the top, with a flat star-shaped crown of fine ridges on top and a short neck where it meets the stem. The stem gently bends under the seed head and is a little shorter: the seed head sits about one tenth lower than the flower did. Keep the stem's little hairs and both toothed leaves, same style, same position and the same bottom end of the stem, only the greens are a little paler and drier. Keep the same flat magenta background (#FF00FF), no shadow, no grass, no fallen petals, no other objects. No face, no eyes, no text. Same image size and same tall portrait shape as the attached picture." | magenta |
| `obj-invitation.jpg` | a small folded paper party invitation card tied with a green ribbon and a tiny daisy, front view, no face | magenta |
| **Dragons** | | |
| `obj-dragon-sleeping-1.jpg` | a chubby baby dragon, mint green, curled up asleep with closed eyes and a tiny smile (renamed from `obj-dragon-sleeping` 2026-10-30: baby N sleeps as sleeping N) | magenta |
| `obj-dragon-sleeping-2.jpg` | (plan 83, done 2026-10-30) **attach `obj-dragon-sleeping-1.jpg`**: "redraw the attached sleeping baby dragon in exactly the same drawing style, outline, shading, size, position and exactly the same lying, curled-up sleeping pose with closed eyes and a tiny smile, only change its colour: the body is sky blue (#8EC5F0, darker shade #5E9FD6), the belly a lighter pale blue-cream (#DDEFFB), the tiny wings a slightly darker blue" | magenta |
| `obj-dragon-sleeping-3.jpg` | (done 2026-10-30) as -2 with "sunny yellow (#F6D55C, darker shade #E2B43A), the belly a lighter pale cream-yellow (#FFF2C2), the tiny wings a slightly darker warm yellow. Never green" | magenta |
| `obj-dragon-sleeping-4.jpg` | (done 2026-10-30) as -2 with "a warm soft cherry red (#E0565B, darker shade #B83E45), never orange, never pink or magenta; the belly lighter warm cream-rose (#F7C9B8); the tiny wings a slightly darker red" | magenta |
| **Egg journey** | | |
| **Junkyard** | | |
| `obj-screw.jpg` | a single shiny silver screw lying on its side, no face | magenta |
| `obj-nut.jpg` | a single hexagonal silver nut, front view, no face | magenta |
| `obj-toolbox.jpg` | an open red metal toolbox with a handle, empty, front view, no face | green |
| `obj-manual.jpg` | an open small booklet with simple drawings of a gear and a robot arm, no text, no letters | magenta |
| **Workshop** | | |
| `obj-blueprint.jpg` | a blue sheet of drafting paper with white line drawings of two robot legs and a small antenna, no text, no letters | magenta |
| **Rain** | | |
| `obj-puddle-stone.jpg` | a flat round grey stepping stone in a small rain puddle with a few ripples, seen a little from above | magenta |
| `obj-fog.jpg` | a small soft round puff of light grey fog, calm sleepy face | green |
| **City** | | |
| `obj-timetable.jpg` | a friendly bus stop sign on a post with an empty white board below it, no text, no letters, no numbers | magenta |
| `obj-door-speaker.jpg` | a round metal door speaker with a grille and a small blue light, front view, smiling | magenta |
| **Home** | | |
| `obj-box.jpg` | a closed brown cardboard moving box with tape on top and an empty white label on the front, no text | magenta |
| `obj-photo-frame.jpg` | an empty wooden picture frame standing on a small foot, the inside a flat light cream color | magenta |
| **Garden** | | |
| `obj-seed.jpg` | a single big brown sunflower seed, a tiny green sprout coming out of it, happy face | magenta |
| **Forest path** | | |
| `obj-feather-falling.jpg` | a single soft blue and white feather drifting down at an angle, no face | magenta |
| **Lily lake** | | |
| `obj-frog-singing.jpg` | the small cute green frog sitting with its mouth open in a round "o", singing, eyes closed happily | magenta |
| **Music tree** | | |
| `obj-tree-leaf.jpg` | a single round bright green leaf glowing softly at the edges, no face | magenta |
| `obj-song-sheet.jpg` | a small rolled-open sheet of music paper with a few colorful notes on lines, no text, no letters | magenta |
| **Moonlight ball** | | |
| `obj-leaf-card.jpg` | a big oval leaf used as an invitation card, a tiny firefly sitting on its corner, no text | magenta |
| `obj-dance-step.jpg` | a single round glowing footprint shape in soft gold, seen from above, no face | magenta |

### Activity icons: ui-act-*.jpg (level dots on the map)
One icon per activity, shown small inside the level dot, so it must read at about 32 px:
one bold shape, few details. Replace ACTIVITY with the text from the table and attach
`ui-act-super.jpg` (the crown's bold outline is the one the owner wants on every icon).
```
Cute, soft 2D children's game icon, flat vector style with gentle gradients, a bold thick very dark brown outline (#3B2416) around every shape, as thick and dark as on the attached crown, warm pastel palette, bold simple shapes that stay readable when very small. Copy only the outline thickness and the shading style from the attached picture, not its shape, subject or colors. A single icon: ACTIVITY. Front view, centered, the whole icon visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

| File | ACTIVITY |
|---|---|
| `ui-act-chase.jpg` | a small leaf flying to the right with three short soft speed lines behind it (main game) |
| `ui-act-catch.jpg` | a small simple wooden chair, warm light wood (#E2B27A), a straight back with one cross bar, a square seat and four straight legs, seen from the front and a little from the side, standing still, no face, no eyes, no arms, no cushion; "no floor" after the background line (waiting words; done 2026-10-27) |
| `ui-act-parrot.jpg` | a cute scarlet macaw parrot standing in three-quarter view, red body, cream face patch with a round eye, yellow and black beak a little open, red-yellow-green-blue wings, long colorful tail, grey feet (parrot card on the world, grey until won; the owner's own pick from Gemini) |
| `ui-cert-parrot.jpg` | the same macaw sitting on a branch that curves around it in a round frame, green and colorful leaves and small berries along the branch (Aro's signature on the certificate; the owner's own pick from Gemini) |
| `obj-parrot-flying.jpg` | the card's macaw (attach `ui-act-parrot.jpg` as reference) flying away: side view facing right and a little up, wings spread wide mid flap, long tail streaming, feet tucked in, happy face (the parrot that flies away on the map) |
| `ui-act-parrot-head.jpg` | the card's macaw, only its head in side view facing right, beak open (the parrot node before its round is won; the owner's own pick from Gemini) |
| `obj-parrot-perch.jpg` | a wooden T-perch: one upright post with a round log fixed across its top by two bolts, three-quarter view (the perch in the parrot level, the parrot drawn on its bar; the owner's own pick from Gemini) |
| `ui-act-parrot-perch.jpg` | an empty wooden perch: a round log on two posts (the parrot node after the parrot flew away; the owner's own pick from Gemini) |
| `obj-parrot-perch-short.jpg` | a short wooden T-perch, the same wood as `obj-parrot-perch.jpg` (Aro's perch on the map and on My progress, and the parrot node while its parrot is away; the owner's own pick from Gemini) |
| `cert-src/ui-cert-frame.jpg` | the top-left corner of a certificate frame: a cream band with a dark-brown outline and thin orange inner lines runs right and down to the image edges, a sleeping fox curled in the corner, pairs of small brown paw prints along both arms (the owner's own pick from Gemini). `node scripts/cert-frame.mjs` cuts it into the parts kept in assets-src/cert-src to touch up by hand: `ui-cert-fox.png` (the fox alone, the band's outer edge 88.5 px in from its top and left), `ui-cert-paws.png` (one pair of prints toes up, as wide as the band) and `ui-cert-band.png` (one row of the band, outer edge left), and turns them pixel for pixel into `cert-fox-<corner>.png`, `cert-paws-<side>.png` and `cert-band-<side>.png` (`--turn` turns hand-edited parts again); `npm run assets` keeps those lossless |
| `obj-parrot-flying-2.jpg`, `obj-parrot-flying-3.jpg` | the same flying macaw (attach `obj-parrot-flying.jpg`), only the wings moved: `-2` halfway down, `-3` turned down around the shoulder, tips at belly height; body, head, tail and feet in exactly the same place (wing-beat frames played up, middle, down, middle; `npm run assets` crops all three with one box; see the lesson on animation frames) |
| `ui-act-clean.jpg` | a small closed paper envelope, cream-white paper (#FFF6E0) with a soft brown outline, the triangular flap closed with a little round red heart seal in its middle, strictly front view, not tilted, no face, no eyes (copy; done 2026-10-27) |
| `ui-act-crossroads.jpg` | a wooden signpost: one upright round wooden post (warm light wood #E2B27A with soft grain), on it two arrow boards, the upper one bright red (#E5534B) pointing left, the lower one bright blue (#4A8FE7) pointing right, the boards are empty, strictly front view, symmetrical post, no ground, no grass, no face, no eyes (crossroads; redone 2026-10-31 with the crown's outline) |
| `ui-act-ribbon.jpg` | one long soft red satin ribbon (#E85D5D, lighter #F59A8E on its top side) running diagonally from the lower left up to the upper right at about 45 degrees, with one or two gentle waves along the way, both ends cut in a small V notch, nothing written on it, no bow, no knot, no face, no eyes (ribbon; diagonal so it fills the upright card) |
| `ui-act-transcribe.jpg` | two open books, one behind the other and overlapping: the back book higher up and a little to the left with a blue cover (#5B8DEF) and wider, the front book lower and a little to the right with a green cover (#6CC37A) and narrower, covering the lower part of the back book; cream-white pages (#FFF6E0) with a few short soft grey lines instead of writing; the pair together forms a compact upright shape, taller than wide, front view a little from above, no letters, no pen, no face, no eyes (transcribe; one behind the other so it fits the upright card) |
| `ui-act-listen.jpg` | one round soft human ear seen from the side, warm peach skin color (#F6C9A8) with a soft rose inner curl (#E89A8C), nothing else around it: no sound waves, no curved lines, no marks, no dots next to it, no face, no head (dictation; done 2026-10-27) |
| `ui-act-remember.jpg` | a magician's top hat seen from the front and a little from above, deep purple (#6B4BA8 with lighter #8E6FD0 highlights) with a wide red band (#E5534B) around it, the brim gently curved, three small golden sparkles (#F2C14E) floating just above the hat's open top; no wand, no rabbit, no face, no eyes, strictly symmetrical (secret words; redone 2026-11-04, was a keyhole plate) |
| `ui-act-sticky.jpg` | a small round layered cake (a little dessert), a light sponge (#F6D7A7) with one pink cream layer (#F49AB0) in the middle, covered on top with thick shiny golden caramel glaze (#E8A23A with lighter #FFD27A highlights) that runs down the sides in three fat sticky drips, each ending in a round drop, one red cherry with a short stem on top; seen from the front and a little from above, no plate, no fork, no face, no eyes (sticky finger: a picture of "sticky", not a finger on a key - the owner wants a metaphor; done 2026-11-04) |
| `ui-act-super.jpg` | a small golden crown with three round tips (super-obstacle) |
| `ui-surprise.jpg` | a small closed golden gift box, a cube seen slightly from above in three-quarter view, shiny warm gold (#F2C14E with lighter #FFE08A highlights and deeper #D99A2B shading), tied with a cream-white ribbon (#FFF6E0) crossing over the lid on all sides and a big round soft bow on top, two tiny sparkles near the corner. No face, no eyes (a level with a surprise the parent announced; done 2026-10-27) |
| `ui-surprise-open.jpg` | a small opened golden gift box, the same gold and ribbon; the lid with the round soft bow is lifted off and tilted, floating just above the right back corner; the box is empty inside with a soft warm cream glow (#FFF3C4) and a few small golden stars and sparkles rising out of it. No face, no eyes; "nothing pink around the glow" after the background line (the surprises won in a world, top left of its island; done 2026-10-27) |

## 10. Target range (training the weak letters)

Plan: `.todo/.done/55-accuracy-target-practice.md`. One range for every world, on the world's
own background; the game draws every object in code until its picture is there. Tapko throws
one of the projectiles at the target through soap-bubble rings. Each projectile is seen from
the side, alone and readable at a small size (it flies at about 46 px).

### Game objects (section 4 prompt)
| File | OBJECT | BG | Status |
|---|---|---|---|
| `obj-aim-target.jpg` | a round archery target made of soft red and cream rings with a golden center, painted on a wooden board, front view, no stand, no face | green | done 2026-10-23 |
| `obj-aim-ring.jpg` | a tall oval soap-bubble ring floating upright, thin shimmering rainbow edge in pink, light blue and mint, empty and see-through in the middle, front view | green | done 2026-10-23 |
| `obj-aim-pebble.jpg` | a single small smooth round grey pebble, no face | magenta | done 2026-10-23 |
| `obj-aim-screw.jpg` | one big chunky screw standing upright, a round dome head with a single straight slot on top, below it a short thick shank with a few clear diagonal thread ridges and a blunt rounded tip. Blue-grey steel colors: base #8FA3B8, lighter highlights #C9D6E3 on the left, darker shade #5E7286 on the right. No face, no eyes, no arms, no legs. Strictly front view, symmetrical, not tilted | magenta | done 2026-10-24 ("silver" gave no picture on 2026-10-23) |
| `obj-aim-fly.jpg` | a funny little housefly with big red eyes and clear wings, flying, side view, happy | magenta | done 2026-10-23 |
| `obj-aim-tomato.jpg` | a single round ripe red tomato with a small green leafy top, no face | magenta | done 2026-10-23 |
| `obj-aim-arrow.jpg` | a short wooden toy arrow with a soft rounded grey tip and red feathers, pointing to the right, no face | magenta | done 2026-10-23 |
| `obj-aim-duck.jpg` | a yellow rubber bath duck with an orange beak, side view facing right, happy | magenta | done 2026-10-23 |
| `obj-aim-sock.jpg` | a single light blue striped child's sock with a white cuff, side view, no face | magenta | done 2026-10-23 |

### Things to throw (plan `.todo/62-range-shouts-and-throws.md`, section 4 prompt)
Each prompt also carried, after OBJECT: "No face, no eyes, no arms, no legs. A bold, simple shape
with a clear outline, so it is easy to recognise as a tiny icon of about 46 pixels." (the chick
and the fish keep their faces). Checked at 46 px on a light and a dark band before use. The range never shows a face, even where the same object has one in a story (2026-11-06: own `obj-aim-*` pictures for those).

| File | OBJECT | BG | Status |
|---|---|---|---|
| `obj-aim-egg.jpg` | a smooth hen's egg in warm cream #FFF3DC with a light-beige shade #EBD9B8 lower right and one small white shine, slightly tilted, no face | magenta | done 2026-10-24 |
| `obj-aim-egg-cracked.jpg` | **attach `obj-aim-egg.jpg`**, "redraw the attached egg ... hatching: a bold zigzag crack around its middle, the top half lifted a little, a tiny orange beak #F59A2E peeks out", no face | magenta | done 2026-10-24 |
| `obj-aim-chick.jpg` | a tiny round fluffy chick, sunny yellow #FFD84D with a lighter belly, small orange beak, two tiny orange feet, both little wings spread up and flapping, big round eyes, rosy cheeks, side view facing right | magenta | done 2026-10-24 |
| `obj-aim-fried-egg.jpg` | one fried egg seen straight from above: white #FFFDF6 with a wavy blobby edge, one round glossy yolk #FFC23D, no pan, no face | magenta | done 2026-10-24 |
| `obj-aim-clock.jpg` | a classic round twin-bell alarm clock, red #E8504A body, white dial with dots instead of numbers, two golden bells #F2C14E, two little feet, no face, strictly front view | magenta | done 2026-10-24 |
| `obj-aim-cactus.jpg` | a small round chubby cactus #6DBE6A with lighter ribs, tufts of pale cream spines, one pink flower #F77FB0 on top, in a terracotta pot #D97A4A, no face | magenta | done 2026-10-24 |
| `obj-aim-toilet-paper.jpg` | one roll of toilet paper on its side, the cardboard tube hole #C89B6B visible on the left, white with light grey shade, a short loose curled end on the right, no face | magenta | done 2026-10-24 |
| `obj-aim-candle.jpg` | a short thick candle, pastel yellow wax #FBE7A1, one wax drip, a small calm flame #F7A23B with no glow around it, no holder, no face | magenta | done 2026-10-24 |
| `obj-aim-cheese.jpg` | one chunky wedge of cheese #F9D35B with a lighter top #FCE38A, big round holes, two holes cut into the edges, no face | magenta | done 2026-10-24 |
| `obj-aim-boomerang.jpg` | a classic wooden boomerang, wide V with rounded arms, wood #D4955A, rows of cream and teal dots, flat, seen from above, no face | magenta | done 2026-10-24 |
| `obj-aim-ice.jpg` | one ice cube with rounded corners, a little from above: faces #D6F1FC, #A9DDF3, #86C9E8 (solid, never pink), two white shine strokes, a tiny drop, no face | magenta | done 2026-10-24 |
| `obj-aim-donut.jpg` | one donut, front and a little from above, dough #E0A867, pink frosting #F59AB8 with a drip edge, colorful sprinkles; the hole a clean flat oval, no inner wall, no face | magenta | done 2026-10-24 |
| `obj-aim-bulb.jpg` | a pear-shaped light bulb, switched off: solid pale grey-blue glass #DCE6EE (not see-through, not pink), thin filament, blue-grey steel base #8FA3B8/#C9D6E3, no glow, no face, strictly front view | magenta | done 2026-10-24 |
| `obj-aim-bulb-lit.jpg` | **attach `obj-aim-bulb.jpg`**, "the same bulb switched on: glass filled with warm light yellow #FFE680, pale #FFF6C2 around an orange filament; the light stays inside the glass, no glow outside" | magenta | done 2026-10-24 |
| `obj-aim-teeth.jpg` | a wind-up toy of chattering teeth, side view facing right: soft pink gums #F4A3B5, big rounded white teeth (no fangs), a golden key #F2C14E at the back, two little orange feet, no eyes, no tongue | magenta | done 2026-10-24 |
| `obj-aim-diaper.jpg` | one clean puffy baby diaper from the front, white with grey-blue shade, light-blue side tabs #9FD3F5, tiny pastel stars, no baby, strictly front view | magenta | done 2026-10-24 |
| `obj-aim-snack.jpg` | an old squashed sandwich half wrapped in crumpled paper #E5D0A8, bread #F2D29B, lettuce and cheese peeking out, one bite missing, one small fuzzy green mould spot #9CC46B, never disgusting, no face | magenta | done 2026-10-24 |
| `obj-aim-bottle.jpg` | a chubby baby bottle filled with white milk #FFFDF6 (solid), light-blue screw ring #8CCBF0, cream teat #F5DDB8, measuring dashes without numbers, strictly front view | magenta | done 2026-10-24 |
| `obj-aim-pacifier.jpg` | a baby pacifier facing right: round pastel-pink shield #F7A8C4 with two holes, cream teat #F5DDB8, pink ring handle #F48FB1 | green | done 2026-10-24 |
| `obj-aim-chalk.jpg` | one thick short stick of white chalk lying diagonally, white #FAFAF7 with grey shade #D9DCE0, the right end worn round, a small puff of chalk dust, no blackboard | magenta | done 2026-10-24 |
| `obj-aim-whistle.jpg` | a sports referee whistle, mouthpiece to the right, blue-grey steel #8FA3B8/#C9D6E3/#5E7286 ("silver" fails), a short red cord #E5534B | magenta | done 2026-10-24 |
| `obj-aim-pingpong.jpg` | one ping-pong ball, a perfect circle, white with a light grey-blue shade #DCE3EA, one shine, no paddle | magenta | done 2026-10-24 |
| `obj-aim-bowling.jpg` | one glossy bowling ball, deep blue #2F5DA8 with lighter #5B86CF, a big shine, three clean round finger holes #1B2F57 with no inner wall, no pins | magenta | done 2026-10-24 |
| `obj-aim-hockey.jpg` | a short chunky wooden ice hockey stick lying diagonally, blade bent right like an L, light wood #E3B47A, dark tape #3E4A5C on the blade, no puck | magenta | done 2026-10-24 |
| `obj-aim-magnet.jpg` | a thick horseshoe magnet standing like a U, red #E5534B with shine, blue-grey steel tips #C9D6E3, no chain, strictly front view | green | done 2026-10-24 |
| `obj-aim-wand.jpg` | a fairy wand lying diagonally, a chunky golden star #F6C945 on top, lavender stick #B79CE8 with a white spiral stripe, three small outlined sparkles, no glow | magenta | done 2026-10-24 |
| `obj-aim-pillow.jpg` | one soft puffy rectangular bed pillow from the front, slightly tilted, four puffed corners, white with grey-blue shading, one wide light-blue stripe #8CCBF0 | magenta | done 2026-10-24 |
| `obj-aim-chicken.jpg` | a classic funny rubber chicken toy, side view facing right, body stretched out: long thin neck, wide open orange beak, red comb, closed eyes as curved lines, yellow body #F9D84A, thin orange legs | magenta | done 2026-10-24 |
| `obj-aim-water-balloon.jpg` | one round water balloon, solid sky-blue rubber #5FB7EA with a lighter area and a big shine (never pink), a small knot on top, three outlined drops #BFE6F7 | magenta | done 2026-10-24 |
| `obj-aim-banana.jpg` | one whole ripe banana curved like a smile, yellow #F9D84A with lighter top and darker underside, brown stem and tip, unpeeled | magenta | done 2026-10-24 |
| `obj-aim-wrench.jpg` | one chunky adjustable wrench lying diagonally, oval hole in the handle, open C jaw, ridged wheel, blue-grey steel #8FA3B8/#C9D6E3/#5E7286 | magenta | done 2026-10-24 |
| `obj-aim-toast.jpg` | one slice of toast from the front, rounded puffy top, golden middle #EBB563, darker crust #B9772F, a small pat of butter #FFE9A0, strictly front view | magenta | done 2026-10-24 |
| `obj-aim-pinecone.jpg` | (redone 2026-11-06, the old one stood on its tip) only "one ordinary brown pine cone, as it really looks. No face, no eyes, no needles, no branch", without the 46 px line | magenta | done 2026-11-06 |
| `obj-aim-fish.jpg` | a small round chubby friendly fish facing right, orange #F7934C with a lighter belly, fan tail #FFB070, one big eye, rosy cheek, small smile, no water | magenta | done 2026-10-24 |
| `obj-aim-crown.jpg` | a small chunky golden crown from the front, three rounded points with balls, gold #F6C945/#FFE58A/#D9A520, three pink gems #F48FB1, strictly front view (the wardrobe's `acc-crown` is too small at 46 px) | magenta | done 2026-10-24 |
| `obj-aim-crystal.jpg` | (plan 84, the owner's wish: one crystal, not the planet's three points) **attach `obj-aim-crown.jpg`** for the style: one single six-sided gem crystal, upright and slightly tilted, pointed at both ends like a double-terminated quartz, no side points, no base, no rock; translucent ruby red #D7263D, facets #FF5A6E, edges #8E1426, one soft white highlight; no face, no glow | magenta | done 2026-10-30 |
| `obj-aim-mouse.jpg` | (the owner's wish, 2026-10-30) **attach `obj-aim-crown.jpg`** for the style: one classic wired computer mouse seen from above at a slight angle, rounded, light grey-white plastic #E9ECF0 (shade #C5CBD3), two buttons and a small dark scroll wheel #4A5260, a short curly grey cable out of its front end; no face, no eyes, no hand | magenta | done 2026-10-30 |
| `obj-aim-compass.jpg` | (plan 86, the hero's journey's picture and a range thing; redone 2026-10-31: the ring on top and the upright needle read as a stopwatch from afar) **attach `obj-aim-crown.jpg`** for the style, "a completely different object": a round flat brass compass strictly from the front, a chunky golden case #E2B33C (light #F6D77A, shade #B5862A) with NO ring, loop, button or crown on top, a cream face #FFF6DC filled by a compass rose (four long brown #B07A45 points to the sides of the world, four shorter between them), one big wide diamond needle turned 45 degrees, red #E5534B to the upper right, grey #9AA5B1 to the lower left, a dark-brown pin; "clearly a compass, not a watch or stopwatch even when small"; no letters, no numbers, no face, no clock hands | magenta | done 2026-10-31 |
| `obj-aim-poppy.jpg` | (2026-11-06, the owner's pick after four tries) without the word seed, only the short prompt: "one small grain like a black peppercorn, a slightly irregular little ball, dark slate blue-grey. Its surface is wrinkled into a honeycomb shape: only about 7 to 10 big shallow cells cover the whole visible surface, divided by soft lighter ridges. One small white shine. No face, no eyes". "Poppy seed" came as a bean; a fine net of tiny cells looked like a honeycomb. The game draws it at 35 % | magenta | done 2026-11-06 |
| `obj-aim-map.jpg` | an old pirate treasure map, aged parchment #EED9A8 with darker torn and curled edges, rolled up a little at both ends, slightly tilted: an island, a dashed red path to a big red X, a tiny compass rose of lines; no letters, no numbers, no skull | magenta | done 2026-11-06 |
| `obj-aim-snowflake.jpg` | one big six-fold snowflake, strictly front view, chunky rounded arms with short side branches, icy white with sky-blue #BFE6F7 shading and a soft blue #7FC3E8 outline, no glow | magenta | done 2026-11-06 |
| `obj-aim-drop.jpg` | (the melted snowflake) one big teardrop of water, strictly front view, solid sky-blue #5FB7EA with a lighter area and a big white shine, never pink, never see-through, no splash | magenta | done 2026-11-06 |
| `obj-aim-battery.jpg` | (the range's own; `obj-battery` keeps its face for the robot story) one ordinary AA battery on its side, green #4FB477 body, silver-grey caps, a white plus sign and nothing else; no charge bars, no meter | magenta | done 2026-11-06 |
| `obj-aim-gear.jpg` | (the range's own) one flat golden brass gear #E2B33C, strictly front view, twelve rounded teeth, a hole in the middle and four around it | magenta | done 2026-11-06 |
| `obj-aim-note.jpg` | (the range's own) one glossy deep violet #6B4FC8 eighth note, no glow, no staff lines | magenta | done 2026-11-06 |
| `obj-aim-rose.jpg` | (the fairy world's range thing, before a flower with a face) one red garden rose #E5484D with a short stem, two leaves and a thorn | magenta | done 2026-11-06 |
| `obj-aim-umbrella.jpg` | (the range's own) one big open red #E5534B umbrella from the side, a wooden J handle, no hand, no rain | green | done 2026-11-06 |
| `obj-aim-spring.jpg` | (the range's own) one big coiled blue-grey steel spring #8FA3B8 standing upright, about seven loops | magenta | done 2026-11-06 |
| `obj-aim-asteroid.jpg` | (the range's own) one small lumpy grey-brown #8E7F72 space rock with soft round craters, no fire trail | magenta | done 2026-11-06 |
| `obj-aim-antler.jpg` | (2026-11-09, the egg mountain's range thing instead of the nest, too detailed to throw) one single deer antler, one half of a pair, a long curved main beam and five short rounded points, light bone brown #C9A57A, cream tips #EFDDBE, darker #8C6A45 base with a knobbly ring, lying diagonally; no skull, no deer | magenta | done 2026-11-09 |
| `obj-aim-beethoven.jpg` | (2026-11-09, the owner's wish) a small classic bronze bust of Ludwig van Beethoven on a short round pedestal, three-quarter view facing right, wild wavy hair, stern sculpted face, a scarf; bronze #B87333, highlights #E0A86A, shade #7A4A22, never green or teal (a green patina on a green background was keyed out of its folds, see the lessons); a statue, so no cartoon eyes and no other colours | magenta | done 2026-11-09 |
| `obj-aim-planet.jpg` | (the range's own, instead of the five pastel planets) one small planet like the Earth, blue oceans, green and sandy continents, white cloud swirls, a thin cream ring in front at the bottom and behind at the top | magenta | done 2026-11-06 |

## 11. End cards (plan `.todo/85-one-end-card.md`)

One picture on the left of each end card, read at about 128 px. The section 9 activity icon
prompt with `Generate an image: <title>` first; replace ACTIVITY with the text from the table.
All made 2026-10-30 and picked by the owner (a crown on the target, dumbbells, a computer and a
kite were tried and turned down).

| File | ACTIVITY |
|---|---|
| `ui-end-practice.jpg` | a small chubby old-style typewriter, simplified and compact, almost as tall as it is wide (not a wide machine): a rounded body in soft peach orange (#FFB07A) with a lighter top, a short roller on top with one blank white sheet sticking up, and in front only two short rows of four round cream keys each (#FFF3DC); front and a little from above, symmetrical; no face; the paper is blank: no text, no lines (Písanie hotové) |
| `ui-end-stay.jpg` | one big cozy puffy armchair, front and a little from the side: soft rounded back and two round fat armrests in calm sage green (#9CCB9A) with a lighter top, a thick seat cushion, one small round cream pillow (#FFF3DC) in the corner, four short wooden feet (#C89B6B); empty, nobody sits in it; no face; "no floor, no rug, no lamp" after the background line (Oddychové kolo hotové) |
| `ui-end-range.jpg` | a round archery target face, strictly front view, symmetrical: only the round rings, NO wooden board, NO square frame: soft red (#E5534B), cream (#FFFDF6), soft red, cream and a golden yellow center (#F5C542); on a simple easel of three thin light wooden legs (#D4A26A); two big round cartoon eyes peek out from behind the top rim, white ovals with dark brown pupils looking up, only their upper halves above the rim, happy and curious; no mouth, no arms, no arrows (Strelnica hotová) |
| `ui-end-range-record.jpg` | **attach `ui-end-range.jpg`**: in front a big chunky golden winner's cup (round bowl, two round handles, short stem, square stepped base; gold #F6C945, highlights #FFE58A, shading #D9A520; plain, no star, no number), behind it a little to the right and partly hidden the target from the attached picture as the same character, its eyes peeking over the rim and looking down sideways at the cup, curious and admiring; two tiny outlined sparkles, no glow (Nový svetový rekord) |
| `ui-end-freetype.jpg` | one classic paper pinwheel toy on a stick: four curled paper blades around a round center pin in peach orange (#FFB07A), light sky blue (#8CCBF0), soft mint (#8FD3B6) and light yellow (#FFE08A), each with a lighter folded side, a small round cream pin head (#FFF3DC), a straight thin light wooden stick (#D4A26A) ending well above the bottom edge; strictly front view, upright; no hand, no wind lines; nothing touches any edge (Koniec voľného písania) |
| `ui-end-break.jpg` | one classic football (soccer ball), a perfect circle, white panels (#FFFDF6) with light grey-blue shading (#DCE3EA) and dark-brown pentagon patches (#5A3D2B), one small white shine upper left; no grass, no goal, no motion lines; strictly front view (Rozcvička hotová; not shown since 2026-11-07, the warm-up has no end card) |
| `ui-end-task.jpg` | a chubby child's school backpack standing upright, strictly front view, symmetrical: rounded body in warm sky blue (#7FC4EA) with a lighter top, a big front flap with one golden buckle (#F2C14E), a small front pocket, a short carry handle, the shoulder straps just peeking out at the sides; a green pencil and a ruler stick out a little from the top; no face (Úloha splnená) |

## 12. Hands on the keyboard (made in the hand tool, not by Gemini)

The outline hands over the on-screen keyboard come from the **hand tool**, a local page of the dev server:
`npm run dev`, then open `/tools/hand-poser/`, or in Tapko's "Len chcem písať" press the paw button (dev server
only), which opens the pose of the key typed last. It draws one home outline per hand (middle lines with a width,
drawn in Inkscape: `tools/hand-poser/drawing/lx2.svg`, `rx2.svg`) over Tapko's own keyboard and moves it by rules:
- the base corrections of the home position (each finger bent or moved, its middle sideways);
- the row a hand types on (bottom, home, top, digit row) moves the whole hand, curls the fingers and moves the thumb;
- each key pose's own hand tilt and finger moves.

Each point of the outline moves with one finger only (the axes are fitted to the outline; "priradiť body" gives
points to a finger by hand, "body prstov" shows them). The brush moves the outline's points; an outline can be
copied as SVG, edited elsewhere and loaded back. "Uložiť" (Ctrl+S) writes `tools/hand-poser/rows.json` (the
settings), `tools/hand-poser/outline/<side>.svg` (the source outline) and `public/hands/<side>/<name>.svg` (home and
every key pose) with `public/hands/index.json`, and the lines' look into `src/ui/hand-style.ts` ("Dizajn rúk");
"Použiť farby v Ťapkovi" writes the palette being tried into `src/ui/finger-colors.ts`. An open Tapko shows them at
once; commit them.

On another computer: `npm install`, `npm run dev`, open `/tools/hand-poser/`; the tool reads
`tools/hand-poser/rows.json` and `outline/<side>.svg` from the repository and saving makes the same files again. To
start over from the drawings, "Načítať ľavý zo SVG" / "Načítať pravý zo SVG" take `tools/hand-poser/drawing/lx2.svg` and
`rx2.svg` (their `lhand` layer is the outline, `support` the thin lines; millimetres are converted).

Names: a pose is named by the hand (`l`, `r`), the finger (1 the thumb .. 5 the little finger) and the key it presses,
the key by two characters: two letters for a named key (`tb`, `cp`, `ls`, `rs`, `sp`, `bk`, Enter `en` flat
(English) and `el` L-shaped (Slovak, further out), and `lc`, `rc`,
`lw`, `rw`, `la`, `ra`, `mn`), else a key of the row's plain range with `0` (`a0`, `f0`, `20`; ranges `1`-`0`,
`q`-`p`, `a`-`l`, `z`-`m`, English letters) or the range's end and how many keys further out (`11` left of 1, `01`
right of 0, `p1` right of P, `l1` = ô). So `l2f0` is the left index on F, `r1sr` the right thumb on the space bar (its halves `sl`, `sr`; `sp` the whole key),
`l420` the left ring finger on 2 (standard) and `l520` the left little finger on 2 (ergonomic: the digit row moved
one finger over, see `src/keyboard/fingers.ts`; the tool's "Prsty" switch). A click on a key in the tool opens or
adds its pose. `home` is the home position, `rest` the hands lying beside the keyboard when a level starts, with the
steps `rest1`...`rest4` between them, which the tool makes on the way from beside the keyboard to `home`; Tapko glides
through them. A key without its own outline shows `home`.

### The owner's rules for the hands (keep every new pose to them)

Look
- Lines only, nothing inside: every key shows through. The line is grey, not black, thin. The wrists
  fade out below the keyboard.
- Nails: a thin line of the nail bed (the cuticle's arc and the sides), seen where the finger shows it from above;
  filled softly in the finger's colour only where the tool's nail switches say (by default only beside the keyboard). Thin lighter lines also mark
  the folds of skin over the joints (three over the middle joint, two over the last, two on the thumb); the knuckles are
  low arc over each knuckle.
- The lines' widths, colours and transparency (typing, and beside the keyboard) are set in the tool's "Dizajn rúk".
- The palm is short (wrist to knuckles), the back of the hand short; the palms and
  wrists are lifted about 3 cm above the keys, so every finger slopes down and looks bent; the wrist is wider, mostly on the
  thumb's side.
- The ring and little fingers are not thin, every finger's base at the palm neither; the gaps between the fingers
  end in a sharp V, not a soft U (between the thumb and the index the cut stays short); the thumb (two bones) lies nearly straight, its outer side smooth, not broken at its joints, its first bone not narrow in the middle.
- The key being typed is always readable: its letter is drawn over the hands (white, a thin solid
  outline in the finger's colour, on a small disc half a key wide that fades from its centre); the
  key's own letter underneath is hidden, never two letters.
- Adult hands, real proportions; the size the owner set (2026-11-02).
- The hands are never square to the keyboard: the elbows are wide, so the left hand points up and to
  the right, the right hand up and to the left (about 18 degrees).
- The thumb's outer side runs in one straight line from the wrist to its tip (no dip at its root); the
  thumb points up towards the keys and its pad turns in at the end, it does not run on in the hand's line.
- The knuckles' arcs sit high on the knuckle bumps, fainter on the middle and ring fingers.
- The thumb lies close to the hand, its tip on the space bar; the thumb's root at the wrist must not
  stick out from the back of the hand.
- Home position: the fingertips in the middle of their keys, all eight in one row (the little fingers
  only slightly tucked); the ring fingers' middle joints lie against the middle fingers. The hand is
  fairly flat, lifted only a little, the fingers only gently curled, so the cuts between the fingers go deep.
- Rest (a level's start): the hands lie beside the keyboard, less slanted, fingers flat enough that
  the nails show; they come onto the home position through the steps between.

Motion: a pose is the outline of a real hand seen from above typing that key, the whole hand keeping
its physical shape; never "one moved finger" or "one stretched finger".
- A home key pressed: the finger bends a little, its tip AND its middle joint go a little towards the
  palm; the little and ring fingers also come a little towards the index, the ring finger as if
  sliding under the middle finger; the other fingers do not deform. The index pressed brings the
  middle finger very slightly closer. Mirrored on the right hand.
- The space bar: only the thumb of the hand that did NOT type the last key presses (it goes a little lower).
- A reach to the top letter row (R, T, U): the index stretches onto the key (its tip on the key, not
  beyond it); the middle finger bends a little after it, the ring finger hardly, the little finger
  not at all; the thumb follows a little up and towards the reach; the whole hand moves up a hair.
- T (the index far up and to the side): the other fingers of that hand curl so far that their last
  joints tuck under the middle ones and are hardly seen from above.
- The digit row (ť, 5): there the whole back of the hand moves up; a top-row reach must not look like it.
- Ergonomic fingering (the owner's way): ľ by the little finger, the left side of the digit row moved one finger
  over up to ž by the left index, ý á by the right index, í by the middle finger and so on; the top rows are reached
  with a small move of the whole hand from the wrist.
- The bottom row (M): the finger bends, its nail is not visible, its tip on the lower part of the key
  (not below it, not on the space bar).
- The hands rest beside the keyboard when a level starts and glide onto the home position two seconds
  later (about a second and a half; quickly with the space bar), in free typing a second after it starts;
  in a pause they glide aside and come back when play goes on; no parking when idle.
  They fade with the on-screen keyboard. In free typing they show the key typed at the moment it is
  typed, not the next one.

## 13. Rytmus (the beat game, `.specify/game/rhythm.md`)

The basket the child moves, the letter clouds the letters fall from, and the rhythm notes a great
round earns. The game draws every letter itself (in front of its cloud, falling), so the clouds stay
empty and the basket's letters are only toy shapes.

### Game objects (section 4 prompt, without its "friendly faces" sentence; "strictly front view, not tilted" instead of "side view facing right")
The basket is one empty picture: the full basket first, then a follow-up in its chat that removes
all letters ("Same picture, exactly the same basket at exactly the same size and position. Only
remove the letters: the basket is empty, its empty inside shows."). The basket is flat and shallow
like a low tray, with no handles. The game keeps only its front, so a letter drops behind the rim:
`.old/obj-rhythm-basket-with-back.jpg` is the empty picture; its back rim and inside were painted magenta
(a rough cut along the lower arc of the inner opening), and a new chat with that cut picture attached
finished the edge: "Redraw the attached picture exactly the same ... its upper edge was cut off roughly,
so finish it nicely: a clean, smooth, rounded upper edge ... round off the two ends of the rim. Do NOT
add anything behind or above it." The rough cut alone looked bad in the game. A lower point of view,
straight at the rim, would hide the back by itself (an idea for a later redraw). The game's basket is narrow (a little wider than a lane): a new chat with the front-only basket attached, "much NARROWER and a little deeper ... like a small round basket" (Gemini drew the back again), then a follow-up "remove the back half of the rim and the dark inside ... round off its two ends". Letters sunk into the basket (only their upper half showing) could
not be drawn: five tries of a redraw with the full basket attached only changed the colours.
`obj-rhythm-basket-full` (the end card) is a new chat with the empty basket attached: the same basket
full of a heap of letters.
The three clouds are compact, so a cloud drawn only a little wider than its lane stays off the
lanes beside it; the game draws them mirrored too, for more variety.

| File | OBJECT | BG |
|---|---|---|
| `obj-rhythm-basket.jpg` | made from the full basket: ONE flat, shallow, wide woven wicker basket shaped like a low tray, warm honey wicker (#D9A35B, lighter #F0C985, darker #B07B3A), a thick rolled rim, NO handles at all, seen from the front and a little from above. In it lie about ten chunky wooden toy letters, each in its own color: orange #E69F00, sky blue #56B4E9, green #009E73, yellow #F0C419, blue #0072B2, red-orange #D55E00, pink #CC79A7, lime #8FBC3A; they stand loosely side by side, their tops peeking a little over the rim, all inside the basket's width. The basket symmetrical, not tilted; NO face, no eyes, no arms, no legs; nothing else: no fruit, no cloth, no ground (also the end card's picture) | magenta |
| `obj-rhythm-cloud-1.jpg` | ONE single compact fluffy cartoon cloud, only about one and a half times as wide as it is tall, three round puffs with the middle one highest, soft white (#FFFFFF) with light blue-grey shading underneath (#DCE6F2), a soft dark-brown outline, a gently rounded flat bottom; NO face, no eyes, no rain, no sun; NOTHING else | magenta |
| `obj-rhythm-cloud-2.jpg` | the same, one big round puff in the middle with one small puff on each side | magenta |
| `obj-rhythm-cloud-3.jpg` | the same, two round puffs, a bigger one on the left and a smaller one on the right | magenta |

### ui-treble-clef.jpg (the golden treble clef before My rhythm's notes; 2026-11-08, first try)
Attach `ui-note-quarter.jpg` for the style.
```
Generate an image: a single music treble clef (G clef), chunky, rounded and friendly, like a sticker reward for children, in the same style as the attached music note. Warm deep gold color (#D9A520 with lighter #F2C14E highlights and darker #A8740F shading), not pale yellow, so it reads well on a light background, with a soft dark-brown outline. Strictly front view, upright, centered, filling about 75 % of the image height. Cute, soft 2D children's storybook illustration, flat vector style with gentle gradients. No face, no eyes, no staff lines, no notes, no text, no sparkles, nothing else. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no floor, no shadow. Square image.
```

### Rhythm notes (one picture each, magenta)
"Generate an image: a single music note, NOTE, chunky, rounded and friendly, like a sticker reward
for children. Strictly front view, centered, filling about 70 % of the image height. Same style:
cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, soft
dark-brown outlines. No face, no eyes, no staff lines, no text, no sparkles, nothing else.
Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no floor, no
shadow. Square image." The game turns each note by its own angle.

| File | NOTE |
|---|---|
| `ui-note-half.jpg` | a HALF NOTE (minim): a hollow oval note head tilted a little, with a white inside, a straight upright stem on its right side, no flag; warm orange (#E69F00), highlight #F6C66B |
| `ui-note-quarter.jpg` | a QUARTER NOTE (crotchet): a filled solid oval note head tilted a little, a straight upright stem on its right side, no flag; blue (#0072B2), highlight #5FA8D9 |
| `ui-note-eighth.jpg` | an EIGHTH NOTE (quaver): a filled oval head, an upright stem and one curved flag at its top; green (#009E73), highlight #5CC9A7 |
| `ui-note-beamed.jpg` | TWO BEAMED EIGHTH NOTES: two filled oval heads side by side, each with an upright stem, the stems' tops joined by one thick straight beam; red-orange (#D55E00), highlight #F09A5C |

### Icon (section 9 icon prompt, attach `ui-act-super.jpg`)
| File | ACTIVITY |
|---|---|
| `ui-act-rhythm.jpg` | one small toy drum with two wooden drumsticks crossed on top of it, as a toy drum really looks; no face, no eyes (the Rytmus node on the map and its game on the help page; redone 2026-11-08: the owner wanted a drum instead of the metronome; the plain wording came out right at once) |
