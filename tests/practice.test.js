// Run with: node tests/practice.test.js
// Practice Mode: the Python-subset engine, every exercise (complete, solvable, not pre-solved), validation categories, indentation + logic together,
// and the assistant's knowledge notes (accuracy against the real game data).
const fs = require('fs'), vm = require('vm'), path = require('path'), rd = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(rd('levels.js') + rd('weapons.js') + rd('editor.js') + rd('pyrules.js').split('/* ---------- weapon rules')[0].replace(/class PyErr[^\n]*\n/, '') + rd('pyengine.js') + rd('practice.js') + rd('assistant.js') +
  ';this.PE=PyEngine();this.PRACTICE=PRACTICE;this.pySyntax=pySyntax;this.Assistant=Assistant;this.KB=KB;this.WEAPONS=WEAPONS;this.CFG=CFG;this.LEVELS=LEVELS;', ctx);
const { PE, PRACTICE, pySyntax, Assistant, KB, WEAPONS, CFG } = ctx; let fails = 0; const t = (n, c) => { if (!c) { fails++; console.log('FAIL', n); } };
const run = (code, spec) => { const ind = pySyntax(code); return ind ? { status: 'fail', kind: 'indent', message: ind } : PE.runTests(code, spec); };
const spec = (fn, tests, hidden) => ({ fn, params: ['x'], tests, hidden });
// ---------- engine ----------
const eng = (body, args, expect) => PE.runTests(body, spec('f', [{ args, expect }]));
t('arithmetic, precedence and Python division', eng('def f(a):\n    return a + 2 * 3 - 4 // 3 + 7 % 4', [1], 1 + 6 - 1 + 3).status === 'ok' && eng('def f(a):\n    return 7 / 2', [0], 3.5).status === 'ok' && eng('def f(a):\n    return -7 // 2', [0], -4).status === 'ok' && eng('def f(a):\n    return -7 % 3', [0], 2).status === 'ok' && eng('def f(a):\n    return 2 ** 3 ** 2', [0], 512).status === 'ok');
t('strings, lists, dicts, tuples and slicing', eng('def f(a):\n    d = {"x": 1}\n    d["y"] = 2\n    l = [1, 2, 3][1:]\n    return [len(d), l, "ab" * 2 + "c", (1, 2)[0]]', [0], [2, [2, 3], 'ababc', 1]).status === 'ok');
t('loops with break/continue, while, range', eng('def f(n):\n    t = 0\n    for i in range(n):\n        if i == 2:\n            continue\n        if i == 5:\n            break\n        t += i\n    k = 0\n    while k < 3:\n        k += 1\n    return t + k', [10], 0 + 1 + 3 + 4 + 3).status === 'ok');
t('comprehensions, ternary, and/or/not, in/not in', eng('def f(n):\n    return [x * 2 for x in range(n) if x % 2 == 0], ("big" if n > 3 else "small"), (n > 1 and n < 9), (not n), (n in [1, 4]), (n not in [1])', [4], [[0, 4], 'big', true, false, true, true]).status === 'ok');
t('recursion works and runaway recursion is reported', eng('def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)', [5], 120).status === 'ok' && /RecursionError/.test(eng('def f(n):\n    return f(n)', [1], 1).message));
t('default arguments, nested calls and helper functions', PE.runTests('def helper(a, b=10):\n    return a + b\ndef f(x):\n    return helper(x) + helper(x, 1)', spec('f', [{ args: [1], expect: 11 + 2 }])).status === 'ok');
t('mutation through references (lists and dicts)', PE.runTests('def f(d):\n    d["k"] = d["k"] + 1\n    d["l"].append(9)\n    return len(d["l"])', spec('f', [{ args: [{ k: 1, l: [1] }], expect: 2, after: [{ k: 2, l: [1, 9] }] }])).status === 'ok');
t('endless loops stop with a clear runtime error', /TimeoutError/.test(eng('def f(a):\n    while True:\n        a += 1', [1], 1).message));
let r = eng('def f(a):\n    return a / 0', [1], 1); t('ZeroDivisionError is a runtime error with a line number', r.kind === 'runtime' && /ZeroDivisionError/.test(r.message) && r.line === 2);
r = eng('def f(a):\n    return missing + 1', [1], 1); t('NameError', r.kind === 'runtime' && /NameError.*missing/.test(r.message));
r = eng('def f(a):\n    return "a" + 1', [1], 1); t('TypeError', r.kind === 'runtime' && /TypeError/.test(r.message));
r = eng('def f(a):\n    return [1][5]', [1], 1); t('IndexError', /IndexError/.test(r.message));
r = eng('def f(a)\n    return a', [1], 1); t('missing colon is a syntax error on line 1', r.kind === 'syntax' && r.line === 1);
r = eng('def f(a):\n    return (a + ', [1], 1); t('unclosed bracket is a syntax error', r.kind === 'syntax');
r = eng('def f(a):\nreturn a', [1], 1); t('missing indented block is reported by the engine too', r.kind === 'indent');
r = eng('class A:\n    pass\ndef f(a):\n    return a', [1], 1); t('classes are reported as not supported (not as an error in the code)', r.kind === 'unsupported' && /not supported/.test(r.message));
r = eng('def g(a):\n    return a', [1], 1); t('missing function name is explained', r.kind === 'logic' && /named f/.test(r.message));
r = eng('def f(a):\n    print(a)', [1], 1); t('printing instead of returning is an OUTPUT error', r.kind === 'output' && /return/.test(r.message));
r = eng('def f(a):\n    return "1"', [1], 1); t('wrong type is an OUTPUT error', r.kind === 'output' && /str/.test(r.message));
r = eng('def f(a):\n    return a + 1', [1], 5); t('wrong value is a LOGIC error showing input, got and expected', r.kind === 'logic' && /f\(1\) returned 2/.test(r.message) && /expects 5/.test(r.message));
// ---------- exercises ----------
const coding = PRACTICE.filter(x => x.type !== 'predict'), predict = PRACTICE.filter(x => x.type === 'predict');
t('about 85% of the exercises are real coding (' + coding.length + ' of ' + PRACTICE.length + ')', coding.length / PRACTICE.length >= .8 && predict.length >= 2);
t('ids are unique and difficulty never goes down', new Set(PRACTICE.map(x => x.id)).size === PRACTICE.length && PRACTICE.every((x, i) => i === 0 || x.level >= PRACTICE[i - 1].level) && PRACTICE[0].level === 0 && PRACTICE[PRACTICE.length - 1].level === 3);
for (const x of coding) {
  t(x.id + ' prompt names the function, its parameters, the return and an example', x.prompt.includes(x.fn) && x.params.every(p => x.prompt.includes(p) || /accepts|receives/.test(x.prompt)) && /return/i.test(x.prompt) && /(For example|should return|returns?\s)/i.test(x.prompt) && /[.?]$/.test(x.prompt.trim()) && x.prompt.length > 120);
  t(x.id + ' reference solution passes every test', run(x.sol, x).status === 'ok');
  t(x.id + ' starter code is not already a solution', run(x.starter, x).status !== 'ok');
  t(x.id + ' has hint, explanation and hidden edge cases', !!x.hint && !!x.why && x.hidden.length >= 2);
  t(x.id + ' solution layout follows the 4-space rule', pySyntax(x.sol) === '' && pySyntax(x.starter) === '');
}
for (const x of predict) t(x.id + ' predict question has the code and one clear answer', /def /.test(x.prompt) && x.answers.length >= 1 && /Type only/.test(x.prompt));
// ---------- alternative correct answers, and meaningful failures ----------
const byId = id => PRACTICE.find(x => x.id === id);
t('different correct styles are accepted (max, comprehension, sum)', run('def calculate_damage(base_damage, defense):\n    return max(0, base_damage - defense)', byId('p1')).status === 'ok' && run('def count_alive(enemies):\n    return len([e for e in enemies if e["hp"] > 0])', byId('p6')).status === 'ok' && run('def total_ammo(inventory):\n    return sum(inventory.values())', byId('p7')).status === 'ok' && run('def wave_enemy_count(level):\n    n = 5\n    for i in range(level - 1):\n        n += 3\n    return n', byId('p16')).status === 'ok');
r = run('def calculate_damage(base_damage, defense):\n    return base_damage - defense', byId('p1')); t('forgetting the zero floor is a LOGIC error (public example)', r.kind === 'logic' && /calculate_damage\(10, 15\) returned -5/.test(r.message));
r = run('def safe_heal(health, amount, max_health):\n    return min(health + amount, max_health)', byId('p9')); t('missing a rule is found by the examples', r.kind === 'logic');
r = run('def health_status(health):\n    if health < 20:\n        return "critical"\n    elif health <= 50:\n        return "low"\n    else:\n        return "healthy"', byId('p5')); t('an off-by-one boundary is caught by hidden tests with a hint about boundaries', r.kind === 'logic' && /hidden/.test(r.message) && /boundary/.test(r.message));
r = run('def apply_damage(player, damage):\n    return max(0, player["health"] - damage)', byId('p11')); t('forgetting to change the dictionary is a LOGIC error that says so', r.kind === 'logic' && /should also be changed/.test(r.message));
t('indentation errors are reported before anything runs, never as logic errors', run('def calculate_damage(base_damage, defense):\nif base_damage > defense:\n        return base_damage - defense\n    else:\n        return 0', byId('p1')).kind === 'indent');
t('a long valid solution (more than 4 lines) is accepted', run(byId('p10').sol, byId('p10')).status === 'ok' && byId('p10').sol.split('\n').length > 4);
t('multiline expressions are valid in exercises', run('def total_score(kills, bonus):\n    return (kills * 10 +\n        bonus)', byId('p2')).status === 'ok');
// ---------- assistant: accuracy against the real game data ----------
const ans = q => Assistant.answer(q), has = (q, re) => re.test(ans(q).text);
t('controls answer lists the real keys', has('How do I move and shoot?', /W A S D/) && has('what are the controls', /R reloads.*B throws a bomb/));
t('reload answer matches the 30-round tuple rule', ans('how do I reload').id === 'reload' && /30 rounds/.test(ans('how do I reload').text) && WEAPONS.pistol.mag === 30);
t('weapon prices in the notes equal the real prices', ['smg', 'shotgun', 'rifle', 'sniper'].every(k => ans('what weapons are there?').text.includes(String(WEAPONS[k].price))) && ans('how does the gun market work').text.includes('200 credits'));
t('bomb numbers equal the real configuration', new RegExp('start with ' + CFG.bombs + ' bombs').test(ans('how many bombs do I get').text) && new RegExp('carry ' + CFG.maxBombs).test(ans('how many bombs do I get').text));
t('Python concept questions are answered', ans('what is a tuple').id === 'tuple' && ans('what is a dictionary in python').id === 'dict' && ans('how do loops work').id === 'loop' && ans('difference between print and return').id === 'function');
t('practice and indentation questions point to the real features', ans('how does practice mode work').id === 'practice' && /4 spaces/.test(ans('how many spaces for indentation').text));
t('contact answer has the exact X link and email', /https:\/\/x\.com\/GHOST_CTS_3/.test(ans('how can I contact the creator').text) && /iamhailstones@gmail\.com/.test(ans('what is your email').text));
t('unimplemented features are clearly marked as not implemented', /not implemented/i.test(ans('is there online multiplayer?').text) && /not supported there yet/.test(ans('does practice support classes and try except').text));
t('unfamiliar game questions get an honest reply, not an invention', ans('what is the secret code for infinite lives in the game').id === 'unsure' && /don't want to guess/.test(ans('what is the secret code for infinite lives in the game').text));
t('unrelated questions are handled politely and honestly', ans('what is the weather in Lagos').id === 'offtopic' && /offline/.test(ans('what is the weather in Lagos').text));
t('empty input and odd input do not break it', !!ans('').text && !!ans('???').text && !!ans('x'.repeat(500)).text);
t('every note has keywords and a real answer', KB.every(e => e.k.length >= 2 && e.a.length > 25 && !/\bTODO\b/.test(e.a)));
console.log(fails ? fails + ' check(s) failed' : 'All practice, engine and assistant checks passed'); process.exit(fails ? 1 : 0);
