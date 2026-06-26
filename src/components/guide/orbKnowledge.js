/**
 * Morales Guide — Offline Knowledge Base
 * Covers every platform feature. Works with zero network connectivity.
 *
 * Each entry: { k: string[] keywords, a: string answer }
 * Multi-word keywords get phrase-match bonus scoring.
 */
export const KB = [
  // HANDSHAKES / CHECKPOINTS
  {
    k: ['handshake','checkpoint','checkpoints','hs1','hs2','hs3','hs4','hs5','hs6','hs7','hs8','hs9','nine steps','9 steps','complete handshake','how do i complete'],
    a: `The Morales journey has 9 handshake checkpoints:\n\n1️⃣ Driver Pickup (home → airport)\n2️⃣ Airport Drop-off (departure)\n3️⃣ Airport Pickup (destination)\n4️⃣ Hotel Check-in\n5️⃣ Clinic Appointment\n6️⃣ Companion Meal\n7️⃣ Return Transport (hotel → airport)\n8️⃣ Home Airport Arrival\n9️⃣ Home Drop-off ✓ Golden M\n\nTap the Handshake button on your Dashboard at each stage, or text HS1–HS9 to the shortcode if you have no app signal.`,
  },
  // GOLDEN M
  {
    k: ['golden m','golden','certificate','journey complete','completed journey','completion','award','download certificate','share journey'],
    a: `The Golden M is awarded when all 9 handshake checkpoints are confirmed — your Morales medical journey is 100% complete.\n\nYou receive a downloadable Golden M Certificate (tap "Download My Certificate"). You can also share your journey story on social media with a branded caption.\n\nIt is the highest recognition Morales gives — earned by every patient who completes the full journey safely.`,
  },
  // SAFE-T
  {
    k: ['safe-t','safe t','safety monitoring','behavioral signals','signals','i am safe','safe button','monitoring system','passive monitoring'],
    a: `SAFE-T4life™ monitors your safety using 6 behavioral signals:\n• GPS location staleness\n• App activity level\n• Check-in frequency\n• Time-pattern anomalies\n• Spatial gaps\n• Movement irregularities\n\nIf signals go quiet, your Morales concierge is alerted. Tap "I'm Safe" on the Safe-T page anytime to reset the clock and confirm you're OK.`,
  },
  // MEDGUARD / SAFETY SCORE
  {
    k: ['medguard','safety score','risk score','med guard','score','0-100','risk level','score breakdown','signal breakdown'],
    a: `MedGuard™ generates your real-time Safety Score (0–100):\n🟢 Below 30 — All clear\n🟡 30–60 — Monitoring closely\n🔴 Above 60 — Concierge alert activated\n\nThe score is built from 6 behavioral signals and refreshes every 5 minutes. It is only active during your active travel window — dormant otherwise.`,
  },
  // JOURNEY MAP
  {
    k: ['journey map','map','hotel pin','clinic pin','pins','directions','coordinates','location','google maps','route','hotel location','clinic location'],
    a: `The Journey Map shows your hotel (🛏️) and clinic (🏥) as interactive pins on a dark map.\n\n• Tap a pin to see the full address\n• Tap "Open in Google Maps" for navigation\n• The 🧭 Directions button routes from hotel to clinic\n\nCoordinates are added by your travel agency (hotel) and your doctor (clinic). The map appears automatically once both are set.`,
  },
  // BOOKING FLOW
  {
    k: ['book','booking','how to book','procedure form','appointment','consultation','consult','submit booking','booking form'],
    a: `To book a procedure:\n1. Go to the Booking page\n2. Complete 4 steps: Personal info → Procedure & destination → Medical history → Health questionnaire\n3. Search procedures by keyword (type at least 1 character)\n4. Submit — your case is reviewed and matched with a verified Morales doctor within 24–48 hours.`,
  },
  // PROCEDURES
  {
    k: ['procedure','procedures','dental','implant','veneer','crown','invisalign','whitening','rhinoplasty','liposuction','breast','tummy tuck','facelift','bbl','orthopedic','hip replacement','knee replacement','aesthetic','what procedures'],
    a: `Morales covers three categories:\n\n🦷 Dental: implants, veneers, crowns, Invisalign, teeth whitening, full-arch restorations\n\n💉 Aesthetic: rhinoplasty, liposuction, breast augmentation/lift, tummy tuck, facelift, BBL\n\n🦴 Orthopedic: hip replacement, knee replacement\n\nAll include travel coordination. Search by name on the Procedures page.`,
  },
  // SOS / EMERGENCY
  {
    k: ['sos','emergency','help','danger','panic','alarm','distress','emergency button','emergency center','need help','send help'],
    a: `Tap the red SOS button (bottom-right, always visible) to open the Emergency Center.\n\nSix channels activate simultaneously:\n📡 Satellite SBD (Iridium — works with zero cell signal)\n📻 goTenna Pro mesh radio\n📡 inReach Mini (BLE-detected)\n📱 SMS fallback\n🔲 QR Code scan\n🌐 Web Share\n\nFor a silent alarm without alerting anyone nearby — use the Emergency PIN vault.`,
  },
  // PIN VAULT / SILENT ALARM
  {
    k: ['pin','emergency pin','pin vault','pin setup','no login','wrong pin','silent alarm','compromised','any device'],
    a: `Your Emergency PIN gives access to the Emergency Center from ANY device without logging in — no SMS, no internet required for basic access.\n\nSilent Alarm: if the wrong PIN is entered from an unrecognized device, a silent alert fires to your Morales concierge and the case is flagged as potentially compromised — without alerting anyone nearby.`,
  },
  // PASSPORT VAULT
  {
    k: ['passport vault','documents','upload documents','visa','flight ticket','hotel booking','medical record','insurance document','encrypted','secure storage'],
    a: `The Passport Vault stores your travel documents securely:\n• Passport\n• Visa\n• Flight tickets\n• Hotel confirmations\n• Medical records\n• Insurance\n\nAll documents are encrypted. In an emergency, your concierge can access them via a one-time QR link — no login required. Upload from the Vault page in your Dashboard.`,
  },
  // COMPANION PACKAGE
  {
    k: ['companion','companion package','in-country','local assistant','travel companion','add companion','companion cost','$650','toggle companion'],
    a: `The Companion Package (+$650, added to your invoice) assigns a verified local companion to your journey.\n\nThey meet you at the hotel, coordinate meals, accompany you to the clinic, and provide full local support.\n\nToggle it on from your Dashboard or Bookings section. Companions in your destination are notified immediately and accept/decline within 24 hours.`,
  },
  // DOCTOR PORTAL
  {
    k: ['doctor portal','confirm patient','confirm case','clinic coordinates','doctor token','token portal','how do i confirm'],
    a: `The Doctor Portal is token-gated — no login needed, just click the link in your email.\n\nFrom the portal you can:\n✅ Confirm the patient case and set the appointment date\n📍 Add your clinic address and GPS coordinates (this powers the patient's Journey Map)\n🤖 Use AI Clinical Note Extraction to paste raw notes and get structured data instantly`,
  },
  // AI CLINICAL EXTRACTION
  {
    k: ['clinical notes','ai extraction','note extraction','extract notes','paste notes','clinical extraction','ai notes','medical notes'],
    a: `AI Clinical Note Extraction lets doctors paste any raw clinical text and instantly extract structured data:\n\n• Chief complaint\n• Diagnosis & procedures\n• Medications (name, dosage, frequency)\n• Allergies\n• Vital signs\n• Key dates\n• Clinical summary\n\nAll fields are editable before applying to the patient notes. Tap "🤖 AI Extract" in the Doctor Portal.`,
  },
  // DOCTOR TRUST SCORE
  {
    k: ['doctor trust score','trust score','doctor score','doctor rating','doctor rank','doctor ranking'],
    a: `The Doctor Trust Score (0–100) is a hidden ranking visible only to platform admins. It is built from 4 equal quadrants:\n\n• Confirmation speed (25pts)\n• SOS-related events (25pts)\n• Case completion rate (25pts)\n• Patient satisfaction ratings (25pts)\n\nHigher scores appear first in patient procedure searches and affect doctor assignments.`,
  },
  // TRAVEL AGENCY PORTAL
  {
    k: ['travel agency','travel quote','hotel quote','flight number','agency portal','travel portal','submit quote','hotel coordinates'],
    a: `The Travel Agency Portal (token-gated, link in email) is where you submit patient travel logistics:\n\n• Flight number\n• Hotel name & address\n• Hotel GPS coordinates (lat/lng)\n• Notes\n\nThe hotel coordinates automatically populate the patient's Journey Map the moment you save — patients see the hotel pin (🛏️) appear on their map.`,
  },
  // COMPANION PORTAL / SCORE
  {
    k: ['companion portal','job offer','accept job','decline job','companion score','performance score','companion rating','companion dashboard'],
    a: `Companion job offers appear in your Companion Dashboard. Each card shows:\n• Patient first name & destination\n• Hotel, arrival/departure dates\n• Duration, meals included\n• Package fee\n\nAccept or decline within 24 hours. Your Companion Score (0–100) is calculated from: response speed, job completion rate, patient ratings, and reliability.`,
  },
  // CHAUFFEUR PORTAL
  {
    k: ['chauffeur','driver','taxi','pickup','visual code','verification code','transfer portal','chauffeur portal'],
    a: `Chauffeurs use the Transfer Portal to view assigned pickups. The Visual Verification Code is a color-coded pattern displayed to the patient — they confirm the driver by matching the code before entering the vehicle. Emergency transport requests are dispatched immediately from the Recovery Vault.`,
  },
  // SYSTEM PAUSE
  {
    k: ['system pause','pause system','integration credits','credits','stop integration','pause button','stop api','resume system','pause toggle'],
    a: `The System Pause button (admin sidebar footer) stops ALL API and integration calls platform-wide immediately.\n\n• State persists across ALL devices and page refreshes\n• Does NOT auto-reset — you must press Resume manually\n• Red banner appears at top of admin pages when active\n• Cross-device sync works even on phone and tablet\n\nUse this to conserve integration credits during development or downtime.`,
  },
  // DESTINATION SAFETY INDEX
  {
    k: ['destination safety','safety index','country score','country safety','morales intelligence','intelligence data','destination score'],
    a: `The Destination Safety Index (0–100) is Morales proprietary per-country safety data.\n\nFormula:\n• Start at 100\n• Subtract 8pts per SOS event (last 30 days)\n• Subtract 5pts per unresolved escalation\n• Floor at 30\n\nUpdates in real-time from live patient signal data — not public databases. Shows on your Dashboard during travel.`,
  },
  // PREDICTIVE ESCALATION
  {
    k: ['predictive','escalation','pre-escalation','proactive alert','missed check-in','predictive alert','45 minutes'],
    a: `Predictive Escalation fires 45 minutes BEFORE a missed check-in is triggered.\n\nConditions: GPS signal stale 2+ hours AND app inactive 1+ hour.\n\nAn admin alert is sent proactively — before the standard 15-minute missed check-in window even starts. This gives the team time to reach the patient before an emergency is declared.`,
  },
  // JOURNEY CREDIT / LOYALTY
  {
    k: ['journey credit','loyalty','tier','silver','platinum','member','deposit reduction','reward','points','loyalty program'],
    a: `Journey Credits are earned by completing Morales journeys. Five tiers:\n\n🥉 Member → 🥈 Silver → 🥇 Gold → 💎 Platinum → 🏆 Golden M\n\nHigher tiers unlock deposit reductions and priority service. Credits never expire. Your current tier and progress to the next level shows on the Journey Credit card on your Dashboard.`,
  },
  // LANGUAGE SWITCHER
  {
    k: ['language','translation','spanish','french','arabic','chinese','portuguese','turkish','thai','german','italian','switch language','globe','rtl','right to left'],
    a: `Morales supports 10 languages: English, Spanish, Portuguese, French, German, Italian, Turkish, Thai, Chinese (Simplified), and Arabic.\n\nClick the 🌐 globe icon in the top-right header to switch. Arabic automatically sets right-to-left (RTL) layout. Your choice is saved to your browser and restored on every visit.`,
  },
  // OFFLINE / AIRPLANE MODE
  {
    k: ['offline','no internet','airplane mode','no signal','no connection','works offline','no wifi','airplane'],
    a: `Morales is built for offline resilience:\n\n📡 Emergency Center — accessible without internet\n🔒 Emergency PIN vault — works on any device, no login\n✅ Handshake checkpoints — queued offline, sync when reconnected\n📄 Offline SOS Guide — downloadable reference (/offline-guide)\n📡 Satellite SOS (Iridium/inReach) — works with zero cell signal\n\nCritical safety features never depend on internet connectivity.`,
  },
  // WHATSAPP / ASSISTANCE
  {
    k: ['whatsapp','contact','message us','get help','assistance','fastest response','chat','support'],
    a: `The WhatsApp button (bottom-right, green pill) connects you directly to the Morales concierge team — the fastest way to reach us globally. Tap it to open WhatsApp with a pre-filled message. The AI Assistant (SafeT4life) is also accessible from that same button for immediate automated help.`,
  },
  // WHAT IS MORALES
  {
    k: ['what is morales','morales medical','what does morales do','about morales','how does it work','medical tourism','who is morales'],
    a: `Morales is a full-service medical tourism concierge platform. We connect patients with verified doctors abroad for dental, aesthetic, and orthopedic procedures — then coordinate everything:\n\n✈️ Travel & hotel logistics\n🏥 Verified doctors in destination countries\n👥 Local companions and chauffeurs\n🛡️ 24/7 real-time safety monitoring (SAFE-T)\n🆘 Multi-channel emergency response\n\nEvery journey is tracked through 9 safety handshakes.`,
  },
  // WALKIE TALKIE
  {
    k: ['walkie talkie','push to talk','voice','radio','real time voice'],
    a: `The Walkie-Talkie feature (Travel section of Dashboard) provides push-to-talk voice communication between you and your Morales concierge team — useful when you need to speak but can't make a phone call. Works over the internet connection.`,
  },
  // INSURANCE
  {
    k: ['insurance','travel insurance','medical insurance','coverage','insured'],
    a: `The Insurance section of your Dashboard lets you view travel and medical coverage for your journey. Morales works with select providers that cover procedures abroad. Upload your insurance card and policy to the Passport Vault for emergency access without logging in.`,
  },
  // RECOVERY VAULT / THREAT CLOSURE
  {
    k: ['recovery vault','threat closure','close threat','safe arrival','emergency closure','i arrived safely','close emergency'],
    a: `After an emergency is resolved, use the Recovery Vault to close the threat loop:\n\n1. Confirm your safe location\n2. Tap "✅ I've Arrived Safely"\n3. The system completes recovery transport, expires guardian links, clears the threat flag, and sends an incident report to admin\n\nYou receive an INC-XXXXXXXX reference number for your records.`,
  },
  // GUARDIAN SHARE / FAMILY
  {
    k: ['guardian','guardian link','family','share location','track me','share trip','guardian view'],
    a: `The Guardian Share lets a family member or trusted contact track your journey in real-time. They receive a link showing your location, handshake progress, and safety status — no Morales account needed. Guardian links expire when the journey is complete or when you close the threat loop.`,
  },
];

// ── Scoring engine ──────────────────────────────────────────────────────────

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

export function findAnswer(question) {
  const q       = question.toLowerCase();
  const tokens  = tokenize(q);
  let best      = null;
  let bestScore = 0;

  for (const entry of KB) {
    let score = 0;
    for (const kw of entry.k) {
      if (kw.includes(' ')) {
        // Phrase match — higher value
        if (q.includes(kw)) score += kw.split(' ').length * 3;
      } else {
        if (tokens.includes(kw)) score += 2;
        // Partial match bonus (kw appears inside a token)
        else if (tokens.some(t => t.includes(kw) && kw.length > 4)) score += 1;
      }
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }

  return bestScore >= 2 ? best.a : null;
}
