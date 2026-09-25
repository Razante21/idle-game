import { describe, expect, it } from 'vitest';
import { WEEKLY_EVENTS, currentWeeklyEvent, isoWeek, weeklyEventBonus } from './weeklyEvent';

describe('weekly event', () => {
  it('computes the standard ISO week number', () => {
    expect(isoWeek(new Date(Date.UTC(2026, 0, 1)))).toBe(1); // 1º de jan de 2026 é quinta
    expect(isoWeek(new Date(Date.UTC(2025, 11, 29)))).toBe(1); // segunda antes vira semana 1 de 2026
    expect(isoWeek(new Date(Date.UTC(2026, 5, 15)))).toBeGreaterThan(20);
  });

  it('picks the same event all week and a different one the next week', () => {
    const mon = currentWeeklyEvent(new Date(Date.UTC(2026, 5, 15)));
    const fri = currentWeeklyEvent(new Date(Date.UTC(2026, 5, 19)));
    const nextMon = currentWeeklyEvent(new Date(Date.UTC(2026, 5, 22)));
    expect(fri.id).toBe(mon.id);
    expect(nextMon.id).not.toBe(mon.id);
    expect(WEEKLY_EVENTS.map((e) => e.id)).toContain(mon.id);
  });

  it('builds a ModeBonus matching the current event', () => {
    const event = currentWeeklyEvent(new Date(Date.UTC(2026, 5, 15)));
    const bonus = weeklyEventBonus(new Date(Date.UTC(2026, 5, 15)));
    expect(bonus).toEqual({ target: event.target, stat: event.stat, value: event.value, source: `Evento: ${event.name}` });
  });

  it('cycles through every event over consecutive weeks', () => {
    const seen = new Set<string>();
    for (let w = 0; w < WEEKLY_EVENTS.length * 2; w++) {
      seen.add(currentWeeklyEvent(new Date(Date.UTC(2026, 0, 1 + w * 7))).id);
    }
    expect(seen.size).toBe(WEEKLY_EVENTS.length);
  });
});
