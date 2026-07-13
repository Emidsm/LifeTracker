export const CATEGORIES = [
  { id: 'trabajo_video',   label: 'Trabajo pagado',    sub: 'edición video',  emoji: '💼', color: '#6366f1' },
  { id: 'trabajo_dev',     label: 'Trabajo / freelance', sub: 'dev, chambas', emoji: '🧑‍💻', color: '#0891b2' },
  { id: 'icpc',            label: 'ICPC/algoritmos',   sub: '',               emoji: '🧮', color: '#8b5cf6' },
  { id: 'saas',            label: 'SaaS',              sub: '',               emoji: '🚀', color: '#0ea5e9' },
  { id: 'portafolio',      label: 'Portafolio',        sub: '',               emoji: '📁', color: '#06b6d4' },
  { id: 'contenido',       label: 'Contenido/canal',   sub: '',               emoji: '🎬', color: '#f59e0b' },
  { id: 'ejercicio',       label: 'Ejercicio',         sub: '',               emoji: '🏃', color: '#10b981' },
  { id: 'lectura',         label: 'Lectura',           sub: '',               emoji: '📚', color: '#84cc16' },
  { id: 'ingles',          label: 'Inglés',            sub: '',               emoji: '📖', color: '#14b8a6' },
  { id: 'quehacer',        label: 'Quehacer',          sub: '',               emoji: '🧹', color: '#a78bfa' },
  { id: 'comida',          label: 'Comida',            sub: '',               emoji: '🍽️', color: '#f97316' },
  { id: 'pareja',          label: 'Con pareja',        sub: '',               emoji: '❤️', color: '#ec4899' },
  { id: 'social',          label: 'Amigos/familia',    sub: '',               emoji: '👥', color: '#fb7185' },
  { id: 'descanso_activo', label: 'Descanso activo',   sub: '',               emoji: '🌿', color: '#34d399' },
  { id: 'scroll',          label: 'Scroll sin rumbo',  sub: '',               emoji: '📱', color: '#94a3b8' },
  { id: 'serie',           label: 'Serie/película',    sub: '',               emoji: '🎭', color: '#c084fc' },
  { id: 'sueno',           label: 'Sueño',             sub: '',               emoji: '😴', color: '#64748b' },
  { id: 'otro',            label: 'Otro',              sub: '',               emoji: '✏️', color: '#6b7280' },
];

export const CAT_BY_ID = {
  ...Object.fromEntries(CATEGORIES.map(c => [c.id, c])),
  pausa: { id: 'pausa', label: 'Pausa', color: '#94a3b8', emoji: '⏸️' },
};

export const OPP_CATEGORIES = ['Becas', 'Movilidad académica', 'Internships industria', 'Quant-HFT'];

export const OPP_STATUSES = [
  'Por investigar',
  'Documentos en proceso',
  'Aplicado',
  'En proceso de entrevistas',
  'Aceptado',
  'Rechazado',
  'Descartado',
];

export const STATUS_COLORS = {
  'Por investigar':            '#94a3b8',
  'Documentos en proceso':     '#f59e0b',
  'Aplicado':                  '#3b82f6',
  'En proceso de entrevistas': '#8b5cf6',
  'Aceptado':                  '#10b981',
  'Rechazado':                 '#ef4444',
  'Descartado':                '#6b7280',
};

export const OPP_CAT_COLORS = {
  'Becas':                 '#f59e0b',
  'Movilidad académica':   '#06b6d4',
  'Internships industria': '#10b981',
  'Quant-HFT':             '#8b5cf6',
};

export const MOBILITY_CHECKLIST = [
  { key: 'formato_homologacion',        label: 'Formato homologación materias' },
  { key: 'carta_postulacion',           label: 'Carta postulación' },
  { key: 'kardex',                      label: 'Kardex' },
  { key: 'constancia_inscripcion',      label: 'Constancia inscripción' },
  { key: 'cv',                          label: 'CV' },
  { key: 'carta_exposicion_motivos',    label: 'Carta exposición motivos' },
  { key: 'carta_compromiso',            label: 'Carta compromiso' },
  { key: 'carta_recomendacion_1',       label: 'Carta recomendación 1' },
  { key: 'carta_recomendacion_2',       label: 'Carta recomendación 2' },
  { key: 'carta_consentimiento_padres', label: 'Carta consentimiento padres' },
  { key: 'comprobante_seguro_social',   label: 'Comprobante seguro social' },
  { key: 'certificado_medico',          label: 'Certificado médico' },
  { key: 'ine_ambos_lados',             label: 'INE ambos lados' },
  { key: 'credencial_estudiante',       label: 'Credencial estudiante ambos lados' },
  { key: 'foto_fondo_blanco',           label: 'Foto fondo blanco' },
  { key: 'seguro_medico_internacional', label: 'Seguro médico internacional' },
  { key: 'pasaporte_vigente',           label: 'Pasaporte vigente 1 año' },
];
