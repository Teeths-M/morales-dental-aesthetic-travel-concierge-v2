import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Mail, Smartphone, PlayCircle, ChevronRight, Check } from 'lucide-react';
import robotSrc from '@/assets/m-safe-robot-transparent.webp';
import { WHITE, BODY, MUTED, HAIRLINE, GOLD, RED, SANS, SERIF } from '@/components/landing/theme';
import { canPromptInstall, onInstallAvailability, promptInstall, isInstalledApp } from '@/lib/installPrompt';

/**
 * StartNow (/start) — where every "start now" lands: the QR code at the end of
 * an M-Care ad, a printed card's NFC sticker ("tap your phone here"), or the
 * link in a post. Modelled on a tap-to-open venue page (Candour): it opens
 * instantly in the browser, no App Store, and offers a short menu of real
 * things to do right now. ?src= (e.g. ad29, card) is passed on to /pilot so
 * the waiting list shows which ad or card brought each person in.
 */

const IS_IOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

function Row({ icon: Icon, title, sub, onClick = null, to = '', done = false }) {
	const body = (
		<>
			<span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(212,175,55,0.12)', color: GOLD }}>
				{done ? <Check size="20" /> : <Icon size="20" />}
			</span>
			<span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
				<span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, color: WHITE }}>{title}</span>
				<span style={{ display: 'block', fontSize: 13, color: MUTED, marginTop: 2 }}>{sub}</span>
			</span>
			<ChevronRight size="18" color={MUTED} style={{ flexShrink: 0 }} />
		</>
	);
	const style = { display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${HAIRLINE}`, borderRadius: 16, textDecoration: 'none', cursor: 'pointer', fontFamily: SANS };
	return to ? <Link to={to} style={style}>{body}</Link> : <button type="button" onClick={onClick} style={style}>{body}</button>;
}

export default function StartNow() {
	const [params] = useSearchParams();
	const navigate = useNavigate();
	const src = (params.get('src') || '').slice(0, 40);
	const pilotLink = src ? `/pilot?src=${encodeURIComponent(src)}` : '/pilot';

	const [installable, setInstallable] = useState(canPromptInstall());
	const [installed, setInstalled] = useState(isInstalledApp());
	const [showSteps, setShowSteps] = useState(false);
	useEffect(() => onInstallAvailability(setInstallable), []);

	const saveToPhone = async () => {
		if (installable) {
			const ok = await promptInstall();
			if (ok) setInstalled(true);
			return;
		}
		setShowSteps((v) => !v);
	};

	return (
		<div style={{ background: '#060B16', minHeight: '100vh', fontFamily: SANS }}>
			<div style={{ maxWidth: 460, margin: '0 auto', padding: 'clamp(32px, 7vh, 64px) 20px 48px' }}>
				<div style={{ textAlign: 'center' }}>
					{/* The robot image carries a faint line along its top edge; clip it off. */}
					<img src={robotSrc} alt="M-Care" style={{ width: 168, height: 'auto', margin: '0 auto', display: 'block', clipPath: 'inset(8% 0 0 0)' }} />
					<p style={{ margin: '6px 0 0', fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, fontWeight: 600 }}>M-Care</p>
					<h1 style={{ margin: '10px 0 0', fontFamily: SERIF, fontSize: 'clamp(1.8rem, 6vw, 2.3rem)', fontWeight: 600, lineHeight: 1.15, color: WHITE, textWrap: 'balance' }}>
						Start now
					</h1>
					<p style={{ margin: '10px 0 0', fontSize: 15.5, lineHeight: 1.6, color: BODY }}>
						No App Store. No download. Start right here.
					</p>
				</div>

				<div style={{ display: 'grid', gap: 10, marginTop: 28 }}>
					<Row icon={MessageCircle} title="Talk to M-Care now" sub="Ask anything about a trip or a procedure" onClick={() => navigate('/?mcare=open')} />
					<Row icon={Mail} title="Join the pilot" sub="Be first when your spot opens" to={pilotLink} />
					<Row
						icon={Smartphone}
						title={installed ? 'M-Care is on your phone' : 'Save M-Care to your phone'}
						sub={installed ? 'Open it from your home screen any time' : 'An icon on your home screen, like an app'}
						onClick={installed ? undefined : saveToPhone}
						done={installed}
					/>
					{showSteps && !installed && (
						<div role="note" style={{ padding: '14px 16px', borderRadius: 16, border: `1px solid ${HAIRLINE}`, background: 'rgba(255,255,255,0.03)', fontSize: 14, lineHeight: 1.7, color: BODY }}>
							{IS_IOS ? (
								<>On iPhone, in <strong style={{ color: WHITE }}>Safari</strong>: tap the <strong style={{ color: WHITE }}>Share</strong> button at the bottom, then <strong style={{ color: WHITE }}>Add to Home Screen</strong>, then <strong style={{ color: WHITE }}>Add</strong>.</>
							) : (
								<>In <strong style={{ color: WHITE }}>Chrome</strong>: tap the <strong style={{ color: WHITE }}>⋮</strong> menu, then <strong style={{ color: WHITE }}>Install app</strong> or <strong style={{ color: WHITE }}>Add to Home screen</strong>.</>
							)}
						</div>
					)}
					<Row icon={PlayCircle} title="See how it works" sub="One minute, start to finish" to="/how-it-works" />
				</div>

				<p style={{ margin: '28px 0 0', textAlign: 'center', fontSize: 14, color: MUTED }}>Safety shouldn't stop at the border.</p>
				<p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: RED }}>
					M-Care coordinates care; it does not provide it. In an emergency, call local emergency services first.
				</p>
			</div>
		</div>
	);
}
