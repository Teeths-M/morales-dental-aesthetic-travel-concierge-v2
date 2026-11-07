import { useEffect } from 'react';
import MCareOrb from '@/components/mcare/MCareOrb';
import { NIGHT } from '@/components/mcare/panelPalette';

/**
 * MCareApp (/m-care, /m-care/live): M-Care's own full-screen app, the Living Ring screen.
 *
 * It is the same M-Care panel that opens over every other page (MCareOrb), so it runs on the same agent, the same
 * conversation, voice and Talk Mode, attachments, location sharing and safety flows. Here it is the whole page as
 * the ring screen (variant="ring", see components/mcare/ring/RingScreen.jsx): the golden ring is M-Care's face, with
 * only History, Talk and Type. Nothing of the website is rendered behind it (AppLayout leaves out the site's header,
 * footer, tab bar and its own floating M-Care on these paths).
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

  return <MCareOrb standalone variant="ring" />;
}
