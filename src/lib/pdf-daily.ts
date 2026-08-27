import { existsSync } from "node:fs";
import type { DailySchoolReportPayload } from "@/lib/daily-report";

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

  return candidates.find((path) => existsSync(path));
}

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");
  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION
  );

  if (isServerless) {
    const chromium = await import("@sparticuz/chromium");
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
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

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
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
  return htmlToPdf(buildDailyReportHtml(payload));
}
