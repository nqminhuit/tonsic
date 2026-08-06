const DEFAULT_ENABLED_TYPES = ['maj', 'min', '7'];

export function getStoredEnabledTypes() {
  let enabled = DEFAULT_ENABLED_TYPES;

  try {
    const persisted = typeof window !== 'undefined' ? window.localStorage.getItem('enabledChordTypes') : null;
    if (persisted) enabled = JSON.parse(persisted) || enabled;
  } catch (e) {
    // ignore
  }

  return Array.isArray(enabled) && enabled.length ? enabled : DEFAULT_ENABLED_TYPES;
}

export function persistEnabledTypes(types) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem('enabledChordTypes', JSON.stringify(types));
}

export function createTargetWithVoicing(chordsModule, target, rootOctave = 4) {
  if (!chordsModule || !target) return target;

  return {
    ...target,
    voicing: chordsModule.buildVoicing(target.root, target.type, rootOctave),
  };
}

export function createRandomTarget(chordsModule, rootOctave = 4) {
  if (!chordsModule) return null;
  return createTargetWithVoicing(chordsModule, chordsModule.randomChord({ includeExtended: true }), rootOctave);
}

export function deriveTargetDisplayState(chordsModule, target, baseOctave, numberingStyle) {
  if (!chordsModule || !target) {
    return { targetMidis: [], targetOrderMap: [] };
  }

  let targetMidis = [];
  if (target.voicing && target.voicing.length) targetMidis = target.voicing.slice();
  else if (target.pcs && target.pcs.length && typeof chordsModule.buildVoicing === 'function') targetMidis = chordsModule.buildVoicing(target.root, target.type, baseOctave);

  let targetOrderMap = [];
  if (numberingStyle === 'formula') {
    if (typeof chordsModule.getChordDegrees === 'function') {
      targetOrderMap = chordsModule.getChordDegrees(target.type).slice();
    } else {
      targetOrderMap = targetMidis.map((_, i) => String(i + 1));
    }
  } else {
    const pairs = targetMidis.map((m, i) => ({ m, i })).sort((a, b) => a.m - b.m);
    targetOrderMap = new Array(targetMidis.length);
    pairs.forEach((pair, idx) => {
      targetOrderMap[pair.i] = String(idx + 1);
    });
  }

  return { targetMidis, targetOrderMap };
}
