const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

const frameElement = document.querySelector<HTMLIFrameElement>("#gameFrame");
if (!frameElement) throw new Error("#gameFrame 요소를 찾을 수 없습니다.");
const gameFrame: HTMLIFrameElement = frameElement;

let resizeFrame = 0;

function fitGameFrame(): void {
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const scale = Math.max(.1, Math.min(viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_HEIGHT));
  gameFrame.style.setProperty("--game-scale", scale.toFixed(5));

  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    gameFrame.contentWindow?.postMessage({ type: "cloud-company:host-resize" }, window.location.origin);
  });
}

window.addEventListener("resize", fitGameFrame);
window.visualViewport?.addEventListener("resize", fitGameFrame);
gameFrame.addEventListener("load", fitGameFrame);
fitGameFrame();
