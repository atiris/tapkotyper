# Gemini prompts for TapkoTyper assets

Images and background music for the game. Sound effects stay synthesized in code.

## How to use

1. Copy one prompt (the whole code block) into Gemini.
2. Save the result into this folder (`assets-src/`) with **exactly the file name** in the
   heading, for example `assets-src/tapko-fox-idle.jpg`. Images are delivered as jpg;
   music as mp3, wav or m4a.
3. Run `npm run assets` (or ask Claude to) and commit `public/assets/`. It removes the flat
   background, trims (except companions and outfits, which keep their square), resizes
   and writes small web files to `public/assets/`; the game uses each file that exists.
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
- A motion word on an object ("bouncing", "running") makes Gemini add arms and legs. Say
  "no arms, no legs" when the object should stay an object.
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
  sky, hills and a camp behind the pieces (rescue mid and near). Leave the sky and hill colors
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
- A sun with rays got uneven rays; for a calm sun ask for "a smooth perfect circle, no rays".
- Pieces the page animates on their own (sun, clouds, moon, stars) are one picture each. A
  picture with pieces that do not touch can be cut apart locally (the moon and its stars).
- A short sprite prompt ("a butterfly with pink wings and round spots") gives a plain, simple
  picture. For a richer one describe the details (veins, cells, edge band, eye-spots, colors
  in hex). Do not attach an older sprite as the model: the new one then barely differs.
- "Silver" again failed (no picture); the screw worked with "blue-grey steel" hex shades and
  "strictly front view, symmetrical, no face".
- Small throwables (46 px): "a bold, simple shape with a clear outline, easy to recognise as a
  tiny icon of about 46 pixels" plus hex colors gave 36 of 36 clean pictures on the first try.
  A second state of a thing (a cracked egg, a lit bulb) kept its size and outline when the
  first picture was attached with "redraw the attached ... in exactly the same style, size,
  position" and only the change named.

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

Every prompt is one self-contained text: paste the world's block from "World style" below in place of `WORLD STYLE`; never attach another picture.

Each world needs 3 layers for a gentle parallax effect: `far` (full picture, 16:9) and
`mid` and `near` (a close-up strip, 21:9). The far layer repeats horizontally, so its sky
must be even: no sun, no moon, no single big planet (on a wide screen it would be seen
twice). `mid` and `near` ask for big pieces standing on a low ground band along the bottom
edge, with flat magenta everywhere above and between them (a taller ground area turned
into an empty plane behind the pieces). `npm run assets` cuts the strip from the top of
the tallest piece down, shrinks it to the target height in the table, repeats it across
the width and places it at the bottom. Older 16:9 `mid`/`near` files with the layer
already in the lower part still work as they are.

### Common prompt for `*-far.jpg` (replace SCENE and WORLD STYLE)
```
Cute, soft 2D children's storybook illustration, flat vector style with gentle gradients, rounded friendly shapes, warm pastel palette, calm and peaceful mood, suitable for children and young teens aged 10 to 15. No text, no letters, no watermark, no characters, no animals.

WORLD STYLE.

Wide game background, landscape 16:9: SCENE. The sky is a small part of the image (about the top fifth); most of the picture is scenery. Rich and inviting for young teens, not primitive: several layers of depth and small details to discover (paths, little buildings, plants, rocks, water), but soft colors and low contrast so that big letters can be read on top of it. The left and right edges should continue smoothly so the image can repeat horizontally. No sun, no moon and no single big object in the sky: the image repeats horizontally, so the sky must be even (soft clouds or gradient only).
```

