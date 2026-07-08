/**
 * Render a character to an ImageData bitmap.
 *
 * Shared between TemplateRecognizer and the SSIM path in LessonView
 * so font metrics stay consistent across both comparison pipelines.
 */
export function renderTemplate(
  char: string,
  width: number,
  height: number,
): ImageData {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  const fontSize = Math.round(Math.min(width, height) * 0.6);
  ctx.fillStyle = "#000000";
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, width / 2, height / 2);

  return ctx.getImageData(0, 0, width, height);
}
