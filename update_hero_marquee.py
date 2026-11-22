# Python script to update Hero Full-Width Heading & Infinite Project Marquee in portB1.html
import re

with open('portB1.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Hero CSS
# Replace old hero heading and carousel CSS with the new full-width typography, infinite marquee, and GO button styles

old_hero_css = """    /* Oversized Hero Heading: Rezza Aldy */
    .hero-heading-wrap {
      width: 100%;
      overflow: hidden;
      margin-bottom: 2.2rem;
    }

    .hero-heading {
      font-size: clamp(4.4rem, 14vw, 12rem);
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 0.92;
      color: var(--text-black);
      white-space: nowrap;
      margin: 0;
      user-select: none;
    }

    /* ==========================================================================
       5. HORIZONTAL PROJECT CAROUSEL (HERO SHOWCASE)
       ========================================================================== */
    .hero-carousel-container {
      position: relative;
      width: 100%;
      overflow: visible;
    }

    .carousel-track {
      display: flex;
      align-items: flex-start;
      gap: 1.5rem;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: grab;
    }

    .carousel-track:active {
      cursor: grabbing;
    }"""

new_hero_css = """    /* Full-Width Hero Heading: Rezza Aldy (ZiiUI editorial typography) */
    .hero-heading-wrap {
      width: 100%;
      overflow: hidden;
      margin-top: 0.2rem;
      margin-bottom: clamp(1.2rem, 2.5vw, 2.2rem);
    }

    .hero-heading {
      font-size: clamp(3.6rem, 15.6vw, 14.8rem);
      font-weight: 800;
      letter-spacing: -0.048em;
      line-height: 0.88;
      color: var(--text-black);
      white-space: nowrap;
      margin: 0;
      user-select: none;
      display: block;
      width: 100%;
      text-rendering: optimizeLegibility;
    }

    /* ==========================================================================
       5. INFINITE HORIZONTAL PROJECT MARQUEE (ZIIUI IMAGEFLOW ARCHITECTURE)
       ========================================================================== */
    .hero-marquee-viewport {
      position: relative;
      width: 100%;
      overflow: hidden;
      padding: 0.6rem 0 1.2rem 0;
      user-select: none;
      -webkit-user-select: none;
    }

    @keyframes heroMarqueeLinear {
      0% {
        transform: translate3d(0, 0, 0);
      }
      100% {
        transform: translate3d(-50%, 0, 0);
      }
    }

    .hero-marquee-track {
      display: flex;
      align-items: flex-start;
      gap: 1.5rem;
      width: max-content;
      will-change: transform;
      animation: heroMarqueeLinear 82s linear infinite;
    }

    .hero-marquee-viewport:hover .hero-marquee-track {
      animation-play-state: paused;
    }

    /* Marquee Card Base */
    .marquee-card {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      cursor: pointer;
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .marquee-card:hover {
      transform: translateY(-4px);
    }

    .marquee-card-surface {
      border-radius: var(--radius-xl);
      overflow: hidden;
      position: relative;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.07);
    }

    /* Soft edge gradient fades on marquee */
    .marquee-edge-fade-left,
    .marquee-edge-fade-right {
      position: absolute;
      top: 0;
      bottom: 0;
      width: clamp(30px, 6vw, 100px);
      pointer-events: none;
      z-index: 15;
    }

    .marquee-edge-fade-left {
      left: 0;
      background: linear-gradient(90deg, var(--bg-main) 0%, rgba(249, 248, 246, 0) 100%);
    }

    .marquee-edge-fade-right {
      right: 0;
      background: linear-gradient(270deg, var(--bg-main) 0%, rgba(249, 248, 246, 0) 100%);
    }

    /* GO Button Floating Over Right Side of Marquee */
    .hero-marquee-go-wrap {
      position: absolute;
      right: clamp(1rem, 3.5vw, 2.5rem);
      top: 50%;
      transform: translateY(-50%);
      z-index: 25;
      pointer-events: auto;
    }

    .btn-go-marquee {
      width: clamp(48px, 4.2vw, 56px);
      height: clamp(48px, 4.2vw, 56px);
      border-radius: 50%;
      background-color: var(--accent-orange);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 22px rgba(231, 90, 52, 0.45);
      border: 2px solid #FFFFFF;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.28s ease;
    }

    .btn-go-marquee i {
      font-size: 1.4rem;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: inline-block;
    }

    .btn-go-marquee:hover {
      transform: scale(1.08);
      background-color: var(--accent-orange-hover);
      box-shadow: 0 8px 28px rgba(231, 90, 52, 0.55);
    }

    .btn-go-marquee:hover i {
      transform: translateX(4px);
    }

    .btn-go-marquee:focus-visible {
      outline: 2px solid var(--accent-orange);
      outline-offset: 4px;
    }"""

if old_hero_css in html:
    html = html.replace(old_hero_css, new_hero_css)
    print("Replaced Hero CSS successfully.")
else:
    print("Warning: old_hero_css not found exactly, attempting normalized replace.")
    exit(1)

# 2. Update Media Queries for hero heading and marquee
old_mq = """    @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-mobile-toggle { display: block; }
      .hero-heading {
        font-size: clamp(3.2rem, 16vw, 5.5rem);
      }"""

new_mq = """    @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-mobile-toggle { display: block; }
      .hero-heading {
        font-size: clamp(2.8rem, 15.2vw, 6.2rem);
        letter-spacing: -0.038em;
        line-height: 0.92;
      }
    }
    @media (max-width: 420px) {
      .hero-heading {
        font-size: clamp(2.3rem, 14.5vw, 3.4rem);
        letter-spacing: -0.03em;
      }"""

if old_mq in html:
    html = html.replace(old_mq, new_mq)
    print("Updated responsive media queries for hero heading.")
else:
    print("Warning: old_mq not found.")

# Also add reduced motion rule for marquee track
old_rm = """    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        transition-duration: 0.001s !important;
      }
    }"""

new_rm = """    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        transition-duration: 0.001s !important;
      }
      .hero-marquee-track {
        animation: none !important;
        transform: none !important;
        overflow-x: auto;
      }
    }"""

if old_rm in html:
    html = html.replace(old_rm, new_rm)
    print("Updated prefers-reduced-motion rule.")

# 3. Replace Hero HTML with Full-Width Heading + Infinite Marquee + GO Button
# Find the hero section block
hero_html_pattern = re.compile(
    r'(<!-- 2\. HERO SECTION -->\s*<section class="hero-section" id="hero">.*?)(<!-- 3\. ABOUT ME SECTION)',
    re.DOTALL
)

new_hero_html = """<!-- 2. HERO SECTION -->
    <section class="hero-section" id="hero">
      <div class="container">
        <!-- Metadata Row: Digital Product Designer | 13:52 JKT | Grid Icon -->
        <div class="hero-meta-row">
          <div class="meta-role">Digital Product Designer</div>
          <div class="meta-time" id="heroLiveClock">13:52 JKT</div>
          <!-- Recreated Exact Orange Grid-Cross Icon -->
          <div class="meta-grid-icon" title="Studio Grid Cross">
            <svg viewBox="0 0 24 24">
              <line x1="4" y1="8.5" x2="20" y2="8.5" />
              <line x1="4" y1="15.5" x2="20" y2="15.5" />
              <line x1="8.5" y1="4" x2="8.5" y2="20" />
              <line x1="15.5" y1="4" x2="15.5" y2="20" />
            </svg>
          </div>
        </div>

        <!-- 1. FULL-WIDTH HERO HEADING: REZZA ALDY -->
        <div class="hero-heading-wrap">
          <h1 class="hero-heading" id="heroTitle">Rezza Aldy</h1>
        </div>
      </div>

      <!-- 2. INFINITE HORIZONTAL PROJECT MARQUEE (ZIIUI IMAGEFLOW ARCHITECTURE) -->
      <div class="hero-marquee-viewport" id="heroMarqueeViewport" aria-label="Selected Projects Showcase Marquee">
        <!-- Soft gradient edges for seamless emergence -->
        <div class="marquee-edge-fade-left" aria-hidden="true"></div>
        <div class="marquee-edge-fade-right" aria-hidden="true"></div>

        <!-- 3. PROMINENT ORANGE CIRCULAR GO BUTTON -->
        <div class="hero-marquee-go-wrap">
          <a href="#work" class="btn-go-marquee" id="heroGoProjectsBtn" aria-label="Go to selected projects" title="Go to selected projects">
            <i class="ri-arrow-right-line" aria-hidden="true"></i>
          </a>
        </div>

        <!-- Seamless Marquee Track (Set 1 + Duplicate Set 2) -->
        <div class="hero-marquee-track" id="heroMarqueeTrack">
          <!-- ==================== SEQUENCE SET 1 ==================== -->
          <!-- Card 1: Phone Mockup on dark concrete -->
          <div class="marquee-card" data-open-study="finora" style="width: clamp(280px, 24vw, 340px);" title="Click to view Finora case study">
            <div class="marquee-card-surface carousel-card-phone" style="width: 100%; height: clamp(380px, 32vw, 440px);">
              <div class="mockup-phone-frame">
                <div class="mockup-phone-screen">
                  <div class="phone-screen-top">
                    <span>9:41</span>
                    <i class="ri-wifi-line"></i>
                  </div>
                  <div class="phone-screen-user">
                    <div class="phone-user-avatar"></div>
                    <div>
                      <div class="phone-user-name">Dawi Hermaga</div>
                      <div style="font-size: 0.65rem; color: #64748B;">Senior Lead</div>
                    </div>
                  </div>
                  <div class="phone-screen-card">
                    <div class="phone-screen-row">
                      <span>Total Balance</span>
                      <span style="color: #0F172A;">$24,580.00</span>
                    </div>
                    <div class="phone-screen-chart-bar">
                      <div class="chart-col" style="height: 40%;"></div>
                      <div class="chart-col" style="height: 65%;"></div>
                      <div class="chart-col active"></div>
                      <div class="chart-col" style="height: 80%;"></div>
                      <div class="chart-col" style="height: 55%;"></div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px; font-size: 0.62rem; color: #475569; margin-top: 0.3rem;">
                    <div style="flex: 1; background: #F1F5F9; padding: 4px 6px; border-radius: 6px;">Send</div>
                    <div style="flex: 1; background: #F1F5F9; padding: 4px 6px; border-radius: 6px;">Receive</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Finora Wealth Studio</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- Card 2: Center Laptop Mockup (Geo Bee Geospatial) -->
          <div class="marquee-card" data-open-study="geobee" style="width: clamp(480px, 44vw, 640px);" title="Click to view Geo Bee Geospatial case study">
            <div class="marquee-card-surface carousel-card-laptop" style="width: 100%; height: clamp(380px, 32vw, 440px);">
              <div class="mockup-laptop">
                <div class="laptop-screen-bezel">
                  <div class="laptop-screen-content">
                    <div class="laptop-inner-nav">
                      <div class="laptop-brand">
                        <i class="ri-radar-line"></i>
                        <span>Geo Bee Geospatial</span>
                      </div>
                      <div class="laptop-nav-items">
                        <span>Product</span>
                        <span>Solutions</span>
                        <span>Research</span>
                      </div>
                    </div>
                    <div class="laptop-inner-hero">
                      <h2 class="laptop-hero-title">
                        Explore, Analyze, Decide<br />All in One Dashboard
                      </h2>
                      <button class="laptop-hero-btn">Explore Now &gt;</button>
                    </div>
                    <div style="font-size: 0.55rem; color: rgba(255,255,255,0.4); text-align: right; z-index: 2;">
                      v4.2 PRO
                    </div>
                  </div>
                </div>
                <div class="laptop-base">
                  <div class="laptop-notch"></div>
                </div>
              </div>
            </div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Geo Bee Geospatial</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- Card 3: Spatial Environment Card -->
          <div class="marquee-card" data-open-study="aura" style="width: clamp(280px, 24vw, 340px);" title="Click to view Aura Spatial Interfaces case study">
            <div class="marquee-card-surface carousel-card-peek" style="width: 100%; height: clamp(380px, 32vw, 440px);"></div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Aura Spatial Interfaces</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- Card 4: Meditation App Design Card -->
          <div class="marquee-card" data-open-study="meditation" style="width: clamp(380px, 34vw, 480px);" title="Click to view Meditation App Design case study">
            <div class="marquee-card-surface project-card-meditation" style="width: 100%; height: clamp(380px, 32vw, 440px); min-height: unset;">
              <!-- Screen 1: Purple Character Card -->
              <div class="meditation-screen-card meditation-screen-1">
                <div class="screen-char-img"></div>
                <div style="font-size: 0.75rem; font-weight: 700; line-height: 1.1;">Mindful<br />Meditation</div>
              </div>

              <!-- Screen 2: Yellow Mood Card -->
              <div class="meditation-screen-card meditation-screen-2">
                <div style="font-size: 0.7rem; font-weight: 700; margin-bottom: 0.4rem;">How are you<br />feeling today?</div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <div style="background: rgba(0,0,0,0.06); padding: 3px 6px; border-radius: 4px; font-size: 0.6rem;">Calm</div>
                  <div style="background: rgba(0,0,0,0.06); padding: 3px 6px; border-radius: 4px; font-size: 0.6rem;">Focused</div>
                </div>
              </div>

              <!-- Screen 3: Dark Audio Player Screen -->
              <div class="meditation-screen-card meditation-screen-3">
                <div style="font-size: 0.65rem; color: #A1A1AA; margin-bottom: 0.4rem;">Breathe in...</div>
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #27272A; margin: 0.4rem auto; display: flex; align-items: center; justify-content: center;">
                  <i class="ri-play-fill" style="font-size: 0.75rem; color: #FAFAFA;"></i>
                </div>
              </div>
            </div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Meditation App Suite</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- Card 5: Apex Financial Dashboard Card -->
          <div class="marquee-card" data-open-study="nexus" style="width: clamp(280px, 24vw, 340px);" title="Click to view Nexus Knowledge Graph case study">
            <div class="marquee-card-surface project-card-dark-ui" style="width: 100%; height: clamp(380px, 32vw, 440px); justify-content: center;">
              <div class="dark-ui-screen-top" style="max-height: 200px;"></div>
              <div class="dark-ui-screen-bottom">
                <div class="dark-ui-bar"></div>
                <div class="dark-ui-bar short"></div>
              </div>
            </div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Nexus Knowledge Graph</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- ==================== EXACT DUPLICATED SEQUENCE SET 2 (SEAMLESS INFINITE LOOP) ==================== -->
          <!-- Duplicate Card 1 -->
          <div class="marquee-card" data-open-study="finora" style="width: clamp(280px, 24vw, 340px);" aria-hidden="true" tabindex="-1">
            <div class="marquee-card-surface carousel-card-phone" style="width: 100%; height: clamp(380px, 32vw, 440px);">
              <div class="mockup-phone-frame">
                <div class="mockup-phone-screen">
                  <div class="phone-screen-top">
                    <span>9:41</span>
                    <i class="ri-wifi-line"></i>
                  </div>
                  <div class="phone-screen-user">
                    <div class="phone-user-avatar"></div>
                    <div>
                      <div class="phone-user-name">Dawi Hermaga</div>
                      <div style="font-size: 0.65rem; color: #64748B;">Senior Lead</div>
                    </div>
                  </div>
                  <div class="phone-screen-card">
                    <div class="phone-screen-row">
                      <span>Total Balance</span>
                      <span style="color: #0F172A;">$24,580.00</span>
                    </div>
                    <div class="phone-screen-chart-bar">
                      <div class="chart-col" style="height: 40%;"></div>
                      <div class="chart-col" style="height: 65%;"></div>
                      <div class="chart-col active"></div>
                      <div class="chart-col" style="height: 80%;"></div>
                      <div class="chart-col" style="height: 55%;"></div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px; font-size: 0.62rem; color: #475569; margin-top: 0.3rem;">
                    <div style="flex: 1; background: #F1F5F9; padding: 4px 6px; border-radius: 6px;">Send</div>
                    <div style="flex: 1; background: #F1F5F9; padding: 4px 6px; border-radius: 6px;">Receive</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Finora Wealth Studio</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- Duplicate Card 2 -->
          <div class="marquee-card" data-open-study="geobee" style="width: clamp(480px, 44vw, 640px);" aria-hidden="true" tabindex="-1">
            <div class="marquee-card-surface carousel-card-laptop" style="width: 100%; height: clamp(380px, 32vw, 440px);">
              <div class="mockup-laptop">
                <div class="laptop-screen-bezel">
                  <div class="laptop-screen-content">
                    <div class="laptop-inner-nav">
                      <div class="laptop-brand">
                        <i class="ri-radar-line"></i>
                        <span>Geo Bee Geospatial</span>
                      </div>
                      <div class="laptop-nav-items">
                        <span>Product</span>
                        <span>Solutions</span>
                        <span>Research</span>
                      </div>
                    </div>
                    <div class="laptop-inner-hero">
                      <h2 class="laptop-hero-title">
                        Explore, Analyze, Decide<br />All in One Dashboard
                      </h2>
                      <button class="laptop-hero-btn">Explore Now &gt;</button>
                    </div>
                    <div style="font-size: 0.55rem; color: rgba(255,255,255,0.4); text-align: right; z-index: 2;">
                      v4.2 PRO
                    </div>
                  </div>
                </div>
                <div class="laptop-base">
                  <div class="laptop-notch"></div>
                </div>
              </div>
            </div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Geo Bee Geospatial</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- Duplicate Card 3 -->
          <div class="marquee-card" data-open-study="aura" style="width: clamp(280px, 24vw, 340px);" aria-hidden="true" tabindex="-1">
            <div class="marquee-card-surface carousel-card-peek" style="width: 100%; height: clamp(380px, 32vw, 440px);"></div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Aura Spatial Interfaces</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- Duplicate Card 4 -->
          <div class="marquee-card" data-open-study="meditation" style="width: clamp(380px, 34vw, 480px);" aria-hidden="true" tabindex="-1">
            <div class="marquee-card-surface project-card-meditation" style="width: 100%; height: clamp(380px, 32vw, 440px); min-height: unset;">
              <!-- Screen 1: Purple Character Card -->
              <div class="meditation-screen-card meditation-screen-1">
                <div class="screen-char-img"></div>
                <div style="font-size: 0.75rem; font-weight: 700; line-height: 1.1;">Mindful<br />Meditation</div>
              </div>

              <!-- Screen 2: Yellow Mood Card -->
              <div class="meditation-screen-card meditation-screen-2">
                <div style="font-size: 0.7rem; font-weight: 700; margin-bottom: 0.4rem;">How are you<br />feeling today?</div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <div style="background: rgba(0,0,0,0.06); padding: 3px 6px; border-radius: 4px; font-size: 0.6rem;">Calm</div>
                  <div style="background: rgba(0,0,0,0.06); padding: 3px 6px; border-radius: 4px; font-size: 0.6rem;">Focused</div>
                </div>
              </div>

              <!-- Screen 3: Dark Audio Player Screen -->
              <div class="meditation-screen-card meditation-screen-3">
                <div style="font-size: 0.65rem; color: #A1A1AA; margin-bottom: 0.4rem;">Breathe in...</div>
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #27272A; margin: 0.4rem auto; display: flex; align-items: center; justify-content: center;">
                  <i class="ri-play-fill" style="font-size: 0.75rem; color: #FAFAFA;"></i>
                </div>
              </div>
            </div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Meditation App Suite</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>

          <!-- Duplicate Card 5 -->
          <div class="marquee-card" data-open-study="nexus" style="width: clamp(280px, 24vw, 340px);" aria-hidden="true" tabindex="-1">
            <div class="marquee-card-surface project-card-dark-ui" style="width: 100%; height: clamp(380px, 32vw, 440px); justify-content: center;">
              <div class="dark-ui-screen-top" style="max-height: 200px;"></div>
              <div class="dark-ui-screen-bottom">
                <div class="dark-ui-bar"></div>
                <div class="dark-ui-bar short"></div>
              </div>
            </div>
            <div class="laptop-caption-row" style="padding: 0.15rem 0.35rem;">
              <span class="laptop-caption-title">Nexus Knowledge Graph</span>
              <span class="laptop-caption-year">2024</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    \\2"""

html, count = hero_html_pattern.subn(new_hero_html, html)
print(f"Substituted Hero HTML count: {count}")
if count != 1:
    print("Error: Could not substitute Hero HTML uniquely!")
    exit(1)

# 4. Update JavaScript to handle Marquee interactions and GO Button smooth scroll
old_js_carousel = """      /* 4. HORIZONTAL HERO CAROUSEL INTERACTION (ZiiUI imageflow adaptation) */
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
      }"""

new_js_marquee = """      /* 4. INFINITE HORIZONTAL PROJECT MARQUEE INTERACTION (ZiiUI imageflow architecture) */
      const marqueeViewport = document.getElementById('heroMarqueeViewport');
      const marqueeTrack = document.getElementById('heroMarqueeTrack');
      const heroGoBtn = document.getElementById('heroGoProjectsBtn');

      // GO Button Smooth Scroll to #work
      if (heroGoBtn) {
        heroGoBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById('work');
          if (target) {
            if (lenis) {
              lenis.scrollTo(target, { offset: -40, duration: 1.2 });
            } else {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }
        });
      }

      // Touch & Pointer interaction for seamless marquee pause and resume
      if (marqueeViewport && marqueeTrack) {
        // Pause on pointerenter, resume on pointerleave
        marqueeViewport.addEventListener('mouseenter', () => {
          marqueeTrack.style.animationPlayState = 'paused';
        });
        marqueeViewport.addEventListener('mouseleave', () => {
          marqueeTrack.style.animationPlayState = 'running';
        });

        // Touch support: pause while inspecting touch, resume smoothly on touchend
        marqueeViewport.addEventListener('touchstart', () => {
          marqueeTrack.style.animationPlayState = 'paused';
        }, { passive: true });

        marqueeViewport.addEventListener('touchend', () => {
          setTimeout(() => {
            marqueeTrack.style.animationPlayState = 'running';
          }, 400);
        }, { passive: true });
      }

      // Delegate click on marquee cards to open detailed case study drawer
      if (marqueeTrack) {
        marqueeTrack.addEventListener('click', (e) => {
          const card = e.target.closest('[data-open-study]');
          if (!card) return;
          const studyType = card.dataset.openStudy;
          
          if (studyType === 'geobee') {
            openDrawer(
              'Geo Bee Geospatial — 2024',
              `<div style="margin-bottom: 1.5rem;">
                 <span style="display:inline-block; padding: 4px 10px; background: #98F6D3; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; color: #064E3B; margin-bottom: 0.8rem;">ENTERPRISE GIS & SPATIAL ANALYTICS</span>
                 <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Explore, Analyze, Decide All in One Dashboard</h4>
                 <p style="color: #555; margin-bottom: 1rem;">Architected a scalable geographic information telemetry system for enterprise infrastructure mapping. Reduced user decision latency by 38% through real-time terrain visualization.</p>
                 <h5 style="font-weight: 700; margin-top: 1.2rem; margin-bottom: 0.3rem;">Core Deliverables</h5>
                 <ul style="padding-left: 1.2rem; color: #555;">
                   <li>High-density satellite telemetry and 3D terrain rendering engine</li>
                   <li>Responsive multi-node data filtering dashboard</li>
                   <li>Spatial layer measurement and polygon annotation tools</li>
                 </ul>
               </div>`
            );
          } else if (studyType === 'meditation') {
            openDrawer(
              'Meditation App Design — Wellness Suite',
              `<div style="margin-bottom: 1.5rem;">
                 <span style="display:inline-block; padding: 4px 10px; background: #E9D5FF; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; color: #581C87; margin-bottom: 0.8rem;">MOBILE PRODUCT DESIGN</span>
                 <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Relax, De-stress, Sleep better & Practice Gratitude</h4>
                 <p style="color: #555; margin-bottom: 1rem;">Designed an empathetic mobile onboarding and daily meditation routine assistant. Features dynamic mood check-ins, ambient soundscapes, and calming micro-haptics.</p>
               </div>`
            );
          } else if (studyType === 'finora') {
            openDrawer(
              'Finora Wealth Studio — Quantitative Interface',
              `<div style="margin-bottom: 1.5rem;">
                 <span style="display:inline-block; padding: 4px 10px; background: #FEF08A; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; color: #854D0E; margin-bottom: 0.8rem;">FINTECH & ASSET MANAGEMENT</span>
                 <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Tactile Financial Telemetry & Real-Time Portfolio Tracking</h4>
                 <p style="color: #555; margin-bottom: 1rem;">Created an ultra-responsive asset management interface with instant transaction categorization, biometric multi-sig security, and generative spending projections.</p>
               </div>`
            );
          } else if (studyType === 'aura') {
            openDrawer(
              'Aura Spatial Interfaces — Sensory Audio',
              `<div style="margin-bottom: 1.5rem;">
                 <span style="display:inline-block; padding: 4px 10px; background: #98F6D3; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; color: #064E3B; margin-bottom: 0.8rem;">SPATIAL COMPUTING & SOUND</span>
                 <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Ambient Acoustic Architecture for Next-Gen Spaces</h4>
                 <p style="color: #555; margin-bottom: 1rem;">Designed multi-room environmental audio interfaces with real-time acoustic refraction mapping and tactile sound wave controls.</p>
               </div>`
            );
          } else if (studyType === 'nexus') {
            openDrawer(
              'Nexus Knowledge Graph — Collaborative Workspace',
              `<div style="margin-bottom: 1.5rem;">
                 <span style="display:inline-block; padding: 4px 10px; background: #CBD5E1; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; color: #1E293B; margin-bottom: 0.8rem;">PRODUCTIVITY & KNOWLEDGE ARCHITECTURE</span>
                 <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Bi-Directional Graph Mapping for Complex Systems</h4>
                 <p style="color: #555; margin-bottom: 1rem;">Engineered an infinite canvas collaborative documentation graph. Allows engineering and product teams to link mental models with zero cognitive overhead.</p>
               </div>`
            );
          }
        });
      }"""

if old_js_carousel in html:
    html = html.replace(old_js_carousel, new_js_marquee)
    print("Replaced JS Carousel logic with Marquee interaction & GO button scroll.")
else:
    print("Warning: old_js_carousel not found exactly, attempting normalized replace.")
    exit(1)

with open('portB1.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("portB1.html updated with Full-Width Hero Typography, Infinite Marquee, and GO Button!")