### Common prompt for `*-mid.jpg` and `*-near.jpg` (replace LAYER and WORLD STYLE)
```
WORLD STYLE. Ultra-wide panoramic image, 21:9, on a flat solid pure magenta (#FF00FF) background. Along the bottom edge a low band of ground in the ground color of the world, about the lowest fifth of the image. Standing on that ground band: LAYER, 6 to 12 large whole pieces of different kinds and shapes that overlap a little, no tiny pieces, soft muted colors, each piece with a few interesting details (texture, a small flower, a stone, a crack) so the strip is never just a plain hill or a row of grass. The pieces reach up to different heights (the tallest almost to the top edge), so their tops form an uneven silhouette, never a straight or flat top edge. Between and above the pieces there is only the flat magenta: no ground, no wall, no sky, no distant objects, no silhouettes in the background, nothing behind the pieces except magenta. Strong contrast: pieces clearly darker or more saturated than the ground band. Every piece appears only once: do not repeat or copy any part of the image inside it. The left and right edges continue seamlessly into each other so the strip can repeat side by side. No white or light outline, halo or sticker border around the pieces: their dark outlines meet the magenta directly. No characters, no text. Flat side view like a 2D platformer, no perspective and no vanishing point: the ground band is a straight horizontal band seen from the side, nothing runs toward a point in the distance.
```
The height column is where the script places the strip (part of the screen height,
counted from the bottom); it lives in `STRIP_HEIGHT` in `scripts/assets.mjs`.

| File | SCENE / LAYER | Height | Status |
|---|---|---|---|
| `bg-meadow-far.jpg` | a training meadow in soft daylight with soft blue sky, a few fluffy clouds, gentle green hills far away and a small wooden fence | full | done 2026-10-23 |
| `bg-meadow-mid.jpg` | a round grassy hill with a small tree, a bush with yellow flowers, an apple tree, a short wooden fence piece, a haystack, a tall birch, a bush with pink flowers and a beehive on a stand | 45 % | done 2026-10-23 |
| `bg-meadow-near.jpg` | tall grass blades, clover with a pink flower, daisies, a dandelion seed ball, a smooth stone, a tall buttercup, a small wooden stake and a curled leaf | 25 % | done 2026-10-23 |
| `bg-space-far.jpg` | deep friendly space in dark blue and violet with soft glowing stars, a pastel nebula and the curve of a blue-green Earth at the bottom left | full | |
| `bg-space-mid.jpg` | **use the far prompt instead**, SCENE: "only scattered soft glowing stars and tiny distant pastel planets on a flat pure magenta (#FF00FF) background" | full | not a strip |
| `bg-space-near.jpg` | **use the far prompt instead**, SCENE: "only a few small soft star sparkles and tiny space dust on a flat pure magenta (#FF00FF) background" | full | not a strip |
| `bg-planet-far.jpg` | a magical alien planet with a pastel mint sky with soft glowing clouds, purple and turquoise mushroom-shaped trees far away | full | done 2026-10-23 |
| `bg-planet-mid.jpg` | a magical forest edge with round turquoise and lilac trees and glowing flowers | 50 % | |
| `bg-planet-near.jpg` | a swamp band with an uneven top (tufts, humps, puddles) and on it turquoise reeds, a lily pad on a curly stem, a purple mushroom tree, a mossy hump with glowing flowers, a curly fern, lilac bulb plants, a glowing cattail and a small crystal | 30 % | done 2026-10-23 |
| `bg-dragons-far.jpg` | a peaceful dragon valley at sunset, warm orange and pink colours in the sky, the sun hidden behind the mountains, soft rounded mountains and a waterfall | full | done 2026-10-23 |
| `bg-dragons-mid.jpg` | rounded rocky hills with cozy cave entrances and soft moss | 45 % | |
| `bg-dragons-near.jpg` | grass with orange tips, round pebbles, a big fern, a broken eggshell with orange spots, a mossy log, a small glowing crystal, a dry reed and a curled leaf plant | 25 % | done 2026-10-23 |
| `bg-egg-far.jpg` | a bright morning valley with a long gentle grassy slope going down from left to right, a few trees and a blue river far away | full | done 2026-10-23 |
| `bg-egg-mid.jpg` | a bush with yellow flowers, a leaning tree, a mossy boulder, a haystack, a pine, a bush with pink flowers, a signpost with empty boards and a rocky outcrop with ferns | 50 % | done 2026-10-23 |
| `bg-egg-near.jpg` | only plants and small things: grass, yellow flowers, a pink wild rose, foxtail, a fern, a broken spotted eggshell, daisies, a mushroom and a thistle; no big rocks | 20 % | done 2026-10-23 |
| `bg-rescue-far.jpg` | a cozy rescue camp in a calm evening: a few small tents and wooden huts with warm glowing lanterns on poles, soft hills far away, an evening sky from violet to warm peach with a few soft clouds | full | done 2026-10-23 |
| `bg-rescue-mid.jpg` | a wooden rope bridge between two posts, a lookout tower with a small flag, a tent with a glowing lantern, a stack of crates, a round bush, a signpost with empty boards, a pine and a campfire ring of stones (no fire) | 45 % | done 2026-10-23 (ground gap under the bridge, magenta left between the tower ladder rungs) |
| `bg-rescue-near.jpg` | evening grass tufts, a small lantern on a stake, a coil of rope, a smooth stone, a short wooden post with a small flag, a fern and a small backpack | 25 % | done 2026-10-23 (the lantern floats beside its stake) |

