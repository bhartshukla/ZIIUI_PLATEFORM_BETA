function initRevealMenu() {
  const menuBtn = document.querySelector(".hamburger");
  const menuContainer = document.querySelector(".menu");
  if (!menuBtn || !menuContainer) return;

  const menuItems = {
    left: document.querySelectorAll(".menu-items .left a"),
    right: document.querySelectorAll(".menu-items .right a")
  };
  let isMenuOpen = false;

  const paths = {
    open: "M-18 758.717V11.5C-18 3.76801 -11.732 -2.5 -4.00004 -2.5H1924C1931.73 -2.5 1938 3.768 1938 11.5V758.665C1938 761.444 1937.15 764.111 1935.65 766.361C1934 768.852 1931.17 769.546 1928.3 769.098C1924.85 768.561 1921.31 767.528 1917.88 768.141C1212.55 894.154 785.537 902.189 1.54715 768.511C-1.6514 767.966 -4.96475 768.843 -8.17512 769.314C-11.0259 769.732 -13.8298 769.052 -15.5021 766.633C-17.0887 764.338 -18 761.586 -18 758.717Z",
    close: "M-18 758.717V11.5C-18 3.76801 -11.732 -2.5 -4.00004 -2.5H1924C1931.73 -2.5 1938 3.768 1938 11.5V758.665C1938 761.444 1937.15 764.111 1935.65 766.361C1933.43 769.699 1929.12 769.811 1925.39 768.27C1923.93 767.666 1922.46 766.99 1920.91 766.64C1216.58 606.849 789.299 607.56 -1.2239 767.202C-2.68919 767.497 -4.10926 768.088 -5.50815 768.615C-9.15243 769.988 -13.3045 769.812 -15.5021 766.633C-17.0887 764.338 -18 761.586 -18 758.717Z"
  };

  function animateMenuItems(items, yValue, duration, baseDelay, ease) {
    items.forEach((item, index) => {
      const elements = ['span', 'h2'].map((sel) => item.querySelector(sel)).filter(Boolean);
      elements.forEach((el, elIndex) => {
        gsap.to(el, {
          y: yValue,
          duration,
          delay: baseDelay + (index * 0.1) + (elIndex * 0.1),
          ease
        });
      });
    });
  }

  function toggleMenu() {
    if (!isMenuOpen) {
      menuContainer.classList.add("is-active");
      gsap.to(".menu", { y: 0 });
      gsap.to(".menu svg", { y: -100, duration: 1, ease: "power1.in" });
      gsap.to(".menu svg path", {
        attr: { d: paths.open },
        duration: 1,
        ease: "power2.inOut"
      });

      animateMenuItems(menuItems.left, 0, 0.7, 0.6, "power2.out");
      animateMenuItems(menuItems.right, 0, 0.5, 0.8, "power2.out");

      gsap.delayedCall(0.5, () => menuBtn.classList.add("menu-on"));
    } else {
      animateMenuItems(menuItems.left, "200%", 0.4, 0, "power2.in");
      animateMenuItems(menuItems.right, "200%", 0.4, 0.2, "power2.in");

      gsap.to(".menu svg path", {
        attr: { d: paths.close },
        duration: 0.8,
        delay: 0.3,
        ease: "power2.inOut"
      });

      gsap.to(".menu svg", {
        y: "-100%",
        duration: 1,
        delay: 0.3,
        ease: "power1.in"
      });

      gsap.to(".menu", {
        y: "-200%",
        delay: 1.4,
        onComplete: () => menuContainer.classList.remove("is-active")
      });
      gsap.delayedCall(0.3, () => menuBtn.classList.remove("menu-on"));
    }

    isMenuOpen = !isMenuOpen;
  }

  menuBtn.addEventListener("click", toggleMenu);
  menuBtn.addEventListener("keydown", (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRevealMenu);
} else {
  initRevealMenu();
}
