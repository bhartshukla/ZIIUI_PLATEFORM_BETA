import re

with open('portB1.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_start = '<!-- Horizontal Project Carousel (Hero Showcase) -->'
old_end = '        </div>\n      </div>\n    </section>'

start_idx = content.find(old_start)
end_idx = content.find(old_end, start_idx) + len(old_end)

new_html = '''<!-- Infinite Horizontal Project Marquee (Hero Showcase) -->
        <div class="hero-marquee-container" id="heroMarqueeWrap">
          <div class="marquee-track" id="marqueeTrack" aria-hidden="true">
            <!-- Card 1: Phone Mockup - Finance & Wealth System -->
            <div class="marquee-card marquee-card-phone" data-title="Finance & Wealth System" role="listitem" aria-label="Finance & Wealth System project">
              <div class="marquee-phone-frame">
                <div class="marquee-phone-screen">
                  <div class="marquee-phone-top">
                    <span>9:41</span>
                    <i class="ri-wifi-line"></i>
                  </div>
                  <div class="marquee-phone-user">
                    <div class="marquee-phone-avatar"></div>
                    <div>
                      <div class="marquee-phone-name">Dawi Hermaga</div>
                      <div style="font-size: 0.65rem; color: #64748B;">Senior Lead</div>
                    </div>
                  </div>
                  <div class="marquee-phone-card">
                    <div class="marquee-phone-row">
                      <span>Total Balance</span>
                      <span style="color: #0F172A;">$24,580.00</span>
                    </div>
                    <div class="marquee-chart-bar">
                      <div class="marquee-chart-col" style="height: 40%;"></div>
                      <div class="marquee-chart-col" style="height: 65%;"></div>
                      <div class="marquee-chart-col active"></div>
                      <div class="marquee-chart-col" style="height: 80%;"></div>
                      <div class="marquee-chart-col" style="height: 55%;"></div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px; font-size: 0.62rem; color: #475569; margin-top: 0.3rem;">
                    <div style="flex: 1; background: #F1F5F9; padding: 4px 6px; border-radius: 6px;">Send</div>
                    <div style="flex: 1; background: #F1F5F9; padding: 4px 6px; border-radius: 6px;">Receive</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 2: Laptop Mockup - Geo Bee Geospatial -->
            <div class="marquee-card marquee-card-laptop-wrap" data-title="Geo Bee Geospatial" role="listitem" aria-label="Geo Bee Geospatial project">
              <div class="marquee-card-laptop" id="mainLaptopCard">
                <div class="marquee-laptop">
                  <div class="marquee-laptop-bezel">
                    <div class="marquee-laptop-content">
                      <div class="marquee-laptop-nav">
                        <div class="marquee-laptop-brand">
                          <i class="ri-radar-line"></i>
                          <span>Geo Bee Geospatial</span>
                        </div>
                        <div class="marquee-laptop-nav-items">
                          <span>Product</span>
                          <span>Solutions</span>
                          <span>Research</span>
                        </div>
                      </div>
                      <div class="marquee-laptop-hero">
                        <h2 class="marquee-laptop-title">
                          Explore, Analyze, Decide<br />All in One Dashboard
                        </h2>
                        <button class="marquee-laptop-btn">Explore Now ></button>
                      </div>
                      <div style="font-size: 0.55rem; color: rgba(255,255,255,0.4); text-align: right; z-index: 2;">
                        v4.2 PRO
                      </div>
                    </div>
                  </div>
                  <div class="marquee-laptop-base">
                    <div class="marquee-laptop-notch"></div>
                  </div>
                </div>
              </div>
              <!-- Laptop Card Caption: Geo Bee Geospatial | 2024 -->
              <div class="marquee-laptop-caption">
                <span class="marquee-laptop-caption-title">Geo Bee Geospatial</span>
                <span class="marquee-laptop-caption-year">2024</span>
              </div>
            </div>

            <!-- Card 3: Spatial/Environment Peek -->
            <div class="marquee-card marquee-card-spatial" data-title="Spatial Environment" role="listitem" aria-label="Spatial Environment project"></div>

            <!-- Card 4: Dark UI Mobile -->
            <div class="marquee-card marquee-card-dark-ui" data-title="Dark Mode Dashboard" role="listitem" aria-label="Dark Mode Dashboard project">
              <div class="marquee-dark-screen-top"></div>
              <div class="marquee-dark-screen-bottom">
                <div class="marquee-dark-bar"></div>
                <div class="marquee-dark-bar short"></div>
                <div style="display: flex; gap: 4px; margin-top: 0.4rem;">
                  <div style="flex: 1; height: 18px; background: rgba(255,255,255,0.08); border-radius: 4px;"></div>
                  <div style="flex: 1; height: 18px; background: rgba(255,255,255,0.08); border-radius: 4px;"></div>
                </div>
              </div>
            </div>

            <!-- Card 5: Meditation App -->
            <div class="marquee-card marquee-card-meditation" data-title="Meditation App Design" role="listitem" aria-label="Meditation App Design project">
              <div class="marquee-meditation-screen marquee-med-screen-1">
                <div class="marquee-med-char-img"></div>
                <div class="marquee-med-title">Mindful<br />Meditation</div>
              </div>
              <div class="marquee-meditation-screen marquee-med-screen-2">
                <div style="font-size: 0.7rem; font-weight: 700; margin-bottom: 0.4rem;">How are you<br />feeling today?</div>
                <div class="marquee-med-mood">
                  <span>Calm</span>
                  <span>Focused</span>
                </div>
              </div>
              <div class="marquee-meditation-screen marquee-med-screen-3">
                <div class="marquee-med-audio">Breathe in...</div>
                <div class="marquee-med-play">
                  <i class="ri-play-fill"></i>
                </div>
              </div>
            </div>

            <!-- Card 6: Finance App -->
            <div class="marquee-card marquee-card-finance" data-title="Finance App" role="listitem" aria-label="Finance App project">
              <div class="marquee-finance-stat">
                <div class="marquee-finance-label">Main Card Balance</div>
                <div class="marquee-finance-val">$4,850.70</div>
                <svg class="marquee-finance-chart" viewBox="0 0 100 30" fill="none">
                  <path d="M 0 25 Q 25 10, 50 18 T 100 8" stroke="#111111" stroke-width="2.5" fill="none" />
                  <path d="M 0 25 Q 25 10, 50 18 T 100 8 L 100 30 L 0 30 Z" fill="rgba(0,0,0,0.04)" />
                </svg>
              </div>
              <div class="marquee-finance-bars">
                <div class="marquee-finance-bar" style="width: 70%;"></div>
                <div class="marquee-finance-bar" style="width: 45%;"></div>
              </div>
            </div>

            <!-- Card 7: Coffee App Peek -->
            <div class="marquee-card marquee-card-coffee" data-title="Coffee App" role="listitem" aria-label="Coffee App project">
              <div class="marquee-coffee-phone"></div>
            </div>

            <!-- Duplicate set for seamless infinite loop -->
            <!-- Card 1 (duplicate) -->
            <div class="marquee-card marquee-card-phone" data-title="Finance & Wealth System" role="listitem" aria-hidden="true">
              <div class="marquee-phone-frame">
                <div class="marquee-phone-screen">
                  <div class="marquee-phone-top">
                    <span>9:41</span>
                    <i class="ri-wifi-line"></i>
                  </div>
                  <div class="marquee-phone-user">
                    <div class="marquee-phone-avatar"></div>
                    <div>
                      <div class="marquee-phone-name">Dawi Hermaga</div>
                      <div style="font-size: 0.65rem; color: #64748B;">Senior Lead</div>
                    </div>
                  </div>
                  <div class="marquee-phone-card">
                    <div class="marquee-phone-row">
                      <span>Total Balance</span>
                      <span style="color: #0F172A;">$24,580.00</span>
                    </div>
                    <div class="marquee-chart-bar">
                      <div class="marquee-chart-col" style="height: 40%;"></div>
                      <div class="marquee-chart-col" style="height: 65%;"></div>
                      <div class="marquee-chart-col active"></div>
                      <div class="marquee-chart-col" style="height: 80%;"></div>
                      <div class="marquee-chart-col" style="height: 55%;"></div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px; font-size: 0.62rem; color: #475569; margin-top: 0.3rem;">
                    <div style="flex: 1; background: #F1F5F9; padding: 4px 6px; border-radius: 6px;">Send</div>
                    <div style="flex: 1; background: #F1F5F9; padding: 4px 6px; border-radius: 6px;">Receive</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 2 (duplicate) -->
            <div class="marquee-card marquee-card-laptop-wrap" data-title="Geo Bee Geospatial" role="listitem" aria-hidden="true">
              <div class="marquee-card-laptop">
                <div class="marquee-laptop">
                  <div class="marquee-laptop-bezel">
                    <div class="marquee-laptop-content">
                      <div class="marquee-laptop-nav">
                        <div class="marquee-laptop-brand">
                          <i class="ri-radar-line"></i>
                          <span>Geo Bee Geospatial</span>
                        </div>
                        <div class="marquee-laptop-nav-items">
                          <span>Product</span>
                          <span>Solutions</span>
                          <span>Research</span>
                        </div>
                      </div>
                      <div class="marquee-laptop-hero">
                        <h2 class="marquee-laptop-title">
                          Explore, Analyze, Decide<br />All in One Dashboard
                        </h2>
                        <button class="marquee-laptop-btn">Explore Now ></button>
                      </div>
                      <div style="font-size: 0.55rem; color: rgba(255,255,255,0.4); text-align: right; z-index: 2;">
                        v4.2 PRO
                      </div>
                    </div>
                  </div>
                  <div class="marquee-laptop-base">
                    <div class="marquee-laptop-notch"></div>
                  </div>
                </div>
              </div>
              <div class="marquee-laptop-caption">
                <span class="marquee-laptop-caption-title">Geo Bee Geospatial</span>
                <span class="marquee-laptop-caption-year">2024</span>
              </div>
            </div>

            <!-- Card 3 (duplicate) -->
            <div class="marquee-card marquee-card-spatial" data-title="Spatial Environment" role="listitem" aria-hidden="true"></div>

            <!-- Card 4 (duplicate) -->
            <div class="marquee-card marquee-card-dark-ui" data-title="Dark Mode Dashboard" role="listitem" aria-hidden="true">
              <div class="marquee-dark-screen-top"></div>
              <div class="marquee-dark-screen-bottom">
                <div class="marquee-dark-bar"></div>
                <div class="marquee-dark-bar short"></div>
                <div style="display: flex; gap: 4px; margin-top: 0.4rem;">
                  <div style="flex: 1; height: 18px; background: rgba(255,255,255,0.08); border-radius: 4px;"></div>
                  <div style="flex: 1; height: 18px; background: rgba(255,255,255,0.08); border-radius: 4px;"></div>
                </div>
              </div>
            </div>

            <!-- Card 5 (duplicate) -->
            <div class="marquee-card marquee-card-meditation" data-title="Meditation App Design" role="listitem" aria-hidden="true">
              <div class="marquee-meditation-screen marquee-med-screen-1">
                <div class="marquee-med-char-img"></div>
                <div class="marquee-med-title">Mindful<br />Meditation</div>
              </div>
              <div class="marquee-meditation-screen marquee-med-screen-2">
                <div style="font-size: 0.7rem; font-weight: 700; margin-bottom: 0.4rem;">How are you<br />feeling today?</div>
                <div class="marquee-med-mood">
                  <span>Calm</span>
                  <span>Focused</span>
                </div>
              </div>
              <div class="marquee-meditation-screen marquee-med-screen-3">
                <div class="marquee-med-audio">Breathe in...</div>
                <div class="marquee-med-play">
                  <i class="ri-play-fill"></i>
                </div>
              </div>
            </div>

            <!-- Card 6 (duplicate) -->
            <div class="marquee-card marquee-card-finance" data-title="Finance App" role="listitem" aria-hidden="true">
              <div class="marquee-finance-stat">
                <div class="marquee-finance-label">Main Card Balance</div>
                <div class="marquee-finance-val">$4,850.70</div>
                <svg class="marquee-finance-chart" viewBox="0 0 100 30" fill="none">
                  <path d="M 0 25 Q 25 10, 50 18 T 100 8" stroke="#111111" stroke-width="2.5" fill="none" />
                  <path d="M 0 25 Q 25 10, 50 18 T 100 8 L 100 30 L 0 30 Z" fill="rgba(0,0,0,0.04)" />
                </svg>
              </div>
              <div class="marquee-finance-bars">
                <div class="marquee-finance-bar" style="width: 70%;"></div>
                <div class="marquee-finance-bar" style="width: 45%;"></div>
              </div>
            </div>

            <!-- Card 7 (duplicate) -->
            <div class="marquee-card marquee-card-coffee" data-title="Coffee App" role="listitem" aria-hidden="true">
              <div class="marquee-coffee-phone"></div>
            </div>
          </div>

          <!-- GO Button - Navigate to Recent Projects -->
          <button class="marquee-go-btn" id="marqueeGoBtn" aria-label="Go to selected projects" title="Go to selected projects">
            <i class="ri-arrow-right-line"></i>
          </button>
        </div>'''

new_content = content[:start_idx] + new_html + content[end_idx:]

with open('portB1.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Replacement done successfully')