### World style (fills `WORLD STYLE` in the far and strip prompts)
Paste the block of the world into every prompt of that world (far, mid, near) in place of
`WORLD STYLE`, so each picture is generated alone, with no attachment, and still lines up.
The Ground line is for the far picture; the strip prompt sets its own low ground band.
Common to all blocks: uniform outline about 2 px (stated per world), flat fills with at most
one soft lighter band along the top of each shape, no gradients to white, no pale, white or
pink rim around objects. The far picture keeps its sky small (about the top fifth: most of
the picture is scenery), because the strips do not use the sky.

What makes `bg-junkyard-near` the reference: one even dark brown-grey outline of the same
weight on everything; 6 to 12 big whole objects, each drawn once, overlapping a little;
warm rust, tan and teal fills clearly darker than the beige ground; a low ground band with
only magenta behind the objects; an uneven top silhouette (a spring, a bolt, a grass tuft
sticks up here and there, never a straight line); the dark outline meets the magenta
directly. The flagged pictures fail on one of these: a flat top edge (planet-near), too
many small pieces and pale fills on a pale ground (robocity), a light pink rim (workshop).

**meadow**
- Palette: sky #BFE3F5, grass #8CCB6A and #5FA84A, accents warm yellow #F6D55C and pink #F2A5B8, outline #3F5B3A.
- Outline: 2 px dark green-grey, uniform.
- Light and shading: flat fills, one soft lighter band on top of hills and bushes.
- Ground line: grass fills the lower two thirds, hills start at about the middle.
- Never: sun, moon, white outline, perspective.

**space**
- Palette: space #1B1F4B and #3A2E7A, glow #F6E7A8, nebula #B58AE6 and #6EC9D8, outline none for glows, #2A2A55 for solid shapes.
- Outline: 2 px dark indigo on solid shapes only, stars and glows are soft.
- Light and shading: soft glows, flat planet fills, no gradients to white.
- Ground line: none, the Earth curve sits at the bottom left only.
- Never: sun, moon, one big planet in the middle, perspective, white outline.

**planet**
- Palette: sky #CFF3E4, ground #7FC9A0 and #4E9E8A, accents turquoise #3CC7C0 and lilac #B79CE8, outline #3C5560.
- Outline: 2 px dark blue-grey, uniform.
- Light and shading: flat fills, one lighter band on top, glow only on flowers.
- Ground line: ground and swamp fill the lower half, mushroom trees stand on it.
- Never: sun, any moon, white outline, pink rim, perspective.

**dragons**
- Palette: sky #F8C9A0 and #F4A7A0, rock #B98B6E and #8C6A58, moss #8FBF7A, accent #F28C4B, outline #5A3E36.
- Outline: 2 px dark warm brown, uniform.
- Light and shading: flat fills, one soft lighter band on top, warm light from the left.
- Ground line: hills and grass fill the lower two thirds, mountains behind at the middle.
- Never: visible sun, white outline, pink rim, perspective.

**egg**
- Palette: sky #CDE9F7, grass #9AD36F and #6DB552, river #6DB8E8, accents #FFD966 and #F7A8C4, outline #44613F.
- Outline: 2 px dark green, uniform.
- Light and shading: flat fills, one soft lighter band on top.
- Ground line: one gentle slope going down from left to right in the lower two thirds.
- Never: sun, moon, white outline, perspective.

**junkyard**
- Palette: sky #BFD8E6, ground #CDB48F and #A88C68, rust #B5653A and #D98A52, steel #7FA3AA and #7A7F86, crate #E0B878, outline #4A4038.
- Outline: 2 px dark brown-grey, uniform (the reference look).
- Light and shading: flat fills with small rust speckles, one soft lighter band on top.
- Ground line: beige dusty ground in the lower third, piles rise from it.
- Never: sun, white or pink outline, perspective, sharp rust-red glare.

