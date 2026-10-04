const graphemes = s => window.Intl && Intl.Segmenter
  ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), x => x.segment)
  : Array.from(s);
