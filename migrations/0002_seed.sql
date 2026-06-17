INSERT OR IGNORE INTO opportunities (id, name, category, deadline, status, notes) VALUES
('lakehead',    'Lakehead University (Canadá)', 'Movilidad académica',  NULL, 'Por investigar', 'Requiere consultar con CAI antes de aplicar, no aparece en convocatoria general'),
('optiver',     'Optiver',                      'Quant-HFT',            NULL, 'Por investigar', 'rolling basis, trader test es la etapa más difícil. Apertura aprox agosto 2026 para verano 2027'),
('jane-street', 'Jane Street',                  'Quant-HFT',            NULL, 'Por investigar', 'sin requisito de carrera específica, evalúan en probabilidad/EV/brainteasers. Sin GPA mínimo, rolling basis'),
('two-sigma',   'Two Sigma',                    'Quant-HFT',            NULL, 'Por investigar', 'más enfocado en ML/research que trading puro. Abre agosto'),
('sig',         'SIG (Susquehanna)',             'Quant-HFT',            NULL, 'Por investigar', 'pendiente de investigar fecha exacta'),
('citadel',     'Citadel Securities',            'Quant-HFT',            NULL, 'Por investigar', 'verificar año académico elegible antes de aplicar'),
('etsy',        'Etsy CDMX',                    'Internships industria', NULL, 'Por investigar', 'internship híbrido en CDMX, no requiere visa de trabajo en EEUU');

INSERT OR IGNORE INTO checklist_items (opportunity_id, item_key, checked) VALUES
('lakehead', 'formato_homologacion',        0),
('lakehead', 'carta_postulacion',           0),
('lakehead', 'kardex',                      0),
('lakehead', 'constancia_inscripcion',      0),
('lakehead', 'cv',                          0),
('lakehead', 'carta_exposicion_motivos',    0),
('lakehead', 'carta_compromiso',            0),
('lakehead', 'carta_recomendacion_1',       0),
('lakehead', 'carta_recomendacion_2',       0),
('lakehead', 'carta_consentimiento_padres', 0),
('lakehead', 'comprobante_seguro_social',   0),
('lakehead', 'certificado_medico',          0),
('lakehead', 'ine_ambos_lados',             0),
('lakehead', 'credencial_estudiante',       0),
('lakehead', 'foto_fondo_blanco',           0),
('lakehead', 'seguro_medico_internacional', 0),
('lakehead', 'pasaporte_vigente',           0);