**workshop**
- Palette: wall #D9A66B and #B9814E, wood floor #E7B982, accents mint #9CCFB4, coral #F08F78, steel #A9B0B8, outline #5A3A25.
- Outline: 2 px dark brown, uniform, also against the magenta.
- Light and shading: flat warm fills, one soft lighter band on top, warm lamp light only.
- Ground line: a wooden bench or floor band across the lower quarter.
- Never: window sun, pale pink or white rim around objects, perspective.

**raintown**
- Palette: sky #B7C6D6, wet street #8E9AAE and #6F7C93, houses #F2B6A0, #A9D1C2 and #F6D98C, lit windows #FFE9A8, outline #3B4560.
- Outline: 2 px dark blue-grey, uniform.
- Light and shading: flat fills, thin lighter reflections on wet ground, soft grey rain lines only in the far picture.
- Ground line: a wet street band in the lower third.
- Never: sun, rainbow, white outline, perspective.

**robocity**
- Palette: sky #CDB8E8 and #E8C9E0, metal #8E97AE and #B9C0D4, ground #6B7391, glow accents #7FE0E8, #F59BC8 and #FFD97A, outline #2F3550.
- Outline: 2 px dark navy, uniform, thick enough to read against pale fills.
- Light and shading: flat metal fills clearly darker than light panels, glow only on lights and lines.
- Ground line: a dark flat ground band in the lower fifth; pieces stand on it with air between them.
- Never: sun, moon, busy small parts, white outline, perspective.

**robohome**
- Palette: wall #F3DDB8 and #E2C092, floor #C98F5B, accents teal #6FBDB5, coral #F08A7A, lamp #FFE29A, outline #5A3F33.
- Outline: 2 px dark brown, uniform.
- Light and shading: flat warm fills, one soft lighter band on top, glow only around lamps.
- Ground line: a wooden floor band across the lower quarter.
- Never: outdoor sun, white or pink rim, perspective.

**garden**
- Palette: sky #C9E8F7, grass #9AD27A and #6FB65A, flowers pink #F5A3C0, lilac #C3A5E8, yellow #FFE08A, outline #4A6340.
- Outline: 2 px dark green, uniform.
- Light and shading: flat fills, one soft lighter band on top of bushes.
- Ground line: grass in the lower third, flower beds above it.
- Never: sun, open bright blooms in the strips (buds only), white outline, perspective.

**forestpath**
- Palette: sky #DDEFD9, trunks #8B6B52 and #6E5441, leaves #7DBE7A and #4F9A63, path #D9BE8F, moss #A7D18B, outline #3E4A38.
- Outline: 2 px dark green-brown, uniform.
- Light and shading: flat fills, soft green light only from above, no light beams.
- Ground line: forest floor in the lower quarter, trunks rise from it.
- Never: sun disc, white outline, pink rim, perspective.

**lilylake**
- Palette: sky #D6ECF7, water #8FC9DD and #6BB0CC, reeds #7DB56A, lily pads #5FA86A, lilies #F5B5CC, pebbles #B9B4A8, outline #3F5760.
- Outline: 2 px dark blue-green, uniform.
- Light and shading: flat fills, ripples as thin lighter lines, no mirror reflections.
- Ground line: the shore or water band in the lower third.
- Never: sun, moon, white outline, perspective.

**musictree**
- Palette: sky #D9C6F0 and #F2C9DC, trees #8E7CC8 and #6C9E8A, grass #86B38A, glow accents #FFD97A and #9AE0E8, outline #4A3F6B.
- Outline: 2 px dark violet, uniform.
- Light and shading: flat fills, one soft lighter band on top, glow only on bells and flowers.
- Ground line: grass in the lower quarter, round trees behind.
- Never: sun, moon, white outline, perspective.

**rescue** (the rescue camp of every rescue mission, not a world of its own)
- Palette: sky #4A3F7A and #F2B08A, hills #5A4E78 and #3A3354, wood #8A6248, lanterns #FFC861 with glow #FFE3A8, tents #E89B6A and #6FA8A0, outline #2A2440.
- Outline: 2 px dark violet-grey, uniform.
- Light and shading: flat evening fills, one soft lighter band on top, warm glow only around lanterns.
- Ground line: dusky grass in the lower quarter, the camp stands on it.
- Never: sun, moon, fire flames, white outline, pink rim, perspective.

