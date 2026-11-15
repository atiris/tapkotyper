// Verifies a change with what it can reach: the type check and the unit suite (whole, it takes
// seconds), then only the Playwright specs that cover the changed files.
//   npm run test:affected                      changed, staged and untracked files against HEAD
//   npm run test:affected -- --base <ref>      files changed since <ref> (a finished plan: its first commit's parent)
//   npm run test:affected -- <paths>...        these files
//   npm run test:affected -- --dry             print the choice, run nothing
// E2E specs are picked by the RULES below; a file no rule knows runs the smoke spec, a global file runs every spec.
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

/** Files every spec depends on: a change here runs the whole e2e suite. */
const GLOBAL = /^(package(-lock)?\.json|vite\.config\.ts|playwright\.config\.ts|tsconfig\.json|index\.html|e2e\/(helpers|contrast)\.ts|src\/main\.ts|src\/app\/(app|fast|test-typing)\.ts|src\/storage\/(store|lock|idb)\.ts|src\/ui\/dom\.ts)/;
/** Files no spec can catch: specs, plans, pictures' sources, tools, scripts. */
const NO_E2E = /^(\.specify|\.research|\.scenarios|\.todo|\.claude|docs|assets-src|tools|temp|scripts)\/|\.md$|^(LICENSE|TRADEMARKS|\.gitignore|\.gitattributes|\.ignore)/;
const SMOKE = ['play'];

/** [path pattern, specs] - a spec name is its file in e2e/ without `.spec.ts`. First match does not stop: all matches add. */
const RULES = [
  [/^src\/game\/modes\/aim|^src\/ui\/range-visit|^src\/game\/magpie/, ['aim', 'magpie']],
  [/^src\/game\/(modes\/rhythm|beat|rhythm-notes|evenness)|^src\/audio\/beat-music/, ['rhythm']],
  [/^src\/game\/modes\/freetype|^src\/screens\/free-type|^src\/ui\/typed-word/, ['free-type']],
  [/^src\/game\/(modes\/parrot|parrots)|^src\/ui\/parrot-visit/, ['parrot']],
  [/^src\/(game\/modes|learning)\/placement/, ['placement']],
  [/^src\/game\/modes\/(practice|copy-loop)|^src\/screens\/practice-keys/, ['practice-keys']],
  [/^src\/game\/modes\/(dragons|egg|space|planet|meadow|launch)|^src\/game\/modes\/kit\//, ['journey', 'play']],
  [/^src\/game\/(modes\/kit\/hold|runtime\/hold)/, ['sticky']],
  [/^src\/game\/(modes\/task|task-play)|^src\/screens\/(task|tasks|teacher)|^src\/share\/|^src\/ui\/task-/, ['teacher-links', 'teacher-scan']],
  [/^src\/ui\/(camera|qr-scanner|big-code)/, ['teacher-scan']],
  [/^src\/game\/own-content/, ['own-content']],
  [/^src\/game\/wardrobe|^src\/screens\/wardrobe/, ['wardrobe']],
  [/^src\/game\/(runtime|typing|typed-line|cards|tips|enter|pace|speed|progress|rewards|levels|end-news|super-help)|^src\/ui\/(keyboard-guide|hands|hand-|hud|end-card|finger-colors|keyboard-settings)|^src\/keyboard\/|^src\/learning\//, ['play', 'keyboard-only', 'styles', 'layout']],
  [/^src\/screens\/(map|world-keys|story|progress|stats|level)|^src\/ui\/(treasure-map|badge|medal|finds|rows)/, ['play', 'journey', 'key-links']],
  [/^src\/screens\/(start|new-profile|break|certificate)|^src\/ui\/(profile-card|install|update|start-pictures)/, ['play', 'layout', 'mobile']],
  [/^src\/screens\/(parent|parent-gate|link-import)|^src\/ui\/(form|tabs|notes)/, ['parent']],
  [/^src\/app\/super|^src\/ui\/service/, ['service', 'eggs']],
  [/^src\/app\/theme|^src\/ui\/sky/, ['theme']],
  [/^src\/ui\/(tooltip|hotkeys|menu|chrome|toast|aro|tapko-visit|whistle)|^src\/input\//, ['tooltip', 'keyboard-only', 'eggs']],
  [/^src\/screens\/help/, ['help']],
  [/^src\/screens\/translate|^src\/i18n\//, ['translate', 'start-texts']],
  [/^public\/i18n\//, ['start-texts', 'translate', 'layout', 'mobile']],
  [/^src\/app\/(keyboard-gate|about-page)/, ['mobile']],
  [/^src\/styles\.css/, ['layout', 'mobile', 'theme']],
  [/^src\/(gfx|engine|audio)\//, SMOKE],
];

/** The specs a set of changed files needs, and why: `all`, a list, or none. */
export function pick(files) {
  const global = files.find((f) => GLOBAL.test(f));
  if (global) return { all: true, why: `${global} is used by every spec` };
  const specs = new Set();
  const unknown = [];
  for (const f of files) {
    const own = f.match(/^e2e\/(.+)\.spec\.ts$/);
    if (own) { specs.add(own[1]); continue; }
    if (NO_E2E.test(f) || !/^(src|public|e2e)\//.test(f) || /\.test\.ts$/.test(f)) continue;
    const hits = RULES.filter(([re]) => re.test(f)).flatMap(([, s]) => s);
    if (hits.length) hits.forEach((s) => specs.add(s));
    else if (!f.startsWith('public/assets/')) unknown.push(f);
  }
  if (unknown.length) SMOKE.forEach((s) => specs.add(s));
  return { all: false, specs: [...specs].sort(), why: unknown.length ? `no rule for ${unknown.join(', ')}: smoke spec added` : '' };
}

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).split('\n').filter(Boolean);
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const baseAt = args.indexOf('--base');
const paths = args.filter((a, i) => !a.startsWith('--') && !(baseAt >= 0 && i === baseAt + 1));
const files = paths.length ? paths.map((p) => p.replace(/\\/g, '/'))
  : baseAt >= 0 ? git('diff', '--name-only', args[baseAt + 1])
  : [...new Set([...git('diff', '--name-only', 'HEAD'), ...git('ls-files', '--others', '--exclude-standard')])];

const code = files.filter((f) => !NO_E2E.test(f));
const choice = pick(files);
const known = new Set(readdirSync('e2e').filter((f) => f.endsWith('.spec.ts')).map((f) => f.slice(0, -8)));
const specs = choice.all ? [] : choice.specs.filter((s) => known.has(s));
console.log(`test:affected: ${files.length} changed file(s); ${code.length ? 'tsc + unit suite' : 'no code'}; e2e: ${choice.all ? `all (${choice.why})` : specs.length ? specs.join(', ') : 'none'}${!choice.all && choice.why ? ` (${choice.why})` : ''}`);
if (dry || !code.length) process.exit(0);

const run = (cmd, a) => {
  const r = spawnSync(cmd, a, { stdio: 'inherit', shell: true });
  if (r.status) process.exit(r.status);
};
run('npx', ['tsc', '--noEmit']);
run('npx', ['vitest', 'run', '--reporter=dot']);
if (choice.all) run('npx', ['playwright', 'test']);
else if (specs.length) run('npx', ['playwright', 'test', ...specs.map((s) => `e2e/${s}.spec.ts`)]);
