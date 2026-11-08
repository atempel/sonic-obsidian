// so-v3-data.js — dados de exemplo das propostas v3 (nomes no formato do pacote butterchurn-presets: "Autor - Título").
// O crédito do autor faz parte do nome e nunca é removido pela UI.
(function () {
  const RAW = [
    'Geiss - Cauldron - painterly 2 (saturation remix)',
    'Flexi - mindblob [shiny mix]',
    'martin - mucus cervix',
    'Rovastar - Oozing Resistance',
    'Zylot - True Visionary (Final Mix)',
    'Unchained - Rewop',
    'Aderrasi - Potion of Spirits',
    'Cope - The Neverending Explosion of Red Liquid Fire',
    'Eo.S. + Phat - chasers 18 hallway',
    'fiShbRaiN + Flexi - witchcraft 2.0',
    'Martin - charisma',
    'Krash + Illusion - Spiral Movement',
    'Rovastar + Loadus + Geiss - FractalDrop (Triple Mix)',
    'Zylot - Star Ornament',
    'Geiss - Reaction Diffusion 2',
    'Flexi, martin + geiss - dedicated to the sherwin maxawow',
    'Stahlregen & fishbrain + flexi + geiss - The Machine that conquered the Aether',
    'Phat + Eo.S. - Tunnel of Light',
    'Unchained - Lucid Concentration',
    'martin - castle in the air',
    'Aderrasi - Airhandler (Last Breath)',
    'Geiss - Spiral Artifact',
    'Flexi - predator-prey-spirals',
    'Rovastar - Fractopia (Upspoken Mix)',
  ];
  // hue base de cada preset no visual simulado; heavy = derruba fps no exemplo
  const presets = RAW.map((full, i) => {
    const cut = full.indexOf(' - ');
    return {
      id: i,
      full,
      author: full.slice(0, cut),
      title: full.slice(cut + 3),
      hue: (i * 47 + 190) % 360,
      style: i % 4, // 0 radial, 1 túnel, 2 onda, 3 manchas
      heavy: i === 16 || i === 7,
      fav: [0, 3, 4, 10, 12, 19].includes(i),
      plays: [42, 31, 18, 27, 55, 9, 14, 6, 22, 11, 38, 7, 29, 13, 16, 8, 5, 12, 19, 24, 10, 15, 21, 17][i],
    };
  });
  const collections = [
    { id: 'c1', name: 'Noite tranquila', ids: [0, 3, 6, 10, 19, 20], interval: 45 },
    { id: 'c2', name: 'Festa', ids: [4, 7, 8, 12, 15, 17, 22], interval: 15 },
    { id: 'c3', name: 'Foco', ids: [1, 13, 14, 21], interval: 90 },
  ];
  window.SO_DATA = {
    totalLibrary: 386, // tamanho de exemplo da biblioteca completa
    presets,
    collections,
    recents: [4, 0, 12, 3, 10, 8],
    capture: { source: 'Saída padrão do Windows', device: 'Alto-falantes (FiiO K5 Pro)', rate: '48 kHz' },
  };
})();
