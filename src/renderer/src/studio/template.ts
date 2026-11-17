/**
 * Modelo do "Novo preset" (spec 027, fatia 8): um círculo que cresce com o `bass`.
 *
 * É um `.milk` (e não um preset JSON) para o preset novo nascer com fonte `.milk`, como diz a
 * fatia 6 ("criados do zero"): a aba Código edita o texto e o Exportar devolve a fonte. Passa
 * pelo mesmo conversor da importação (main). Sem shaders: `warp`/`comp` ficam os padrões do motor.
 * Sem comentários nas equações e sem texto de interface (o título vem do i18n).
 */
export const TEMPLATE_MILK = `MILKDROP_PRESET_VERSION=201
PSVERSION=2
PSVERSION_WARP=0
PSVERSION_COMP=0
[preset00]
fRating=3.000
fGammaAdj=1.000
fDecay=0.920
fVideoEchoZoom=1.000
fVideoEchoAlpha=0.000
nVideoEchoOrientation=0
nWaveMode=0
bAdditiveWaves=0
bWaveDots=0
bWaveThick=0
bModWaveAlphaByVolume=0
bMaximizeWaveColor=0
bTexWrap=0
bDarkenCenter=0
bRedBlueStereo=0
bBrighten=0
bDarken=0
bSolarize=0
bInvert=0
fWaveAlpha=0.000
fWaveScale=1.000
fWaveSmoothing=0.750
fWarpAnimSpeed=1.000
fWarpScale=1.000
fZoomExponent=1.000
zoom=1.010
rot=0.000
cx=0.500
cy=0.500
dx=0.000
dy=0.000
warp=0.000
sx=1.000
sy=1.000
wave_r=1.000
wave_g=1.000
wave_b=1.000
wave_x=0.500
wave_y=0.500
ob_size=0.000
ob_a=0.000
ib_size=0.000
ib_a=0.000
nMotionVectorsX=0.000
nMotionVectorsY=0.000
shapecode_0_enabled=1
shapecode_0_sides=48
shapecode_0_additive=1
shapecode_0_thickOutline=1
shapecode_0_textured=0
shapecode_0_num_inst=1
shapecode_0_x=0.500
shapecode_0_y=0.500
shapecode_0_rad=0.200
shapecode_0_ang=0.000
shapecode_0_tex_ang=0.000
shapecode_0_tex_zoom=1.000
shapecode_0_r=0.600
shapecode_0_g=0.400
shapecode_0_b=1.000
shapecode_0_a=0.900
shapecode_0_r2=0.150
shapecode_0_g2=0.050
shapecode_0_b2=0.400
shapecode_0_a2=0.300
shapecode_0_border_r=1.000
shapecode_0_border_g=1.000
shapecode_0_border_b=1.000
shapecode_0_border_a=0.600
shape_0_per_frame1=rad = 0.1 + 0.15*bass_att;
shape_0_per_frame2=a = 0.5 + 0.4*min(bass, 1);
per_frame_1=zoom = 1.0 + 0.01*bass_att;
`
