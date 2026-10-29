// The structure of every text of the game, as the translator page shows it: sections, groups
// and items in page order. The texts about the texts (headings, explanations, situations) are in
// the translator's own file `public/i18n/translator/en.json`; the texts themselves in
// `public/i18n/<lang>.json`.

/**
 * How an item is translated: one string, a random pool (variants may be added or removed), an
 * ordered list (exactly the base count), a count with plural forms, or the word list.
 */
export type Kind = 'text' | 'pool' | 'lines' | 'plural' | 'words';

export type Dict = { [key: string]: string | string[] | Dict };
export type Value = string | string[] | Record<string, string>;

export interface Item {
  key: string;
  kind: Kind;
}

export interface Group {
  id: string;
  /** The guide id (`groups.<guide>.title`); groups made per child of a key share one. */
  guide: string;
  /** The key whose base text fills `{item}` in the group's guide texts and situations. */
  name?: string;
  items: Item[];
}

export interface Section {
  id: string;
  groups: Group[];
}

/** A group: its keys or `prefix.*` patterns (every item under the prefix not taken by an earlier group). */
interface GroupDef {
  id: string;
  keys: string[];
  /** One group per child of this key (`aim.things` -> a group per thing), named by `<child>.name`. */
  each?: string;
}

/** The plural forms `Intl.PluralRules` knows. */
export const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

/** Keys read by `tn`: an object of plural forms. */
export const PLURAL_KEYS = new Set([
  'teacher.scan.count', 'teacher.n.sets', 'teacher.n.writers', 'teacher.n.results', 'teacher.n.handIns',
  'teacher.file.added', 'teacher.file.old', 'teacher.wipe.goSets', 'teacher.wipe.goResults', 'story.copyLoopDone',
]);

/** Arrays whose order and count matter; every other array is a pool read at random. */
const LINES = ['start.slogan', 'story.scenes.*', 'keysIntro.text', 'cert.praise', 'about.*', 'help.*'];

/** The id of the word list item and of its field. */
export const WORDS = 'words';

const g = (id: string, ...keys: string[]): GroupDef => ({ id, keys });

