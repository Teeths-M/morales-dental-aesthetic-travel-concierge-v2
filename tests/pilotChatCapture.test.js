import { describe, it, expect } from 'vitest';
import { extractPilotContact, cleanCampaignTag } from '../src/lib/pilotChatCapture.js';

describe('extractPilotContact', () => {
	it('finds both an email and a phone number in one message', () => {
		expect(extractPilotContact('sure! portia@example.com and +1 (868) 555-0142')).toEqual({ email: 'portia@example.com', phone: '+18685550142' });
	});
	it('lowercases the email', () => {
		expect(extractPilotContact('Me@Example.COM').email).toBe('me@example.com');
	});
	it('accepts a phone number without a plus sign', () => {
		expect(extractPilotContact('868-555-0142').phone).toBe('8685550142');
	});
	it('finds only a phone number when there is no email', () => {
		expect(extractPilotContact('my number is 868 555 0142')).toEqual({ email: '', phone: '8685550142' });
	});
	it('never reads digits inside the email as a phone number', () => {
		expect(extractPilotContact('john12345678@mail.com')).toEqual({ email: 'john12345678@mail.com', phone: '' });
	});
	it('ignores short numbers like a year or a time', () => {
		expect(extractPilotContact('maybe in 2027 at 10:30')).toEqual({ email: '', phone: '' });
	});
	it('ignores ordinary chat', () => {
		expect(extractPilotContact('how does M-Care keep me safe?')).toEqual({ email: '', phone: '' });
	});
});

describe('cleanCampaignTag', () => {
	it('keeps a short plain tag', () => {
		expect(cleanCampaignTag('AD29')).toBe('ad29');
	});
	it('drops anything else', () => {
		expect(cleanCampaignTag('<script>')).toBe('');
		expect(cleanCampaignTag('x'.repeat(41))).toBe('');
	});
});