**moonball**
- Palette: sky #1E2556 and #3D2F7A, bushes #2E4A6B and #3F6E7A, grass #3C6A63, glow accents #FFE9A0 and #9AF0D8, outline #141B3D.
- Outline: 2 px very dark navy, uniform.
- Light and shading: flat dark fills, glow only on lanterns, mushrooms and fireflies, soft stars in the far sky.
- Ground line: dark grass in the lower quarter.
- Never: any moon, sun, white outline, pink rim, perspective.

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
| `obj-fan.jpg` | a pastel green folded paper hand fan, opened into a half circle, with a short wooden handle at the bottom, front view, no face | magenta |
| `obj-hedgehog.jpg` | a chubby friendly hedgehog standing on the ground, soft brown rounded spikes with a few colorful autumn leaves stuck on its back, big eyes, happy smile, small pink nose | magenta |
| **Space** | | |
| `obj-rocket.jpg` | a round cute red and white children's rocket with a round window and small fins, flying to the right, small soft flame | green |
| `obj-asteroid-small.jpg` | a small round grey-brown space rock with soft craters, sleepy face | magenta |
| `obj-asteroid-big.jpg` | a big round space rock with visible soft crack lines, calm face | magenta |
| `obj-planet-1.jpg` | a small round pastel orange planet with a ring, front view | green |
| `obj-planet-2.jpg` | a small round pastel blue planet with soft stripes, front view | magenta |
| `obj-planet-3.jpg` | a small round pastel purple planet with spots, front view | green |
| **New planet** | | |
| `obj-stone.jpg` | a flat round mossy stepping stone seen slightly from above | magenta |
| `obj-sign.jpg` | a wooden road sign on a post with an empty rectangular board (no text), front view | magenta |
| `obj-boulder-1.jpg` | a huge round boulder, whole, calm sleepy face | magenta |
| `obj-boulder-2.jpg` | the same huge round boulder with a few cracks, surprised face | magenta |
| `obj-boulder-3.jpg` | the same boulder split into several flat stepping stones, with a happy face on the middle one | magenta |
| **Dragons** | | |
| `obj-dragon-baby-1.jpg` | a chubby baby dragon, mint green, tiny wings, sitting, big eyes, happy | magenta |
| `obj-dragon-baby-2.jpg` | a chubby baby dragon, sky blue, tiny wings, sitting, big eyes, happy | magenta |
| `obj-dragon-baby-3.jpg` | a chubby baby dragon, sunny yellow, tiny wings, sitting, big eyes, happy | magenta |
| `obj-rock-falling.jpg` | a small round space rock falling with a soft light trail behind it, sleepy face, front view | magenta |
| **Egg journey** | | |
| `obj-egg.jpg` | a big oval dragon egg, cream with turquoise spots, front view | magenta |
| `obj-egg-cracking.jpg` | the same dragon egg with a zigzag crack and a tiny light glowing from inside | magenta |
| `obj-stump.jpg` | a short round tree stump with a small mushroom | magenta |
| `obj-rock-round.jpg` | a smooth round grey rock with a small tuft of grass | magenta |
| `obj-mole.jpg` | a friendly mole peeking out of a small dirt hole, waving with one paw, front view | magenta |
| `obj-dragon-hatched.jpg` | a tiny newborn baby dragon sitting in half of a cream eggshell with turquoise spots, front view, very happy | magenta |

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
| `ui-map-planet.jpg` | a small floating island with turquoise mushroom trees and a little swamp |
| `ui-map-dragons.jpg` | a small floating island with rounded hills and a cozy dragon cave |
| `ui-map-egg.jpg` | a small floating island with a grassy slope and a big spotted egg on top |

