import assert from "node:assert/strict";
import { PACK } from "../js/pack/index.js";
import { normalizePack } from "../js/core/pack-contract.js";
import { makeRng } from "../js/core/rng.js";
import { learningKey, noteLearning } from "../js/core/learning-feedback.js";
const pack=normalizePack(PACK), u=pack.newUser(), rng=makeRng(123);
for (const topic of pack.topics) {
  const task=pack.makeTask({topic:topic.id},rng,u), k=learningKey(pack,task);
  assert.ok(k, topic.id);
  assert.equal(noteLearning(u,k,0,false),false);
  pack.record(u,task,0);
  assert.equal(pack.review.count(u, [topic.id]), 1);
  assert.equal(pack.review.count(u, []), 0);
  const [next] = pack.review.plan(u, 1, rng, [topic.id]);
  const repeated=pack.makeTask(next, rng, u);
  assert.equal(learningKey(pack,repeated),k);
  assert.notEqual(learningKey(pack,{...repeated,seed:repeated.seed+1}),k);
  assert.equal(noteLearning(u, learningKey(pack,repeated),1,false),true);
  pack.record(u,repeated,1);
}
console.log("Matek: a javító kör ugyanazt a feladatot hozza vissza (fejlődésjelzés), lezárt témák szűrése.");
