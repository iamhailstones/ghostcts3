// Run with: node tests/challenges.test.js
// Checks that every Python challenge accepts a correct answer and rejects an empty one,
// and that the campaign gets harder every level.
const fs = require('fs'), vm = require('vm'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(read('levels.js') + read('challenges.js') + ';this.CH=CH;this.norm=norm;this.COUNT=COUNT;', ctx);
const good = {
  vars: 'remaining = ammo - used', cond: 'if ammo == 0:\n    print("reload")\nelse:\n    print("shoot")',
  list: 'inventory.append("rifle")', tuple: 'gun_list = list(gun)\ngun_list[1] += 10\ngun = tuple(gun_list)',
  dict: 'print(enemy["weakness"])', loop: 'for i in range(3):\n    print(i)',
  func: 'def strike(power):\n    return power * 2', set: 'unique = set(ids)',
  try: 'try:\n    ammo = int(raw)\nexcept ValueError:\n    ammo = 0',
  class: 'class Soldier:\n    def __init__(self, name):\n        self.name = name',
  sort: 'threats.sort(key=lambda t: t[1], reverse=True)', json: 'data = json.loads(raw)'
};
let fails = 0;
const check = (name, cond) => { if (!cond) { fails++; console.log('FAIL', name); } };
ctx.CH.forEach(c => {
  check(c.id + ' accepts a correct answer', c.ok(ctx.norm(good[c.id] || '')));
  check(c.id + ' has a lesson', !!c.lesson && c.lesson.length > 40);
  check(c.id + ' shown solution is accepted', c.ok(ctx.norm(c.sol)));
  check(c.id + ' rejects an empty answer', !c.ok(ctx.norm('')));
  check(c.id + ' ignores solutions hidden in comments', !c.ok(ctx.norm('# ' + (good[c.id] || ''))));
});
check('12 challenges exist', ctx.CH.length === 12);
for (let i = 1; i < 9; i++) check('level ' + (i + 1) + ' has more enemies', ctx.COUNT[i] > ctx.COUNT[i - 1]);
console.log(fails ? fails + ' check(s) failed' : 'All challenge and level checks passed');
process.exit(fails ? 1 : 0);
