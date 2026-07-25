// ── AI-driven Playwright tool-use loop ──────────────────────────────────────
//
// Runs a natural-language task against a real Playwright `page` by letting
// Claude choose which element to click/fill from a text-only snapshot of the
// page (no screenshots — cheaper, and this app's UI is text/label-driven,
// not canvas/visual). Raw fetch() to Anthropic's Messages API, same
// convention already used server-side in matchDoctorsForProcedure/entry.ts
// and runInternetIntelligence/entry.ts — no @anthropic-ai/sdk dependency.
//
// IMPORTANT: this module only DRIVES the browser. It is not the source of
// truth for pass/fail — callers (ai-agent.spec.js) must assert real DOM/API
// state after the agent finishes, never trust `report` on its own. Same
// "AI narrates, deterministic decides" split this app already uses for
// SAFE-T — it applies just as much to testing the app as to running it.

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const MAX_STEPS_DEFAULT = 12;
const INTERACTIVE_SELECTOR = 'button, a[href], input, textarea, select, [role="button"], [role="checkbox"]';

const TOOLS = [
  {
    name: 'click',
    description: 'Click an interactive element by its number from the most recent element list.',
    input_schema: {
      type: 'object',
      properties: { element_number: { type: 'integer' } },
      required: ['element_number'],
    },
  },
  {
    name: 'fill',
    description: 'Type text into an input/textarea by its number from the most recent element list. Replaces any existing value.',
    input_schema: {
      type: 'object',
      properties: { element_number: { type: 'integer' }, text: { type: 'string' } },
      required: ['element_number', 'text'],
    },
  },
  {
    name: 'get_page_text',
    description: 'Read the visible text of the whole current page — use to check confirmation messages, error text, etc.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'wait',
    description: 'Wait briefly for the page to settle, e.g. right after a navigation or a submit.',
    input_schema: {
      type: 'object',
      properties: { ms: { type: 'integer' } },
      required: ['ms'],
    },
  },
  {
    name: 'done',
    description: 'Call this as soon as the task is complete, or if you are stuck and cannot proceed. Include a short, factual report of what happened.',
    input_schema: {
      type: 'object',
      properties: { report: { type: 'string' } },
      required: ['report'],
    },
  },
];

/** Text-only snapshot of visible clickable/fillable elements. */
async function snapshotElements(page) {
  return page.evaluate((selector) => {
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const els = Array.from(document.querySelectorAll(selector)).filter(isVisible).slice(0, 60);
    return els.map((el, i) => {
      const tag = el.tagName.toLowerCase();
      const label = (
        el.getAttribute('aria-label')
        || el.placeholder
        || el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
        || el.getAttribute('name')
        || el.type
        || tag
      );
      return `${i}: <${tag}${el.type ? ` type=${el.type}` : ''}> ${label}`;
    });
  }, INTERACTIVE_SELECTOR);
}

/** Re-resolves a live element handle by the same index snapshotElements() used — the DOM may have changed since. */
async function elementHandle(page, index) {
  const handles = await page.$$(INTERACTIVE_SELECTOR);
  const visible = [];
  for (const h of handles) {
    if (await h.isVisible().catch(() => false)) visible.push(h);
    if (visible.length > 60) break;
  }
  return visible[index];
}

async function callClaude(apiKey, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      tools: TOOLS,
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Runs `task` against `page`, one tool call at a time, until Claude calls
 * `done` or `maxSteps` is exhausted. Returns { report, transcript } —
 * `transcript` is attachable to the Playwright HTML report for debugging.
 */
export async function runAgentTask(page, task, { apiKey, maxSteps = MAX_STEPS_DEFAULT } = {}) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('runAgentTask requires an Anthropic API key (ANTHROPIC_API_KEY).');

  const transcript = [];
  const initialElements = await snapshotElements(page);
  const messages = [{
    role: 'user',
    content: `You are testing a web app by controlling a real browser, one action at a time via tools.\n`
      + `Task: ${task}\n\n`
      + `Use the numbered element list to click/fill — never invent a number that wasn't shown to you. `
      + `After every action the resulting page's elements are shown again. `
      + `Call "done" as soon as the task is complete, or if you're stuck, with a short factual report.\n\n`
      + `Current URL: ${page.url()}\nVisible elements:\n${initialElements.join('\n') || '(none found)'}`,
  }];

  for (let step = 0; step < maxSteps; step++) {
    const response = await callClaude(key, messages);
    messages.push({ role: 'assistant', content: response.content });

    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (!toolUse) {
      transcript.push({ step, note: 'model returned no tool call — stopping' });
      break;
    }

    transcript.push({ step, tool: toolUse.name, input: toolUse.input });

    if (toolUse.name === 'done') {
      return { report: toolUse.input.report, transcript };
    }

    let actionResult = 'ok';
    try {
      if (toolUse.name === 'click') {
        const el = await elementHandle(page, toolUse.input.element_number);
        if (!el) throw new Error('no element at that index — the page may have changed since the last snapshot');
        await el.click();
        await page.waitForTimeout(500);
      } else if (toolUse.name === 'fill') {
        const el = await elementHandle(page, toolUse.input.element_number);
        if (!el) throw new Error('no element at that index — the page may have changed since the last snapshot');
        await el.fill(toolUse.input.text);
      } else if (toolUse.name === 'get_page_text') {
        actionResult = (await page.locator('body').innerText()).slice(0, 2000);
      } else if (toolUse.name === 'wait') {
        await page.waitForTimeout(Math.min(toolUse.input.ms || 500, 5000));
      } else {
        actionResult = `unknown tool "${toolUse.name}"`;
      }
    } catch (err) {
      actionResult = `error: ${err.message}`;
    }

    const elements = await snapshotElements(page);
    const resultText = `${actionResult}\n\nCurrent URL: ${page.url()}\nVisible elements:\n${elements.join('\n') || '(none found)'}`;

    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: resultText }],
    });
  }

  return { report: '(step budget exhausted without calling done)', transcript };
}
