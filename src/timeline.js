/* NEON GENESIS — THE LAST SIGNAL
   timeline.js — master cinematic timeline (40s)
   Single source of truth for segment scheduling and cue events.
   Deterministic: no wall-clock, fully driven by advance(dt). */

export const DURATION = 40;

export const STORYBOARD = [
  { id: 'S01', name: 'THE SILENT CITY',       start: 0,  end: 7  },
  { id: 'S02', name: 'THE AWAKENING',         start: 7,  end: 14 },
  { id: 'S03', name: 'THE SIGNAL',            start: 14, end: 22 },
  { id: 'S04', name: 'THE COLLAPSE',          start: 22, end: 32 },
  { id: 'S05', name: 'FINAL TRANSMISSION',    start: 32, end: 40 }
];

/* Named story events — modules subscribe instead of polling.
   Times chosen against the storyboard beats. */
export const CUES = [
  { id: 'SIGNAL_APPEAR',        at: 5.0 },  /* S01: anomaly lights up in the sky   */
  { id: 'ENTER_FACILITY',       at: 7.0 },  /* cut to S02                          */
  { id: 'ROBOT_ENERGIZE',       at: 10.0 }, /* S02: energy flows through chassis   */
  { id: 'HOLO_INTERFACE',       at: 14.0 }, /* cut to S03: hologram boots          */
  { id: 'MESSAGE_ESTABLISHED',  at: 18.0 }, /* S03: "CONNECTION ESTABLISHED"       */
  { id: 'GRID_FAILURE',         at: 22.0 }, /* cut to S04: blackout cascade        */
  { id: 'SKY_FLASH',            at: 26.0 }, /* S04: lightning across the sky       */
  { id: 'PULL_BACK_REVEAL',     at: 28.0 }, /* S04: wide city reveal               */
  { id: 'SILENCE',              at: 32.0 }, /* cut to S05: everything stops        */
  { id: 'FINAL_TITLE',          at: 35.0 }  /* S05: titles over black              */
];

export function segmentAt(t) {
  const clamped = Math.min(Math.max(t, 0), DURATION - 0.0001);
  return STORYBOARD.find(s => clamped >= s.start && clamped < s.end) || STORYBOARD[STORYBOARD.length - 1];
}

export function segProgress(t, seg) {
  return Math.min(Math.max((t - seg.start) / (seg.end - seg.start), 0), 1);
}

const easeInOut = t => t * t * (3 - 2 * t);

export function ease(t) { return easeInOut(Math.min(Math.max(t, 0), 1)); }

/* Event fan-out; cue firing is idempotent per occurrence (loop-safe). */
export class Timeline {
  constructor(duration = DURATION) {
    this.duration = duration;
    this.time = 0;
    this.cueIndex = 0;               /* cues sorted by time */
    this.pending = [...CUES].sort((a, b) => a.at - b.at);
    this.listeners = new Map();
    this.onSegment = null;
    this.segment = null;
  }

  on(eventId, fn) {
    if (!this.listeners.has(eventId)) this.listeners.set(eventId, []);
    this.listeners.get(eventId).push(fn);
    return () => {
      const arr = this.listeners.get(eventId);
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  emit(eventId, payload) {
    const arr = this.listeners.get(eventId);
    if (arr) for (const fn of arr) fn(payload);
  }

  reset() {
    this.time = 0;
    this.cueIndex = 0;
    this.pending = [...CUES].sort((a, b) => a.at - b.at);
    this.segment = null;
  }

  /* advance returns elapsed time for convenience in the render loop */
  advance(dt) {
    this.time = Math.min(this.time + dt, this.duration);
    const t = this.time;

    const seg = segmentAt(t);
    if (seg !== this.segment) {
      this.segment = seg;
      if (this.onSegment) this.onSegment(seg);
      this.emit('segment', seg);
    }

    while (this.cueIndex < this.pending.length && this.pending[this.cueIndex].at <= t) {
      const cue = this.pending[this.cueIndex];
      this.emit(`cue:${cue.id}`, { at: cue.at, time: t });
      this.emit('cue', cue);
      this.cueIndex++;
    }
    return t;
  }
}
