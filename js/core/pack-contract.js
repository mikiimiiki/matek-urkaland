// ===== Tananyagcsatlakozó: kis PACK-szerződés, alapértékek és átmeneti adapter a régi csomagokhoz =====
// Mentést és pontozást nem végez; részletek: docs/tananyagcsatlakozo.md
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
export function normalizeTask(raw, item, pack) {
  const id = pack.id;
  if (!object(raw)) fail(id, 'makeTask', 'szinkron feladatobjektum szükséges');
  const topic = raw.topic ?? item.topic;
  if (!pack.topics.some(t => t.id === topic) || (!pack.legacy && topic !== item.topic && !(pack.topicFallbacks?.[item.topic] || []).includes(topic))) fail(id, 'task.topic', 'ismeretlen vagy eltérő téma');
  for (const field of ['q', 'correctText']) if (typeof raw[field] !== 'string') fail(id, `task.${field}`, 'szöveg szükséges');
  for (const field of ['render', 'check']) if (typeof raw[field] !== 'function') fail(id, `task.${field}`, 'függvény szükséges');
  const t = {...raw, topic, sub:raw.sub ?? item.sub ?? '', level:raw.level ?? 1,
    meta:raw.meta ?? pack.topicLabel(topic), viz:raw.viz ?? '',
    hint:raw.hint ?? 'Gondold át még egyszer!', steps:raw.steps ?? [escape(raw.correctText)],
    why:fn(raw.why,id,'task.why',() => ''), answerText:fn(raw.answerText,id,'task.answerText',v => text(v))};
  if (!Number.isInteger(t.level) || t.level < 1) fail(id,'task.level','pozitív egész szükséges');
  if (!Array.isArray(t.steps) || !t.steps.length || t.steps.some(s => typeof s !== 'string')) fail(id,'task.steps','nem üres szövegtömb szükséges');
  t.check = value => {
    const result = raw.check.call(t, value);
    if (!object(result) || typeof result.ok !== 'boolean') fail(id,'task.check','{ ok: boolean, feedback?: string } szükséges');
    if (result.feedback !== undefined && typeof result.feedback !== 'string') fail(id,'task.check.feedback','szöveg szükséges');
    return result;
  };
  t.render = (box, io) => {
    const ui = raw.render.call(t, box, io);
    if (!object(ui) || typeof ui.read !== 'function') fail(id,'task.render','read() metódusú felület szükséges');
    const out = Object.create(ui);
    for (const name of ['markWrong','markRight','lock','showCorrect']) {
      if (typeof ui[name] !== 'function') fail(id,`ui.${name}`,'függvény szükséges');
      out[name] = (...args) => ui[name].apply(ui,args);
    }
    out.read = () => ui.read.call(ui);
    out.onKey = (...args) => fn(ui.onKey,id,'ui.onKey',() => false).apply(ui,args);
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
    return normalizeTask(raw.makeTask.call(p,item,rng,u),item,p);
  };
  return p;
}
// Feladatonkénti egyszeri rögzítés: két felületi esemény ne számolja el kétszer ugyanazt a feladatot
export function createRecordGate() {
  let done=false;
  return () => { if(done) throw new Error('TASK_ALREADY_RECORDED'); done=true; };
}
