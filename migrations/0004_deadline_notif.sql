-- Marca la última vez que se envió un recordatorio de deadline, para no
-- repetirlo más de una vez al día.
ALTER TABLE settings ADD COLUMN last_deadline_notified_at TEXT;
