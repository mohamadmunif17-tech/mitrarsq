-- Indeks pendukung impor penilaian dan rekap bulanan per kelas.
-- Jalankan sekali di Supabase SQL Editor.
CREATE INDEX IF NOT EXISTS attendance_student_tanggal_idx
  ON public.attendance (student_id, tanggal);

CREATE INDEX IF NOT EXISTS scores_student_tanggal_idx
  ON public.scores (student_id, tanggal);

CREATE INDEX IF NOT EXISTS attendance_tanggal_id_idx
  ON public.attendance (tanggal DESC, id DESC);

CREATE INDEX IF NOT EXISTS scores_tanggal_id_idx
  ON public.scores (tanggal DESC, id DESC);

CREATE INDEX IF NOT EXISTS students_kelas_nis_idx
  ON public.students (kelas_id, nis);

ANALYZE public.attendance;
ANALYZE public.scores;
