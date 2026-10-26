// Base-word suggestions for Lute-style parent terms ("went" → "go", "cities" → "city").
// No dictionary: common irregular forms plus suffix rules. These are suggestions the student
// confirms with a tap, so an occasional wrong guess is harmless.

const IRREGULAR: Record<string, string[]> = {
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'], have: ['has', 'had', 'having'], do: ['does', 'did', 'done', 'doing'],
  go: ['goes', 'went', 'gone'], get: ['got', 'gotten'], make: ['made'], say: ['said', 'says'], see: ['saw', 'seen'], come: ['came'],
  take: ['took', 'taken'], know: ['knew', 'known'], think: ['thought'], give: ['gave', 'given'], find: ['found'], tell: ['told'],
  become: ['became'], leave: ['left'], feel: ['felt'], bring: ['brought'], begin: ['began', 'begun'], keep: ['kept'], hold: ['held'],
  write: ['wrote', 'written'], stand: ['stood'], hear: ['heard'], mean: ['meant'], meet: ['met'], run: ['ran'], pay: ['paid'],
  sit: ['sat'], speak: ['spoke', 'spoken'], lead: ['led'], grow: ['grew', 'grown'], lose: ['lost'], fall: ['fell', 'fallen'],
  send: ['sent'], build: ['built'], understand: ['understood'], draw: ['drew', 'drawn'], break: ['broke', 'broken'], spend: ['spent'],
  rise: ['rose', 'risen'], drive: ['drove', 'driven'], buy: ['bought'], wear: ['wore', 'worn'], choose: ['chose', 'chosen'],
  eat: ['ate', 'eaten'], drink: ['drank', 'drunk'], swim: ['swam', 'swum'], sing: ['sang', 'sung'], fly: ['flew', 'flown', 'flies'],
  teach: ['taught'], catch: ['caught'], sleep: ['slept'], wake: ['woke', 'woken'], forget: ['forgot', 'forgotten'], win: ['won'],
  sell: ['sold'], fight: ['fought'], throw: ['threw', 'thrown'], ride: ['rode', 'ridden'], hide: ['hid', 'hidden'], shake: ['shook'],
  steal: ['stole', 'stolen'], feed: ['fed'], hang: ['hung'], shoot: ['shot'], dig: ['dug'], bite: ['bit', 'bitten'], blow: ['blew', 'blown'],
  tear: ['tore', 'torn'], lie: ['lay', 'lain', 'lying'], die: ['dying'], can: ['could'], will: ['would'], shall: ['should'],
  child: ['children'], man: ['men'], woman: ['women'], person: ['people'], foot: ['feet'], tooth: ['teeth'], mouse: ['mice'],
  good: ['better', 'best'], bad: ['worse', 'worst'], many: ['more', 'most'], little: ['less', 'least'],
};
const BASE_OF = new Map(Object.entries(IRREGULAR).flatMap(([base, forms]) => forms.map((f) => [f, base] as const)));
// Words that end like inflections but are base forms ("this", "news", "bus", "nothing").
const KEEP = new Set(['this', 'is', 'his', 'has', 'was', 'us', 'bus', 'yes', 'news', 'always', 'perhaps', 'during', 'nothing', 'something', 'anything', 'everything', 'morning', 'evening', 'thing', 'king', 'ring', 'sing', 'bring', 'spring', 'string', 'wing', 'ceiling', 'red', 'bed', 'need', 'feed', 'seed', 'speed', 'hundred', 'class', 'glass', 'grass', 'miss', 'boss', 'less']);

const isVowel = (c: string) => 'aeiou'.includes(c);

/** Up to three base-form candidates for a word, best first; [] when it already looks like a base form. */
export function baseForms(word: string): string[] {
  const w = word.toLowerCase().replace(/['’]s$/, '');
  if (w !== word.toLowerCase() && w.length > 1) return [w]; // possessive: "Tom's" → "tom"
  const irregular = BASE_OF.get(w);
  if (irregular) return [irregular];
  if (KEEP.has(w) || w.length < 4) return [];
  const out: string[] = [];
  const add = (s: string) => s.length >= 2 && s !== w && !out.includes(s) && out.push(s);

  if (w.endsWith('ies') || w.endsWith('ied')) add(w.slice(0, -3) + 'y'); // cities, studied
  else if (w.endsWith('ves')) add(w.slice(0, -3) + 'f'), add(w.slice(0, -3) + 'fe'); // wolves, knives
  else if (/(s|x|z|ch|sh)es$/.test(w)) add(w.slice(0, -2)); // boxes, watches
  else if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) add(w.slice(0, -1)); // cats
  else if (w.endsWith('ing') || w.endsWith('ed')) {
    const stem = w.slice(0, w.endsWith('ing') ? -3 : -2);
    const a = stem.at(-1)!, b = stem.at(-2) ?? '';
    if (a === b && !'lsz'.includes(a)) add(stem.slice(0, -1)); // running, stopped
    if (w.endsWith('ed') && w.at(-3) === 'e') add(w.slice(0, -1)); // liked → like (via "like"+d)
    add(stem); // walked, playing
    if (!isVowel(a) && isVowel(b)) add(stem + 'e'); // making → make
  }
  return out.slice(0, 3);
}