### ui-star.jpg and ui-star-empty.jpg (results screen, 1-3 stars)
Make `ui-star.jpg` first, then in the same chat attach it and use the second prompt.
```
Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette. A single chubby five-pointed star with rounded tips, warm golden yellow with a soft light highlight in the upper left, no face. Front view, centered, the whole star visible, wide empty margin. No text, no letters, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no sparkles, no other objects. Square image.
```
```
The same star with exactly the same shape, size, position and outline, but empty: filled with flat soft light grey, no highlight. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-key.jpg (mastered keys chip in the stats; the owner replaced it 2026-10-23)
```
Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: one computer keyboard key, clearly recognizable as a key: a square key with rounded corners seen a little from above, a lighter cream square top surface with a slight dip, and darker peach sloping sides below it. The key top is completely empty: no letter, no symbol, no pattern. Centered, the whole icon visible, wide empty margin. No text, no letters, no numbers, no symbols, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

### ui-keys-typed.jpg (letters typed in the last 14 days chip in the stats; a pile of pastel keys, one with a plus; the owner's picture 2026-10-23, replaced ui-key-star)

### ui-accuracy.jpg (accuracy in 14 days chip in the stats; an arrow in the middle of a target; the owner's picture)

### ui-typing-speed.jpg (speed in 14 days chip in the stats; an arrow made of keys; the owner's picture 2026-10-23, replaced ui-speed)

### ui-icon-hr.jpg (the same fox head with thinner lines, for the large logo on the start page; the owner's picture 2026-10-23)
The ui-icon prompt with "thin dark-brown outline" instead of "bold dark-brown outline".

### ui-mentor.jpg (the mentors' turtle: the start page's mentor button, the empty results table; the owner replaced it 2026-10-23 with a turtle reading a book)
```
Generate an image: Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: a friendly wise turtle teacher with a green shell, round glasses and a small dark graduation cap, smiling, holding a small tablet in its front flipper. Three-quarter front view, centered, the whole figure visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

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
```
Beautiful, richly detailed 2D game achievement icon for teenagers aged 10 to 15, polished vector illustration with layered gradients, soft glossy highlights, rim light, subtle texture and fine decorative details, rounded friendly shapes, soft dark-brown outlines (not black), harmonious saturated pastel palette with a few brighter accents. A single badge picture: BADGE. Make it look like a precious collectible emblem: a main object with several small supporting details (for example tiny sparkles, small leaves or stars, an inner glow, small ornaments) that belong to the same theme, never cluttered. Sparkles and small ornaments are only gold, white or pale yellow, never pink, purple or magenta, and there is no glow, haze or halo around the object: the flat background color reaches the object's outline directly. The object stands alone with a compact, roughly round overall shape; do not draw any circle, disc, medal, coin or plate behind it. Front view, centered, the whole composition visible, wide empty margin around it. No ring, no frame, no ribbon, no text, no letters, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

| File | BADGE | Status |
|---|---|---|
| `badge-meadow.jpg` | a sealed envelope with a small star seal, a secret invitation | new |
| `badge-space.jpg` | a cute round red rocket flying up with a small flame | new |
| `badge-planet.jpg` | an open paw-like hand with a soft glowing turquoise light around it (the Force) | new |
| `badge-dragons.jpg` | a big spotted dragon egg in pastel green and cream | new |
| `badge-egg.jpg` | a happy baby dragon peeking out of a cracked egg shell | new |
| `badge-junkyard.jpg` | a small friendly round robot waving one arm, a bit rusty | new |
| `badge-workshop.jpg` | a silver gear standing on one springy coil leg | new |
| `badge-raintown.jpg` | an open red umbrella with a few raindrops | new |
| `badge-robocity.jpg` | a blue key card with a small chip and a key symbol | new |
| `badge-robohome.jpg` | a cozy little house with a big red heart on the door | new |

