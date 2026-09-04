import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DailySchoolReportPayload } from "@/lib/daily-report";

const PAGE_HEIGHT_MM = 281;
const PAGE_WIDTH_MM = 194;

const FONT_FILES = [
  { file: "noto-sans-tc-latin-400.woff", weight: 400 },
  { file: "noto-sans-tc-400.woff", weight: 400 },
  { file: "noto-sans-tc-700.woff", weight: 700 },
] as const;

function fontsDir(): string {
  return path.join(process.cwd(), "src", "fonts");
}

function fontPath(file: string): string {
  return path.join(fontsDir(), file);
}

function embeddedCjkFontCss(): string {
  return FONT_FILES.flatMap((item) => {
    const filePath = fontPath(item.file);
    if (!existsSync(filePath)) return [];
    const b64 = readFileSync(filePath).toString("base64");
    return [
      `@font-face {
        font-family: "Noto Sans TC";
        font-style: normal;
        font-weight: ${item.weight};
        font-display: block;
        src: url(data:font/woff;base64,${b64}) format("woff");
      }`,
    ];
  }).join("\n");
}

function mmToPx(mm: number): number {
  return (mm * 96) / 25.4;
}

function findLocalChrome(): string | undefined {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      : undefined,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => existsSync(candidate));
}

async function resolveChromiumExecutablePath(
  chromium: typeof import("@sparticuz/chromium").default
): Promise<string> {
  const remotePath = process.env.CHROMIUM_REMOTE_EXEC_PATH?.trim();
  if (remotePath) {
    return chromium.executablePath(remotePath);
  }

  const bundledBin = path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");
  if (existsSync(bundledBin)) {
    return chromium.executablePath(bundledBin);
  }

  return chromium.executablePath();
}

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");
  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION
  );

  if (isServerless) {
    const chromiumModule = await import("@sparticuz/chromium");
    const chromium = chromiumModule.default;
    chromium.setGraphicsMode = false;

    const loadFont = (
      chromium as { font?: (filePath: string) => Promise<unknown> }
    ).font;
    if (loadFont) {
      for (const item of FONT_FILES) {
        const filePath = fontPath(item.file);
        if (existsSync(filePath)) {
          await loadFont(filePath);
        }
      }
    }

    const executablePath = await resolveChromiumExecutablePath(chromium);
    const execDir = path.dirname(executablePath);
    const libraryPath = process.env.LD_LIBRARY_PATH
      ? `${execDir}:${process.env.LD_LIBRARY_PATH}`
      : execDir;

    return puppeteer.default.launch({
      args: [
        ...chromium.args,
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
      executablePath,
      headless: true,
      env: {
        ...process.env,
        LD_LIBRARY_PATH: libraryPath,
      },
    });
  }

  const executablePath = findLocalChrome();
  if (!executablePath) {
    throw new Error(
      "找不到 Chrome 瀏覽器，無法產生 PDF。請安裝 Google Chrome 或設定 CHROME_PATH。"
    );
  }

  return puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function fitReportPages(page: import("puppeteer-core").Page) {
  const maxHeightPx = mmToPx(PAGE_HEIGHT_MM);
  const pageWidthPx = mmToPx(PAGE_WIDTH_MM);

  await page.evaluate(
    ({ maxHeight, pageWidth }) => {
      const shells = document.querySelectorAll<HTMLElement>(".daily-print-shell");
      shells.forEach((shell) => {
        shell.style.width = `${pageWidth}px`;
        shell.style.height = `${maxHeight}px`;
        shell.style.maxHeight = `${maxHeight}px`;
        shell.style.overflow = "hidden";

        const inner = shell.querySelector<HTMLElement>(".daily-print-page");
        if (!inner) return;

        inner.style.width = `${pageWidth}px`;
        inner.style.transform = "";
        inner.style.zoom = "";
        const contentHeight = inner.scrollHeight;
        if (contentHeight > maxHeight) {
          const scale = Math.min(1, maxHeight / contentHeight);
          inner.style.zoom = String(scale);
        }
      });
    },
    { maxHeight: maxHeightPx, pageWidth: pageWidthPx }
  );
}

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: Math.round(mmToPx(PAGE_WIDTH_MM)),
      height: Math.round(mmToPx(PAGE_HEIGHT_MM)),
    });
    await page.setContent(html, { waitUntil: "load", timeout: 45_000 });
    await page.evaluate(() => document.fonts.ready);
    await fitReportPages(page);
    const pdf = await page.pdf({
      format: "A4",
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
      pageRanges: "1-2",
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function buildDailySchoolPdf(
  payload: DailySchoolReportPayload
): Promise<Buffer> {
  const { buildDailyReportHtml } = await import("@/lib/daily-report-print-html");
  return htmlToPdf(buildDailyReportHtml(payload, embeddedCjkFontCss()));
}
