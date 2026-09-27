export const WIKIGG = { name: "wikigg", api: "https://idlewizard.wiki.gg/api.php", page: "https://idlewizard.wiki.gg/wiki/" };
export const FANDOM = { name: "fandom", api: "https://idle-wizard.fandom.com/api.php", page: "https://idle-wizard.fandom.com/wiki/" };

const USER_AGENT = "idlewizard-item-calc scraper (https://github.com/ramSilva/idlewizard_item_calc)";

export function pageUrl(wiki, title) {
  return wiki.page + encodeURIComponent(title.replaceAll(" ", "_"));
}

async function apiGet(wiki, params) {
  const url = `${wiki.api}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${wiki.name} API ${res.status} for ${url}`);
  return res.json();
}

export async function fetchRevisions(wiki, titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const j = await apiGet(wiki, {
      action: "query",
      prop: "revisions",
      rvprop: "content|ids|timestamp",
      rvslots: "main",
      redirects: "1",
      titles: batch.join("|"),
    });
    const normalized = new Map((j.query.normalized ?? []).map((n) => [n.from, n.to]));
    const redirects = new Map((j.query.redirects ?? []).map((r) => [r.from, r.to]));
    const pages = new Map(j.query.pages.filter((p) => !p.missing && p.revisions).map((p) => [p.title, p]));
    for (const requested of batch) {
      let title = normalized.get(requested) ?? requested;
      title = redirects.get(title) ?? title;
      const page = pages.get(title);
      if (!page) continue;
      const rev = page.revisions[0];
      out.set(requested, {
        title: page.title,
        revid: rev.revid,
        timestamp: rev.timestamp,
        content: rev.slots.main.content,
      });
    }
  }
  return out;
}

export async function fetchCategoryMembers(wiki, category) {
  const titles = [];
  let cont = {};
  for (;;) {
    const j = await apiGet(wiki, { action: "query", list: "categorymembers", cmtitle: `Category:${category}`, cmlimit: "500", ...cont });
    titles.push(...j.query.categorymembers.filter((m) => m.ns === 0).map((m) => m.title));
    if (!j.continue) return titles;
    cont = j.continue;
  }
}

export async function fetchSections(wiki, title) {
  const j = await apiGet(wiki, { action: "parse", page: title, prop: "sections" });
  return j.parse.sections.map((s) => ({ index: Number(s.index), level: Number(s.level), line: s.line }));
}

export async function fetchSectionWikitext(wiki, title, index) {
  const j = await apiGet(wiki, { action: "parse", page: title, prop: "wikitext", section: String(index) });
  return j.parse.wikitext;
}

/** Cloudflare fallback: a real browser can usually pass the challenge that plain HTTP clients fail. */
export async function fetchRawWithBrowser(wiki, titles) {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    return new Map();
  }
  const browser = await playwright.chromium.launch({ headless: true });
  const out = new Map();
  try {
    const page = await browser.newPage();
    for (const title of titles) {
      const url = `${wiki.page.replace("/wiki/", "/index.php")}?title=${encodeURIComponent(title)}&action=raw`;
      const res = await page.goto(url, { waitUntil: "domcontentloaded" });
      if (res && res.ok()) out.set(title, { title, revid: null, timestamp: null, content: await res.text() });
    }
  } finally {
    await browser.close();
  }
  return out;
}