### ui-posture.jpg ("Ready, steady, type!" card before every adventure)
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
| `bg-robohome-near.jpg` | a warm wooden floor with a soft round rug edge | 20 % | |

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
| `badge-lilylake.jpg` | a pink water lily on a round green pad |
| `badge-musictree.jpg` | a golden music note with a small glow |
| `badge-moonball.jpg` | a smiling crescent moon with a tiny firefly |

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
| `obj-dewdrop.jpg` | a single round shiny dew drop resting on the tip of a small grass blade, soft light reflection, no face | magenta |
| `obj-invitation.jpg` | a small folded paper party invitation card tied with a green ribbon and a tiny daisy, front view, no face | magenta |
| **Space** | | |
| `obj-star-dim.jpg` | a small round soft five-pointed star, pale grey-blue, not glowing, sleepy face | magenta |
| `obj-star-bright.jpg` | the same small star, bright golden yellow and glowing softly, happy face | magenta |
| `obj-radio.jpg` | a cute round retro space radio with a small antenna, a speaker grille and one green light, front view, no face | green |
| **New planet** | | |
| `obj-crystal.jpg` | a cluster of three rounded turquoise crystals growing from a small rock, calm, no face | magenta |
| `obj-crystal-glow.jpg` | the same crystal cluster glowing softly from inside in light turquoise | magenta |
| **Dragons** | | |
| `obj-twig.jpg` | a single short curved brown twig with two small green leaves, no face | magenta |
| `obj-nest.jpg` | a big round cozy nest of woven twigs and soft moss, empty, seen a little from above | magenta |
| `obj-dragon-sleeping.jpg` | a chubby baby dragon, mint green, curled up asleep with closed eyes and a tiny smile | magenta |
| **Egg journey** | | |
| `obj-egg-glow.jpg` | the cream dragon egg with turquoise spots, glowing warmly like a little lantern at night | green |
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
one bold shape, few details. Replace ACTIVITY with the text from the table.
```
Cute, soft 2D children's game icon, flat vector style with gentle gradients, soft dark-brown outline (not black), warm pastel palette, bold simple shapes that stay readable when very small. A single icon: ACTIVITY. Front view, centered, the whole icon visible, wide empty margin. No text, no letters, no numbers, no watermark. Background: one perfectly flat solid pure magenta color (#FF00FF), no gradient, no shadow, no other objects. Square image.
```

| File | ACTIVITY |
|---|---|
| `ui-act-chase.jpg` | a small leaf flying to the right with three short soft speed lines behind it (main game) |
| `ui-act-clean.jpg` | a short straight ribbon with a small round green check mark at its end (a clean line) |
| `ui-act-build.jpg` | three small rounded building blocks stacked, the top one just landing (building) |
| `ui-act-text.jpg` | an open book with a few soft grey lines on its pages, no letters (text page) |
| `ui-act-crossroads.jpg` | a wooden signpost with two empty arrow boards pointing left and right (crossroads) |
| `ui-act-listen.jpg` | a round soft ear with two small curved sound waves next to it (listening) |
| `ui-act-remember.jpg` | a small round eye half closed with a tiny sparkle above it, like remembering (memory) |
| `ui-act-rhythm.jpg` | a small round drum with two soft beat marks above it (rhythm) |
| `ui-act-hide.jpg` | a small round hole in the ground with two curious eyes peeking out (hide and seek) |
| `ui-act-super.jpg` | a small golden crown with three round tips (super-obstacle) |

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
and the fish keep their faces). Checked at 46 px on a light and a dark band before use.

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
| `obj-aim-chili.jpg` | one small plump red chili pepper on its side, gently curved, glossy red #E0453A, tip curling down on the right, dark-green stem and cap #3E8E41, no flames | magenta | done 2026-10-24 |
| `obj-aim-wrench.jpg` | one chunky adjustable wrench lying diagonally, oval hole in the handle, open C jaw, ridged wheel, blue-grey steel #8FA3B8/#C9D6E3/#5E7286 | magenta | done 2026-10-24 |
| `obj-aim-toast.jpg` | one slice of toast from the front, rounded puffy top, golden middle #EBB563, darker crust #B9772F, a small pat of butter #FFE9A0, strictly front view | magenta | done 2026-10-24 |
| `obj-aim-pinecone.jpg` | one plump pine cone standing upright, rows of open rounded scales, brown #A8693A with lighter tips #D49A62, short stem, no needles | magenta | done 2026-10-24 |
| `obj-aim-fish.jpg` | a small round chubby friendly fish facing right, orange #F7934C with a lighter belly, fan tail #FFB070, one big eye, rosy cheek, small smile, no water | magenta | done 2026-10-24 |
| `obj-aim-crown.jpg` | a small chunky golden crown from the front, three rounded points with balls, gold #F6C945/#FFE58A/#D9A520, three pink gems #F48FB1, strictly front view (the wardrobe's `acc-crown` is too small at 46 px) | magenta | done 2026-10-24 |
