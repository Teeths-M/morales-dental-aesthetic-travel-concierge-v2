import { useEffect } from 'react';
import MCareOrb from '@/components/mcare/MCareOrb';
import { NIGHT } from '@/components/mcare/panelPalette';

/**
 * MCareApp (/m-care): M-Care's own full-screen app.
 *
 * It is the same M-Care panel that opens over every other page (MCareOrb), so it runs on the same agent, the same
 * conversation, voice and Talk Mode, attachments, location sharing and safety flows. Here it is the whole page:
 * always open, nothing of the website rendered behind it (AppLayout leaves out the site's header, footer, tab bar
 * and its own floating M-Care on this path), and Close goes back to where the visitor came from.
 */
export default function MCareApp() {
  // The browser tab and a home-screen install read "M-Care", and the page under the panel is the app's navy, so an
  // edge that a phone briefly shows past the panel (an overscroll, the keyboard sliding in) is never a light strip.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { title: document.title, html: html.style.backgroundColor, body: body.style.backgroundColor };
    document.title = 'M-Care';
    html.style.backgroundColor = NIGHT.canvas;
    body.style.backgroundColor = NIGHT.canvas;
    return () => {
      document.title = prev.title;
      html.style.backgroundColor = prev.html;
      body.style.backgroundColor = prev.body;
    };
  }, []);

  return <MCareOrb standalone />;
}
