// ===== Tananyagcsatlakozó: kis PACK-szerződés, alapértékek és átmeneti adapter a régi csomagokhoz =====
// Mentést és pontozást nem végez; részletek: docs/tananyagcsatlakozo.md
import { answerSpecProblem, specSolution, renderAnswerSpec } from './answer-spec.js';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = (id, field, reason) => { throw new Error(`[PACK ${id || '?'}] ${field}: ${reason}`); };
const text = (value, fallback = '') => value == null ? fallback : String(value);
const escape = s => text(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function fn(value, id, field, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'function') fail(id, field, 'függvény szükséges');
  return value;
}
function array(value, id, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(id, field, 'tömb szükséges');
  return value;
}
// Alapértelmezett összevetés: szövegnél Unicode-egységesítés, a szélső szóközök levágása, a belső szóközök összevonása
const defaultNormalize = v => typeof v === 'string' ? v.normalize('NFC').trim().replace(/\s+/g,' ') : v;
const sameValue = (a, b) => a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x,i) => sameValue(x,b[i])));
// A felület vezérlőjéből csak a read() kötelező; a többi hiányozhat, és a hibájuk nem állítja meg a kört
export const UI_OPTIONAL = ['markWrong','markRight','lock','showCorrect','dispose'];
export function normalizeTask(raw, item, pack, rng) {
  const id = pack.id;
  if (!object(raw)) fail(id, 'makeTask', 'szinkron feladatobjektum szükséges');
  const topic = raw.topic ?? item.topic;
  if (!pack.topics.some(t => t.id === topic) || (!pack.legacy && topic !== item.topic && !(pack.topicFallbacks?.[item.topic] || []).includes(topic))) fail(id, 'task.topic', 'ismeretlen vagy eltérő téma');
  const spec = raw.answer;
  if (spec !== undefined) { const problem = answerSpecProblem(spec); if (problem) fail(id, 'task.answer', problem); }
  if (raw.render === undefined && spec === undefined) fail(id, 'task.render', 'függvény vagy answer-leírás szükséges');
  if (raw.render !== undefined && typeof raw.render !== 'function') fail(id, 'task.render', 'függvény szükséges');
  const solution = raw.solution !== undefined ? raw.solution : spec ? specSolution(spec) : undefined;
  if (raw.check === undefined && solution === undefined) fail(id, 'task.check', 'függvény vagy solution szükséges');
  if (raw.check !== undefined && typeof raw.check !== 'function') fail(id, 'task.check', 'függvény szükséges');
  const correctText = raw.correctText ?? (solution !== undefined ? text([].concat(solution)[0]) : undefined);
  if (typeof raw.q !== 'string') fail(id, 'task.q', 'szöveg szükséges');
  if (typeof correctText !== 'string') fail(id, 'task.correctText', 'szöveg szükséges (vagy solution)');
  if (raw.speechLang !== undefined && (typeof raw.speechLang !== 'string' || !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(raw.speechLang))) fail(id, 'task.speechLang', 'nyelvkód szükséges, pl. "de-DE"');
  const normalize = fn(raw.normalize, id, 'task.normalize', pack.normalizeAnswer || defaultNormalize);
  const userCheck = raw.check || (v => ({ok:[].concat(solution).some(s => sameValue(normalize(s), normalize(v)))}));
  const t = {...raw, topic, correctText, solution, sub:raw.sub ?? item.sub ?? '', level:raw.level ?? 1,
    meta:raw.meta ?? pack.topicLabel(topic), viz:raw.viz ?? '',
    hint:raw.hint ?? 'Gondold át még egyszer!', steps:raw.steps ?? [escape(correctText)],
    why:fn(raw.why,id,'task.why',() => ''), answerText:fn(raw.answerText,id,'task.answerText',v => text(v))};
  if (!Number.isInteger(t.level) || t.level < 1) fail(id,'task.level','pozitív egész szükséges');
  if (!Array.isArray(t.steps) || !t.steps.length || t.steps.some(s => typeof s !== 'string')) fail(id,'task.steps','nem üres szövegtömb szükséges');
  t.check = value => {
    const result = userCheck.call(t, value);
    if (!object(result) || typeof result.ok !== 'boolean') fail(id,'task.check','{ ok: boolean, feedback?: string } szükséges');
    if (result.feedback !== undefined && typeof result.feedback !== 'string') fail(id,'task.check.feedback','szöveg szükséges');
    return result;
  };
  t.render = (box, io) => {
    const ui = raw.render ? raw.render.call(t, box, io) : renderAnswerSpec(box, io, spec, rng);
    if (!object(ui) || typeof ui.read !== 'function') fail(id,'task.render','read() metódusú felület szükséges');
    const out = Object.create(ui);
    // az elhagyható metódusok hiánya vagy hibája csak a konzolra kerül: a kör, a pont és a mentés nem sérül
    const safe = (name, fallback) => (...args) => {
      if (typeof ui[name] !== 'function') return fallback;
      try { return ui[name].apply(ui,args); } catch (error) { console.error(`[PACK ${id}] ui.${name}:`, error); return fallback; }
    };
    for (const name of UI_OPTIONAL) out[name] = safe(name);
    out.onKey = safe('onKey', false);
    out.read = () => ui.read.call(ui);
    return out;
  };
  return t;
}
export function normalizePack(raw) {
  if (!object(raw)) fail('?', 'PACK', 'objektum szükséges');
  const id = raw.id;
  if (typeof id !== 'string' || !id.trim()) fail('?', 'id', 'nem üres azonosító szükséges');
  const legacy = raw.contractVersion === undefined;
  if (!legacy && raw.contractVersion !== 1) fail(id,'contractVersion','csak 1 támogatott');
  if (!legacy && (typeof raw.version !== 'string' || !raw.version.trim())) fail(id,'version','nem üres verzió szükséges');
  if (!Array.isArray(raw.topics) || !raw.topics.length) fail(id,'topics','legalább egy téma szükséges');
  const seen = new Set();
  const topics = raw.topics.map(t => {
    if (!object(t) || typeof t.id !== 'string' || !t.id.trim() || seen.has(t.id) || typeof t.name !== 'string' || !t.name.trim()) fail(id,'topics','egyedi id és név szükséges');
    seen.add(t.id);
    return {icon:'',color:'#7c3aed',sub:'',place:t.name,...t};
  });
  if (raw.topicFallbacks !== undefined) {
    if (!object(raw.topicFallbacks)) fail(id,'topicFallbacks','objektum szükséges');
    for (const [from,to] of Object.entries(raw.topicFallbacks))
      if (!seen.has(from) || !Array.isArray(to) || to.some(key => !seen.has(key))) fail(id,'topicFallbacks','csak ismert témák adhatók meg');
  }
  if (typeof raw.makeTask !== 'function') fail(id,'makeTask','függvény szükséges');
  fn(raw.normalizeAnswer,id,'normalizeAnswer');
  const p = {...raw, id, contractVersion:1, version:raw.version ?? 'legacy', legacy,
    topics, levels:raw.levels ?? {count:1,mode:'manual'},
    settings:array(raw.settings,id,'settings'), badges:array(raw.badges,id,'badges'),
    collectionTabs:array(raw.collectionTabs,id,'collectionTabs'), metrics:raw.metrics ?? {}};
  if (!object(p.levels) || !Number.isInteger(p.levels.count) || p.levels.count < 1 || !['auto','manual'].includes(p.levels.mode)) fail(id,'levels','count és mode szükséges');
  if (!object(p.metrics)) fail(id,'metrics','objektum szükséges');
  const topic = key => topics.find(t => t.id === key);
  const defaults = {
    newUser:() => ({}), normUser:u => u, record:() => null,
    levelOf:() => 1, status:(u,key) => ({stars:0,level:1,label:topic(key)?.sub || 'Gyakorlás'}),
    topicLabel:key => topic(key)?.name || text(key), subLabel:(key,sub) => text(sub),
    speechText:html => text(html).replace(/<[^>]+>/g,' '),
    help:key => ({title:topic(key)?.name || text(key),subtitle:topic(key)?.sub || ''}),
    parentTopics:(box,u) => {
      const doc = box.ownerDocument;
      for (const t of topics) { const row=doc.createElement('p'); row.textContent=`${t.name}: ${p.status(u,t.id).label}`; box.append(row); }
    },
    plan:(u,n,rng,allowed) => {
      const ids=topics.map(t=>t.id).filter(key=>allowed == null || allowed.includes(key));
      if (!ids.length) return [];
      return Array.from({length:n},()=>({topic:rng.pick(ids),sub:null}));
    }
  };
  for (const [name,fallback] of Object.entries(defaults)) p[name]=fn(raw[name],id,name,fallback);
  function planResult(result, allowed) {
    if (!Array.isArray(result)) fail(id,'plan','tömb szükséges');
    for (const item of result) if (!object(item) || !seen.has(item.topic) || (allowed != null && !allowed.includes(item.topic))) fail(id,'plan.topic','ismeretlen vagy lezárt téma');
    return result;
  }
  const plan=p.plan;
  p.plan=(u,n,rng,allowed) => {
    if (!Number.isInteger(n) || n < 0 || n > 10000) fail(id,'plan.n','0–10000 közötti egész szükséges');
    if (allowed != null && !Array.isArray(allowed)) fail(id,'plan.allowed','tömb szükséges');
    if (n === 0 || (allowed && !allowed.length)) return [];
    return planResult(plan.call(p,u,n,rng,allowed),allowed);
  };
  if (raw.review !== undefined) {
    if (!object(raw.review) || typeof raw.review.count !== 'function' || typeof raw.review.plan !== 'function') fail(id,'review','count és plan függvény szükséges');
    const review=raw.review;
    p.review={...review,count:u=>review.count.call(review,u),plan:(u,n,rng,allowed)=>allowed && !allowed.length ? [] : planResult(review.plan.call(review,u,n,rng,allowed),allowed)};
  }
  p.makeTask=(item,rng,u) => {
    if (!object(item) || !seen.has(item.topic)) fail(id,'makeTask.item','ismert téma szükséges');
    return normalizeTask(raw.makeTask.call(p,item,rng,u),item,p,rng);
  };
  return p;
}
// Feladatonkénti egyszeri rögzítés: két felületi esemény ne számolja el kétszer ugyanazt a feladatot
export function createRecordGate() {
  let done=false;
  return () => { if(done) throw new Error('TASK_ALREADY_RECORDED'); done=true; };
}
