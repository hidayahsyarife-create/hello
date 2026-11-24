/* NEON GENESIS — THE LAST SIGNAL
   phaser/signalBus.js — the Clearly Defined Interface between the
   main cinematic experience and the Phaser interactive module.

   Contract
   --------
   Events published by main.js (the cinema):
     'panel:levels'   { signal, grid, core }   0..1 energy readouts, every frame
     'panel:visible'  { visible }              panel show/hide by storyboard
   Events published by interactive.js (the panel):
     'decoder:boost'  { sourceTime }           user tapped the decoder

   Both sides only ever talk through this bus; neither imports the
   other. Pure module, testable headless. */

export function createSignalBus() {
  const map = new Map();
  return {
    on(event, fn) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(fn);
      return () => map.get(event)?.delete(fn);
    },
    emit(event, payload) {
      const set = map.get(event);
      if (!set) return false;
      for (const fn of set) fn(payload);
      return true;
    },
    off(event, fn) {
      return map.get(event)?.delete(fn) || false;
    },
    count(event) {
      return map.get(event)?.size || 0;
    },
    reset() {
      map.clear();
    }
  };
}