const SECTIONS: { id: string; groups: GroupDef[] }[] = [
  { id: 'start', groups: [
    g('common', 'common.*'),
    g('start-page', 'start.*'),
    g('new-profile', 'newProfile.*', 'kinds.*'),
    g('names', 'names'),
    g('import', 'import.*', 'move.*', 'install.*'),
  ] },
  { id: 'map', groups: [
    g('worlds', 'worlds.*'),
    g('map-teacher', 'map.teacher.*'),
    g('map-buttons', 'map.hello', 'map.title', 'map.switchProfile', 'map.settings', 'map.warmUp', 'map.continue', 'map.practice', 'map.ownText', 'map.freeType', 'map.wardrobe', 'map.rescue', 'map.friends'),
    g('map-page', 'map.*'),
    g('surprise', 'surprise.*'),
    g('friends', 'friends.*', 'dragonNames', 'robotNames', 'forestNames'),
    g('tracks', 'tracks.*'),
  ] },
  { id: 'typing', groups: [
    g('level-pause', 'level.pause', 'level.paused', 'level.pauseClose', 'level.slower', 'level.slowerSaid', 'level.stretch', 'level.stretchLong', 'level.stretchDone'),
    g('level', 'level.*'),
    g('keyboard', 'keys.*', 'layouts.*', 'fingers.*', 'guide.*'),
    g('posture', 'posture.*'),
    g('new-key', 'keysIntro.*', 'newKey.*', 'homeRow.*'),
    g('practice', 'practice.*', 'practiceKeys.*'),
    g('free-type', 'freeType.*', 'touch.*'),
    g('helpers', 'paw.*'),
  ] },
  { id: 'story', groups: [
    g('tapko', 'tapko.*', 'fairy.*'),
    g('story-worlds', 'story.world.*'),
    g('story-scenes', 'story.scenes.*', 'story.next'),
    g('story-space', 'story.spaceStart', 'story.hopStart', 'story.hopTooFar', 'story.strongStart', 'story.strongHit', 'story.commandStart', 'story.commandReply', 'story.commandRejected', 'story.boarded', 'story.asteroidStart'),
    g('story-planet', 'story.swampStart', 'story.swampDone', 'story.crystalsStart', 'story.crystalsDoneOne', 'story.crystalsDoneFew', 'story.crystalsDoneMany', 'story.crossroadsStart', 'story.roadEnd', 'story.signGone', 'story.signLast', 'story.spellStart', 'story.spellCast', 'story.spellBroken', 'story.greatSwampStart', 'story.greatSwampSlip', 'story.boulderStart', 'story.boulderOpen', 'story.cradleDone'),
    g('story-placeholder', 'story.copyLoopStart', 'story.copyLoopSoon', 'story.copyLoopCount', 'story.copyLoopDone'),
    g('story-paths', 'story.path.*'),
    g('story-play', 'story.*'),
  ] },
  { id: 'aim', groups: [
    g('aim-page', 'aim.title', 'aim.start', 'aim.swapHint', 'aim.swap', 'aim.keys', 'aim.ready', 'aim.hits', 'aim.stayTip', 'aim.stay', 'aim.stayStart',
      'aim.hitsDone', 'aim.done', 'aim.beforeAfter', 'aim.opened', 'aim.again', 'aim.collection.*'),
    g('aim-lines', 'aim.lines.*'),
    { id: 'aim-thing', keys: [], each: 'aim.things' },
    g('parrot', 'parrot.*'),
  ] },
  { id: 'results', groups: [
    g('results', 'results.*'),
    g('badge', 'badge.*'),
    g('progress', 'progress.*'),
    g('stats', 'stats.*'),
    g('cert', 'cert.*'),
    g('super', 'super.*', 'service.*'),
  ] },
  { id: 'wardrobe', groups: [
    g('wardrobe', 'wardrobe.*', 'slots.*'),
    g('items-head', ...['antenna-band', 'feather', 'hair-clip', 'hard-hat', 'umbrella', 'cap', 'crown', 'wizard-hat', 'flower-wreath', 'beanie', 'hair-bow', 'explorer-hat'].map((i) => `items.${i}`)),
    g('items-face', ...['carnival-mask', 'eye-mask', 'goggles', 'round-glasses', 'star-glasses', 'sunglasses', 'heart-glasses', 'chain', 'medallion', 'scarf', 'bow-tie', 'neckerchief'].map((i) => `items.${i}`)),
    g('items-body', ...['knit-vest', 'raincoat', 'star-shirt', 'explorer-vest', 'backpack', 'butterfly-wings', 'dragon-wings', 'fairy-wings', 'hero-cape', 'jetpack', 'star-cape'].map((i) => `items.${i}`)),
    g('items-hand', 'items.*'),
  ] },
  { id: 'breaks', groups: [
    g('break', 'break.*'),
    g('tips-body', ...['sit-straight', 'feet-floor', 'elbows-close', 'right-angles', 'sit-higher', 'screen-distance', 'screen-height', 'relax-shoulders', 'wrists-float',
      'no-palms', 'soft-touch', 'thumbs-rest', 'stretch-fingers', 'stretch-wrist', 'take-break', 'rest-eyes'].map((i) => `tips.${i}`)),
    g('tips-keys', ...['fj-bumps', 'home-row', 'return-home', 'one-finger', 'index-two', 'middle-ei', 'pinky-p', 'ring-finger', 'reach-t', 'feel-center', 'thumb-space',
      'shift-opposite', 'capital-a', 'yz-swap', 'z-finger', 'number-row', 'number-fingers', 'dead-keys', 'caron-shift', 'accent-pinky', 'diacritics-fun'].map((i) => `tips.${i}`)),
    g('tips-mind', 'tips.*'),
  ] },
  { id: 'settings', groups: [
    g('parent-page', 'parent.title', 'parent.checkTitle', 'parent.checkText', 'parent.checkOk', 'parent.tab.*', 'parent.group.*'),
    g('parent-child', 'parent.childName', 'parent.childNameHint', 'parent.nickname', 'parent.nicknameHint', 'parent.nickMissing', 'parent.switchTitle',
      'parent.companionKind', 'parent.messages', 'parent.messagesHint', 'parent.messagesPlaceholder', 'parent.language', 'parent.layout', 'parent.layoutHint',
      'parent.wordLang', 'parent.wordLangHint'),
    g('parent-practice', 'parent.difficulty', 'parent.wordLen', 'parent.min', 'parent.max', 'parent.autoDifficulty', 'parent.autoDifficultyHint', 'parent.autoWordLen',
      'parent.autoWordLenHint', 'parent.autoHint', 'parent.noDiacritics', 'parent.noDiacriticsHint', 'parent.noTimePressure', 'parent.noTimePressureHint', 'parent.appTips',
      'parent.appTipsHint', 'parent.wardrobeLimit', 'parent.wardrobeLimitHint', 'parent.wardrobeBalance', 'parent.sessionMinutes', 'parent.breaksLocked', 'parent.breaksLockedHint', 'parent.minutes', 'parent.guide',
      'parent.guideAuto', 'parent.guideOn', 'parent.guideOff', 'parent.guideLocked'),
    g('parent-look', 'parent.sfx', 'parent.music', 'parent.speakTyped', 'parent.speakTypedHint', 'parent.font', 'parent.largeText', 'parent.reduceMotion',
      'parent.highContrast', 'parent.autoFullscreen', 'parent.autoFullscreenHint', 'parent.keyFont', 'parent.keyFontHint'),
    g('parent-lock', 'parent.lock.*'),
    g('parent-keys', 'parent.keysMode', 'parent.keysAuto', 'parent.keysManual', 'parent.keysHint', 'parent.punctuation', 'parent.unlocked', 'parent.preset.*'),
    g('parent-data', 'parent.*'),
    g('own', 'own.*'),
    g('surprises-form', 'surprises.hint', 'surprises.empty', 'surprises.formTitle', 'surprises.q', 'surprises.a', 'surprises.qPlaceholder', 'surprises.aPlaceholder',
      'surprises.whenLabel', 'surprises.level', 'surprises.n.*', 'surprises.trigger.*', 'surprises.repeat', 'surprises.announce', 'surprises.add', 'surprises.save', 'surprises.cancel',
      'surprises.edit', 'surprises.remove', 'surprises.needBoth', 'surprises.badN', 'surprises.tooMany'),
    g('surprises-table', 'surprises.*'),
  ] },
  { id: 'mentors', groups: [
    g('teacher-page', 'teacher.title', 'teacher.intro', 'teacher.privacy', 'teacher.tab.*', 'teacher.paste', 'teacher.pastePlaceholder', 'teacher.add', 'teacher.added',
      'teacher.already', 'teacher.notKept', 'teacher.notIntact', 'teacher.lockRemoved', 'teacher.empty', 'teacher.status.*'),
    g('teacher-table', 'teacher.col.*', 'teacher.sortBy', 'teacher.sort.*', 'teacher.unit.*', 'teacher.n.*'),
    g('teacher-groups', 'teacher.all', 'teacher.noGroup', 'teacher.groupFilter', 'teacher.csv', 'teacher.csvAll', 'teacher.assign', 'teacher.assignPrompt',
      'teacher.remove', 'teacher.removePicked', 'teacher.removeManyTitle', 'teacher.removeManyText', 'teacher.groups.*', 'teacher.sets.*', 'teacher.set.*', 'teacher.pickSet'),
    g('teacher-writers', 'teacher.writers.*', 'teacher.child.*'),
    g('teacher-scan', 'teacher.scan.*'),
    g('teacher-files', 'teacher.file.*', 'teacher.send.*'),
    g('teacher-wipe', 'teacher.*'),
    g('task-make', 'task.intro', 'task.title', 'task.titlePlaceholder', 'task.minutes', 'task.kindLabel', 'task.kind.*', 'task.make', 'task.needContent', 'task.linkTitle',
      'task.linkHint', 'task.giveHere', 'task.group', 'task.groupPlaceholder', 'task.groupHint', 'task.bigCode', 'task.legendNew', 'task.legendList'),
    g('task-play', 'task.*'),
    g('share', 'share.*'),
  ] },
  { id: 'help', groups: [
    g('help-tabs', 'help.title', 'help.tab.*', 'help.icons.*'),
    g('help-texts', 'help.*'),
    g('about', 'about.*'),
  ] },
  { id: 'words', groups: [g('words', WORDS)] },
];

