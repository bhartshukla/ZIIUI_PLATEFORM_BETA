/* Entry point for docs.html — collapsible sidebar and scroll-spy. */
import '../styles/docs.css';
import { copyText } from '../lib/clipboard.js';


        /* ---------- Year ---------- */
        document.getElementById('year').textContent = new Date().getFullYear();

        /* ---------- Sidebar collapsible categories ---------- */
        document.querySelectorAll('[data-toggle]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var expanded = btn.getAttribute('aria-expanded') === 'true';
                var targetId = btn.getAttribute('aria-controls');
                var target = document.getElementById(targetId);

                btn.setAttribute('aria-expanded', String(!expanded));
                if (target) target.hidden = expanded;
            });
        });

        /* ---------- Active link highlighting (scroll spy) ---------- */
        (function () {
            var links = Array.from(document.querySelectorAll('.sidebar__link'));
            var sections = links
                .map(function (link) {
                    var id = link.getAttribute('href').slice(1);
                    return document.getElementById(id);
                })
                .filter(Boolean);

            if (!('IntersectionObserver' in window)) return;

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var id = entry.target.id;
                        links.forEach(function (link) {
                            var match = link.getAttribute('href') === '#' + id;
                            link.classList.toggle('is-active', match);
                        });
                    }
                });
            }, {
                rootMargin: '-20% 0px -70% 0px',
                threshold: 0
            });

            sections.forEach(function (section) { observer.observe(section); });
        })();

        /* ---------- Code copy buttons ---------- */
        document.querySelectorAll('[data-copy]').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var target = document.querySelector(btn.dataset.copy);
                if (!target) return;

                var original = btn.innerHTML;
                try {
                    var copied = await copyText(target.innerText);
                    btn.innerHTML = copied
                        ? '<i class="ri-check-line" aria-hidden="true"></i> Copied'
                        : '<i class="ri-error-warning-line" aria-hidden="true"></i> Copy failed';
                } catch (err) {
                    console.error('[ziiui:docs-copy]', err);
                    btn.innerHTML = '<i class="ri-error-warning-line" aria-hidden="true"></i> Copy failed';
                }
                setTimeout(function () { btn.innerHTML = original; }, 1600);
            });
        });

        /* ---------- Smooth scroll with fixed header offset ---------- */
        document.querySelectorAll('a[href^="#"]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                var id = a.getAttribute('href').slice(1);
                if (!id) return;
                var target = document.getElementById(id);
                if (!target) return;
                e.preventDefault();
                var top = target.getBoundingClientRect().top + window.scrollY - 72;
                window.scrollTo({ top: top, behavior: 'smooth' });
                history.replaceState(null, '', '#' + id);
            });
        });
    
