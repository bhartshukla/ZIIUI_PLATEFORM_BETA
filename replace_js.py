import re

with open('portB1.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the carousel interaction section
old_js = '''      /* 4. HORIZONTAL HERO CAROUSEL INTERACTION (ZiiUI imageflow adaptation) */
      const carouselTrack = document.getElementById('carouselTrack');
      const carouselNextBtn = document.getElementById('carouselNextBtn');
      let currentOffset = 0;
      const maxOffset = -320; // Allows smooth slide to inspect right side

      function slideCarousel(forward = true) {
        if (!carouselTrack) return;
        if (forward) {
          currentOffset = currentOffset === 0 ? maxOffset : 0;
        } else {
          currentOffset = 0;
        }
        gsap.to(carouselTrack, {
          x: currentOffset,
          duration: 0.7,
          ease: 'power3.out'
        });
      }

      if (carouselNextBtn) {
        carouselNextBtn.addEventListener('click', () => slideCarousel(true));
      }

      /* Touch/drag support for carousel */
      let isDragging = false;
      let startX = 0;
      let trackStartX = 0;

      if (carouselTrack) {
        carouselTrack.addEventListener('mousedown', (e) => {
          isDragging = true;
          startX = e.clientX;
          trackStartX = currentOffset;
        });

        window.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const diff = e.clientX - startX;
          const targetX = Math.max(maxOffset * 1.2, Math.min(60, trackStartX + diff));
          gsap.set(carouselTrack, { x: targetX });
        });

        window.addEventListener('mouseup', (e) => {
          if (!isDragging) return;
          isDragging = false;
          const diff = e.clientX - startX;
          if (diff < -60) {
            currentOffset = maxOffset;
          } else if (diff > 60) {
            currentOffset = 0;
          }
          gsap.to(carouselTrack, { x: currentOffset, duration: 0.5, ease: 'power2.out' });
        });
      }'''

new_js = '''      /* 4. INFINITE HERO MARQUEE - GO BUTTON SCROLL TO PROJECTS */
      const marqueeGoBtn = document.getElementById('marqueeGoBtn');
      const marqueeTrack = document.getElementById('marqueeTrack');
      const heroMarqueeWrap = document.getElementById('heroMarqueeWrap');

      // GO Button: Smooth scroll to Recent Projects section
      if (marqueeGoBtn) {
        marqueeGoBtn.addEventListener('click', () => {
          const workSection = document.getElementById('work');
          if (workSection && lenis) {
            lenis.scrollTo(workSection, { offset: 0, immediate: false });
          } else if (workSection) {
            workSection.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }

      // Pause marquee on hover/focus (handled by CSS, but ensure keyboard accessibility)
      if (heroMarqueeWrap) {
        heroMarqueeWrap.addEventListener('mouseenter', () => {
          if (marqueeTrack) marqueeTrack.style.animationPlayState = 'paused';
        });
        heroMarqueeWrap.addEventListener('mouseleave', () => {
          if (marqueeTrack) marqueeTrack.style.animationPlayState = 'running';
        });
        heroMarqueeWrap.addEventListener('focusin', () => {
          if (marqueeTrack) marqueeTrack.style.animationPlayState = 'paused';
        });
        heroMarqueeWrap.addEventListener('focusout', () => {
          if (marqueeTrack) marqueeTrack.style.animationPlayState = 'running';
        });
      }

      // Touch support for marquee - allow natural scrolling
      if (marqueeTrack) {
        let touchStartX = 0;
        let isTouching = false;

        marqueeTrack.addEventListener('touchstart', (e) => {
          isTouching = true;
          touchStartX = e.touches[0].clientX;
          marqueeTrack.style.animationPlayState = 'paused';
        }, { passive: true });

        marqueeTrack.addEventListener('touchend', () => {
          isTouching = false;
          marqueeTrack.style.animationPlayState = 'running';
        }, { passive: true });

        marqueeTrack.addEventListener('touchcancel', () => {
          isTouching = false;
          marqueeTrack.style.animationPlayState = 'running';
        }, { passive: true });
      }'''

if old_js in content:
    new_content = content.replace(old_js, new_js)
    with open('portB1.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('JavaScript replacement done successfully')
else:
    print('Old JS not found - trying alternative search')
    # Try to find a subset
    idx = content.find('HORIZONTAL HERO CAROUSEL INTERACTION')
    if idx != -1:
        print(f'Found at index {idx}')
        print(content[idx:idx+200])
    else:
        print('Not found at all')