CREATE TABLE IF NOT EXISTS url_monitors (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  label TEXT NOT NULL,
  content_hash TEXT,
  last_checked_at TEXT,
  last_changed_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pre-seed monitors para las oportunidades conocidas
INSERT OR IGNORE INTO url_monitors (id, opportunity_id, url, label) VALUES
('mon-optiver',     'optiver',     'https://optiver.com/working-at-optiver/career-opportunities/?location=all&team=all&education=internship', 'Optiver — internships'),
('mon-janestreet',  'jane-street', 'https://www.janestreet.com/join-jane-street/open-roles/?type=internship-or-co-op', 'Jane Street — internships'),
('mon-twosigma',    'two-sigma',   'https://careers.twosigma.com/careers/JobList?jobCategory=Internship', 'Two Sigma — internships'),
('mon-sig',         'sig',         'https://sig.com/campus-recruiting/internships/', 'SIG — internships'),
('mon-citadel',     'citadel',     'https://www.citadelsecurities.com/careers/students-and-graduates/', 'Citadel Securities — campus'),
('mon-etsy',        'etsy',        'https://careers.etsy.com/global/en/internships', 'Etsy — internships');
