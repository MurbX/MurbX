// Palette tokens for both GitHub color schemes, matching the portfolio:
// warm paper and ink in light mode, warm charcoal in dark mode, one orange accent.
// Every color used by a card must exist in both themes.

export function themes({ accent }) {
  return {
    dark: {
      name: 'dark',
      bg: '#111111',
      panel: '#171716',
      stroke: '#2A2927',
      strokeSoft: '#211F1D',
      text: '#F4F1EC',
      textDim: '#C9C3BA',
      muted: '#8E887F',
      accent,
      accentSoft: '#3A2416',
      dots: '#FFFFFF',
      dotsOpacity: 0.07,
      glow: 0.28,
      onAccent: '#FFFFFF',
      chipFill: '#1D1C1A',
      chipStroke: '#33312E',
      heat: ['#1D1C1A', '#47250F', '#86391A', '#D45A18', '#FF8A3D'],
    },
    light: {
      name: 'light',
      bg: '#F4F3F1',
      panel: '#FBFBFA',
      stroke: '#E4E1DC',
      strokeSoft: '#ECE9E5',
      text: '#141414',
      textDim: '#4A4A4A',
      muted: '#8A8A8A',
      accent,
      accentSoft: '#FDE6D7',
      dots: '#141414',
      dotsOpacity: 0.1,
      glow: 0.16,
      onAccent: '#FFFFFF',
      chipFill: '#FFFFFF',
      chipStroke: '#E4E1DC',
      heat: ['#EAE7E2', '#FBD3BB', '#F7A877', '#F5691B', '#C2410C'],
    },
  };
}
