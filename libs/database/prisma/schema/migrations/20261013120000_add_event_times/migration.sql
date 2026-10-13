-- Planned time of day (HH:mm, wall clock of the athlete's time zone) of an
-- event. Nullable: existing events keep their day-only planning.
ALTER TABLE "event" ADD COLUMN "start_time" VARCHAR(5);
ALTER TABLE "event" ADD COLUMN "end_time" VARCHAR(5);
