function initBlockReveal() {
  const menu = document.querySelector(".menuContent");
  const menuBtn = document.getElementById("menuBtn");
  const squareContainer = document.querySelector("#squareContainer");
  if (!menu || !menuBtn || !squareContainer) return;

  const squareSize = 100;
  let squares = [];
  let overlayVisible = false;

  function createSquares() {
    const curW = window.innerWidth;
    const curH = window.innerHeight;
    const numCols = Math.ceil(curW / squareSize);
    const numRows = Math.ceil(curH / squareSize);
    const numSquares = numCols * numRows;

    squareContainer.style.width = `${numCols * squareSize}px`;
    squareContainer.style.height = `${numRows * squareSize}px`;
    squareContainer.innerHTML = "";
    squares = [];

    for (let i = 0; i < numSquares; i++) {
      const square = document.createElement("div");
      square.classList.add("square");
      squareContainer.appendChild(square);
      squares.push(square);
    }
  }

  function animateSquares() {
    gsap.fromTo(squares,
      { opacity: 0 },
      {
        opacity: 1,
        delay: 0.5,
        duration: 0.05,
        stagger: {
          each: 0.004,
          from: "random"
        }
      }
    );

    gsap.to(squares, {
      opacity: 0,
      delay: 1.5,
      duration: 0.05,
      stagger: {
        each: 0.004,
        from: "random"
      }
    });
  }

  gsap.set(menu, { opacity: 0, visibility: "hidden" });

  menuBtn.addEventListener("click", () => {
    createSquares();
    animateSquares();

    gsap.to(menu, {
      duration: 0.025,
      opacity: overlayVisible ? 0 : 1,
      visibility: overlayVisible ? "hidden" : "visible",
      delay: 1.15
    });

    gsap.to(menu, {
      zIndex: overlayVisible ? -1 : 50,
      delay: overlayVisible ? 0 : 1.15
    });

    overlayVisible = !overlayVisible;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlockReveal);
} else {
  initBlockReveal();
}
