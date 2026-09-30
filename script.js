
        'use strict';

        const $ = id => document.getElementById(id);
        const MAX = 3000, DEBOUNCE = 250, PLACEHOLDER = 'Your text here';
        const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const ind = s => s.split('\n').map(l => l ? '  ' + l : l).join('\n');
        const norm = s => s.replace(/\r\n?/g, '\n');

        /* ---------- Template helpers ---------- */

        // Read a code template from the inert text/plain blocks above.
        const tpl = id => $(id).textContent.replace(/^\r?\n/, '').replace(/\s+$/, '');

        // Replace @@KEY@@ placeholders. The function form of replace means "$&" etc. in values stay literal.
        const fill = (s, map) => s.replace(/@@(\w+)@@/g, (m, k) => (k in map ? String(map[k]) : m));

        // Closing tags are assembled at runtime so this source never contains those literal tags.
        // (VS Code Live Server injects its reload script at the first closing body tag it finds in the file text,
        // which is what caused "Unexpected end of input" when that tag appeared inside a JS string.)
        const closeTag = name => '</' + name + '>';

        /* ---------- Generated page builder ---------- */

        function page(css, js) {
            const parts = [
                '<!DOCTYPE html>',
                '<html lang="en">',
                '<head>',
                '<meta charset="UTF-8">',
                '<meta name="viewport" content="width=device-width, initial-scale=1">',
                '<title>Text Effect</title>',
                '<style>',
                ind(tpl('t-base-css') + '\n' + css),
                closeTag('style'),
                closeTag('head'),
                '<body>',
                '',
                '<p id="t">__TEXT__</p>'
            ];
            if (js !== null) {
                parts.push('', '<script>', ind(fill(tpl('t-wrap'), { BODY: ind(js) })), closeTag('script'));
            }
            parts.push('', closeTag('body'), closeTag('html'));
            return parts.join('\n');
        }

        const graphemesJs = () => tpl('t-graphemes');
        const buildJs = () => graphemesJs() + '\n\n' + tpl('t-build');

        const STAG = { char: .03, word: .05, line: .1 };
        const PRE = {
            'fade': { h: 'opacity: 0;', s: 'opacity: 1;', t: 'opacity .5s ease' },
            'blur': { h: 'opacity: 0; filter: blur(12px);', s: 'opacity: 1; filter: blur(0);', t: 'opacity .5s ease, filter .5s ease' },
            'fade-in-blur': { h: 'opacity: 0; filter: blur(12px); transform: translateY(20px);', s: 'opacity: 1; filter: blur(0); transform: none;', t: 'opacity .5s ease, filter .5s ease, transform .5s ease' },
            'scale': { h: 'opacity: 0; transform: scale(0);', s: 'opacity: 1; transform: scale(1);', t: 'opacity .5s ease, transform .5s ease' },
            'slide': { h: 'opacity: 0; transform: translateY(20px);', s: 'opacity: 1; transform: none;', t: 'opacity .5s ease, transform .5s ease' }
        };

        function splitJs(per) {
            if (per === 'char') return buildJs() + '\n\n' + tpl('t-split-char');
            if (per === 'word') return tpl('t-split-word');
            return tpl('t-split-line');
        }

        function rollPage(o) {
            const css = fill(tpl('t-roll-css'), {
                WCSS: tpl('t-wcss'), DUR: o.dur, EASE: o.ease, FROM: o.from, TO: o.to
            });
            const js = buildJs() + '\n\n' + fill(tpl('t-roll-js'), { A: o.a, B: o.b });
            return page(css, js);
        }

        function wavePage(o) {
            const vals = { BASE: o.base, GRAD: o.grad, Z: o.z, S: o.s, R: o.r };
            const css = fill(tpl('t-wave-css'), { WCSS: tpl('t-wcss'), BASE: o.base });
            const js = buildJs() + '\n\n' + fill(tpl('t-wave-js'), vals);
            return page(css, js);
        }

        const EFFECTS = [
            {
                id: 'effect', name: 'Text Effect', note: 'Split by char, word or line',
                text: 'Animate your ideas with motion-primitives', opts: true,
                code: (per, pre) => {
                    const p = PRE[pre];
                    const css = fill(tpl('t-effect-css'), {
                        WCSS: per === 'char' ? tpl('t-wcss') + '\n' : '',
                        DISPLAY: per === 'line' ? 'block' : 'inline-block',
                        MINH: per === 'line' ? ' min-height: 1.2em;' : '',
                        HIDDEN: p.h,
                        TRANS: p.t,
                        STAG: STAG[per],
                        SHOWN: p.s
                    });
                    return page(css, splitJs(per) + '\n' + tpl('t-tail'));
                }
            },
            {
                id: 'fancy', name: 'Custom Variants', note: 'Random spring, rotation, colour',
                text: 'Animate your ideas with motion-primitives',
                code: () => page(tpl('t-fancy-css'), tpl('t-fancy-js'))
            },
            {
                id: 'roll', name: 'Text Roll', note: 'Letters roll up in sequence', text: 'motion-primitives',
                code: () => rollPage({ dur: .5, ease: 'cubic-bezier(.4,0,.2,1)', from: '100%', to: '-100%', a: .1, b: .2 })
            },
            {
                id: 'roll2', name: 'Text Roll (custom)', note: 'Rolls down, custom easing', text: 'motion-primitives',
                code: () => rollPage({ dur: .3, ease: 'cubic-bezier(.175,.885,.32,1.1)', from: '-100%', to: '100%', a: .05, b: .05 })
            },
            {
                id: 'scramble', name: 'Text Scramble', note: 'Random glyphs resolve to text', text: 'Text Scramble',
                code: () => page(tpl('t-scramble-css'), graphemesJs() + '\n\n' + tpl('t-scramble-js'))
            },
            {
                id: 'shimmer', name: 'Text Shimmer', note: 'Light sweep across text', text: 'Generating code...',
                code: () => page(tpl('t-shimmer-css'), null)
            },
            {
                id: 'wave', name: 'Shimmer Wave', note: '3D wave through each letter', text: 'Generating code...',
                code: () => wavePage({ base: '#71717a', grad: '#ffffff', z: 10, s: 1.1, r: 10 })
            },
            {
                id: 'wave2', name: 'Shimmer Wave (colour)', note: 'Blue wave, custom depth', text: 'Creating the perfect dish...',
                code: () => wavePage({ base: '#0D74CE', grad: '#5EB1EF', z: 1, s: 1.1, r: 20 })
            }
        ];

        /* ---------- Lab logic ---------- */
        // buildTimer is only the input debounce. Replay reloads the preview; it only flushes a pending build.
        let cur = EFFECTS[0], html = '', buildTimer = null, nonce = 0, dirty = false, copyBusy = false, copyReset = null;

        const say = msg => { $('status').textContent = ''; setTimeout(() => { $('status').textContent = msg; }, 30); };

        function rebuild() {
            clearTimeout(buildTimer);
            buildTimer = null;
            try {
                const raw = norm($('text').value);
                const empty = !raw.trim();
                const gen = cur.opts ? cur.code($('per').value, $('preset').value) : cur.code();
                // Replace the text last, with a function, so user input is never re-processed and "$&" stays literal.
                html = gen.replace('__TEXT__', () => esc(empty ? PLACEHOLDER : raw));
                $('code').textContent = html;
                $('label').textContent = cur.name + (cur.opts ? ' \u00b7 ' + $('per').value + ' \u00b7 ' + $('preset').value : '');
                $('frame').title = 'Preview of ' + cur.name;
                updateHint(empty);
                play();
            } catch (err) {
                $('code').textContent = 'Could not build this effect: ' + err.message;
                html = '';
            }
        }

        // Reload the sandboxed preview from the start; the changing comment forces srcdoc to reload every time.
        function play() {
            if (!html) return;
            nonce++;
            $('frame').srcdoc = html + '\n<!-- ' + nonce + ' -->';
        }

        function updateHint(empty, trimmed) {
            const h = $('hint'), n = $('text').value.length;
            h.classList.toggle('warn', !!trimmed);
            h.textContent = trimmed ? 'Text was trimmed to ' + MAX.toLocaleString() + ' characters to keep the preview fast.'
                : empty ? 'Text is empty, so the placeholder is shown. Type to replace it.'
                    : n.toLocaleString() + ' / ' + MAX.toLocaleString() + ' characters';
        }

        function scheduleBuild() {
            clearTimeout(buildTimer);
            buildTimer = setTimeout(rebuild, DEBOUNCE);
        }

        function flushBuild() {
            if (buildTimer) rebuild();
        }

        function replay() {
            if (buildTimer) rebuild(); // pending edit: rebuild (which also plays)
            else play();               // otherwise reload the preview from the beginning
        }

        function onInput() {
            dirty = true;
            const ta = $('text');
            let trimmed = false;
            if (ta.value.length > MAX) {
                let v = ta.value.slice(0, MAX);
                if (/[\uD800-\uDBFF]$/.test(v)) v = v.slice(0, -1); // don't cut an emoji in half
                ta.value = v;
                trimmed = true;
            }
            updateHint(!ta.value.trim(), trimmed);
            scheduleBuild();
        }

        function selectEffect(e) {
            cur = e;
            if (!dirty) $('text').value = e.text;
            $('opts').hidden = !e.opts;
            Array.from($('nav').children).forEach(b => {
                if (b.dataset.id === e.id) b.setAttribute('aria-current', 'true');
                else b.removeAttribute('aria-current');
            });
            rebuild();
        }

        EFFECTS.forEach(e => {
            const b = document.createElement('button');
            const n = document.createElement('b');
            const d = document.createElement('span');
            b.type = 'button';
            b.dataset.id = e.id;
            n.textContent = e.name;
            d.textContent = e.note;
            b.append(n, d);
            b.addEventListener('click', () => selectEffect(e));
            $('nav').append(b);
        });

        /* ---------- Copy ---------- */
        function legacyCopy(s) {
            const prev = document.activeElement;
            const ta = document.createElement('textarea');
            ta.value = s;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
            document.body.appendChild(ta);
            let ok = false;
            try {
                ta.select();
                ta.setSelectionRange(0, s.length);
                ok = document.execCommand('copy');
            } catch (_) {
                ok = false;
            }
            ta.remove();
            if (prev && prev.focus) prev.focus();
            return ok;
        }

        async function copyText(s) {
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(s);
                    return true;
                } catch (_) { /* fall through to legacy copy */ }
            }
            return legacyCopy(s);
        }

        async function onCopy() {
            if (copyBusy) return;
            flushBuild();
            if (!html) return;
            copyBusy = true;
            const btn = $('copy');
            const ok = await copyText(html);
            btn.textContent = ok ? 'Copied!' : 'Copy failed';
            btn.dataset.state = ok ? 'ok' : 'fail';
            say(ok ? 'Code copied to clipboard' : 'Copy failed. Select the code and copy it manually.');
            clearTimeout(copyReset);
            copyReset = setTimeout(() => {
                btn.textContent = 'Copy code';
                delete btn.dataset.state;
                copyBusy = false;
            }, 1800);
        }

        /* ---------- Wiring ---------- */
        ['per', 'preset'].forEach(id => $(id).addEventListener('change', rebuild));
        $('text').addEventListener('input', onInput);
        $('replay').addEventListener('click', replay);
        $('copy').addEventListener('click', onCopy);

        selectEffect(EFFECTS[0]);
