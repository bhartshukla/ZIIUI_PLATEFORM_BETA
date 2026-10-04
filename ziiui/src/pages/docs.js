/* Entry point for docs.html — collapsible sidebar and scroll-spy. */
import '../styles/docs.css';


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

                var text = target.innerText;

                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text);
                    } else {
                        var ta = document.createElement('textarea');
                        ta.value = text;
                        ta.setAttribute('readonly', '');
                        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        ta.remove();
                    }

                    var original = btn.innerHTML;
                    btn.innerHTML = '<i class="ri-check-line" aria-hidden="true"></i> Copied';
                    setTimeout(function () { btn.innerHTML = original; }, 1600);
                } catch (err) {
                    var orig = btn.innerHTML;
                    btn.innerHTML = '<i class="ri-error-warning-line" aria-hidden="true"></i> Failed';
                    setTimeout(function () { btn.innerHTML = orig; }, 1600);
                }
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
    