/** The keys the catalog names one by one (not by a pattern); each must exist. */
export function namedKeys(): string[] {
  return SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.keys.filter((k) => !k.includes('*') && k !== WORDS)));
}

const isPluralObject = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).includes('other') && Object.keys(v).every((k) => (PLURAL_FORMS as readonly string[]).includes(k));

/** Every item key of a dictionary in its order: a string, an array or an object of plural forms. */
export function itemKeys(d: Dict, prefix = ''): string[] {
  return Object.entries(d).flatMap(([k, v]) => {
    const key = prefix + k;
    return typeof v === 'string' || Array.isArray(v) || isPluralObject(v) ? [key] : itemKeys(v, `${key}.`);
  });
}

/** Does a key match a pattern: the key itself, or `a.*` for everything under `a`, `*` standing for one segment elsewhere. */
export function matches(pattern: string, key: string): boolean {
  if (pattern.endsWith('.*') && !pattern.slice(0, -2).includes('*')) return key.startsWith(pattern.slice(0, -1));
  const p = pattern.split('.');
  const k = key.split('.');
  return p.length === k.length && p.every((s, i) => s === '*' || s === k[i]);
}

export function kindOf(key: string): Kind {
  if (key === WORDS) return 'words';
  if (PLURAL_KEYS.has(key)) return 'plural';
  return 'text';
}

