import { describe, it, expect } from 'vitest';
import { SOS_QUEUE_KEY, queueSos, takeQueuedSos, flushQueuedSos, shouldRetrySos } from '../src/lib/sosQueue.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

describe('sosQueue', () => {
  it('queues payloads under the key the SOS button already uses', () => {
    const s = memoryStorage();
    expect(queueSos({ trigger_type: 'police' }, s)).toBe(true);
    expect(SOS_QUEUE_KEY).toBe('morales_sos_offline_queue');
    expect(JSON.parse(s.getItem(SOS_QUEUE_KEY))).toEqual([{ trigger_type: 'police' }]);
  });

  it('takes the whole queue off the device in one step', () => {
    const s = memoryStorage();
    queueSos({ n: 1 }, s);
    queueSos({ n: 2 }, s);
    expect(takeQueuedSos(s)).toEqual([{ n: 1 }, { n: 2 }]);
    expect(s.getItem(SOS_QUEUE_KEY)).toBeNull();
    expect(takeQueuedSos(s)).toEqual([]);
  });

  it('two flushes at once never send the same alert twice', async () => {
    const s = memoryStorage();
    queueSos({ n: 1 }, s);
    const sent = [];
    const send = async (p) => { sent.push(p); };
    await Promise.all([flushQueuedSos(send, s), flushQueuedSos(send, s)]);
    expect(sent).toEqual([{ n: 1 }]);
  });

  it('puts back an alert that failed for a reason that can pass, and drops one the server refused', async () => {
    const s = memoryStorage();
    queueSos({ n: 'network' }, s);
    queueSos({ n: 'busy' }, s);
    queueSos({ n: 'refused' }, s);
    queueSos({ n: 'ok' }, s);
    const send = async (p) => {
      if (p.n === 'network') throw new Error('Network Error');
      if (p.n === 'busy') throw Object.assign(new Error('x'), { response: { status: 429 } });
      if (p.n === 'refused') throw Object.assign(new Error('x'), { response: { status: 401 } });
    };
    expect(await flushQueuedSos(send, s)).toBe(1);
    expect(JSON.parse(s.getItem(SOS_QUEUE_KEY))).toEqual([{ n: 'network' }, { n: 'busy' }]);
  });

  it('reads a broken saved queue as empty instead of throwing', () => {
    const s = memoryStorage();
    s.setItem(SOS_QUEUE_KEY, '{not json');
    expect(takeQueuedSos(s)).toEqual([]);
    expect(queueSos({ n: 1 }, s)).toBe(true);
  });

  it('retries only no answer, a server fault or too many at once', () => {
    expect(shouldRetrySos(new Error('Network Error'))).toBe(true);
    expect(shouldRetrySos({ response: { status: 503 } })).toBe(true);
    expect(shouldRetrySos({ response: { status: 429 } })).toBe(true);
    expect(shouldRetrySos({ response: { status: 400 } })).toBe(false);
    expect(shouldRetrySos({ response: { status: 401 } })).toBe(false);
  });
});