/** An array whose order and count matter (else a pool). */
export const isLines = (key: string): boolean => LINES.some((p) => matches(p, key));

/** The kind of an item of the dictionary: arrays are `lines` or `pool`, the rest by `kindOf`. */
function itemKind(key: string, v: unknown): Kind {
  if (Array.isArray(v)) return isLines(key) ? 'lines' : 'pool';
  return kindOf(key);
}

export function lookup(d: Dict, key: string): Value | Dict | undefined {
  let node: any = d;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object' || Array.isArray(node)) return undefined;
    node = node[part];
  }
  return node;
}

/** The catalog laid over a dictionary (all official dictionaries have the same keys): sections, groups and items in page order. */
export function buildCatalog(d: Dict): Section[] {
  const left = itemKeys(d);
  const taken = new Set<string>();
  const take = (pattern: string) => left.filter((k) => !taken.has(k) && matches(pattern, k)).map((k) => (taken.add(k), { key: k, kind: itemKind(k, lookup(d, k)) }));
  return SECTIONS.map((s) => ({
    id: s.id,
    groups: s.groups.flatMap((def): Group[] => {
      if (def.id === WORDS) return [{ id: WORDS, guide: WORDS, items: [{ key: WORDS, kind: 'words' }] }];
      if (def.each) {
        const node = lookup(d, def.each);
        return Object.keys(node && typeof node === 'object' ? node : {}).map((child) => ({
          id: `${def.id}-${child}`, guide: def.id, name: `${def.each}.${child}.name`, items: take(`${def.each}.${child}.*`),
        }));
      }
      return [{ id: def.id, guide: def.id, items: def.keys.flatMap(take) }];
    }),
  }));
}

/** The situation key of an item in the guide: the key itself or the most specific pattern found. */
export function situationKey(situations: Record<string, string>, key: string): string | undefined {
  if (key in situations) return key;
  const stars = (p: string) => p.split('*').length;
  return Object.keys(situations).filter((p) => p.includes('*') && matches(p, key)).sort((a, b) => stars(a) - stars(b) || b.length - a.length)[0];
}

/** Pictures of an item or a group, best first (asset names without the extension). */
export function thumbs(key: string): string[] {
  const [top, id] = key.split('.');
  if (top === 'items') return [`acc-${id}-thumb`];
  if (top === 'worlds') return [`badge-${id}`];
  if (top === 'kinds') return [`tapko-${id}-idle`];
  if (key.startsWith('aim.things.') && key.endsWith('.name')) return [`obj-aim-${key.split('.')[2]}`, `obj-${key.split('.')[2]}`];
  return [];
}
