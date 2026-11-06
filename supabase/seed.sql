-- Seed data for StrayCat Walk (achievements, challenge templates, and current UTC challenge instances)
-- Safe to run multiple times (idempotent upserts).

insert into public.achievements (id, title, description, icon, points, metric, threshold, sort_order)
values
  ('first_walk', 'First Stroll', 'Complete your very first walk.', '👟', 25, 'walks_count', 1, 10),
  ('walks_5', 'Neighborhood Regular', 'Complete 5 walks at your own pace.', '🥾', 40, 'walks_count', 5, 20),
  ('walks_25', 'Steady Explorer', 'Complete 25 walks.', '🧭', 100, 'walks_count', 25, 30),
  ('walks_100', 'Century Walker', 'Complete 100 walks.', '🏅', 250, 'walks_count', 100, 40),
  ('distance_10km', '10 km Milestone', 'Cover 10 km of total walking distance.', '🌱', 40, 'total_distance_m', 10000, 50),
  ('distance_50km', '50 km Journey', 'Cover 50 km of total walking distance.', '🌳', 100, 'total_distance_m', 50000, 60),
  ('distance_100km', '100 km Horizon', 'Cover 100 km of total walking distance.', '⛰️', 250, 'total_distance_m', 100000, 70),
  ('first_cat', 'First Cat Discovered', 'Add your first accepted cat sighting to your collection.', '🐱', 25, 'cats_count', 1, 80),
  ('cats_5', 'Friendly Observer', 'Collect 5 cat cards through respectful, no-flash sightings.', '🐾', 50, 'cats_count', 5, 90),
  ('cats_25', 'Cat Whisperer', 'Collect 25 cat cards in your personal collection.', '😺', 125, 'cats_count', 25, 100),
  ('cats_50', 'Feline Archivist', 'Collect 50 cat cards in your personal collection.', '👑', 250, 'cats_count', 50, 110),
  ('weekly_days_3', '3 Active Days in a Week', 'Head out for a walk or steps on 3 different days in a single week.', '☀️', 40, 'weekly_active_days', 3, 120),
  ('weekly_days_5', '5 Active Days in a Week', 'Enjoy 5 active days in a single week—rest days are always welcome!', '🌟', 75, 'weekly_active_days', 5, 130)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  points = excluded.points,
  metric = excluded.metric,
  threshold = excluded.threshold,
  sort_order = excluded.sort_order;

insert into public.challenges (
  id, period, metric, target, easy_target, title, easy_title, description, icon, difficulty, sort_order
)
values
  ('daily_walk_time', 'daily', 'moving_time_s', 900, 600, '15-Minute Walk', '10-Minute Walk', 'Spend time walking outdoors today at a comfortable pace.', '⏱️', 'easy', 10),
  ('daily_steps', 'daily', 'steps', 5000, 3000, '5,000 Steps Today', '3,000 Steps Today', 'Accumulate steps throughout the day.', '👣', 'easy', 20),
  ('daily_distance', 'daily', 'distance_m', 1500, 1000, '1.5 km Walk', '1 km Walk', 'Cover walking distance across your walks today.', '🥾', 'easy', 30),
  ('weekly_walks', 'weekly', 'walks', 3, 2, '3 Walks This Week', '2 Walks This Week', 'Complete walks across the week whenever suits your schedule.', '👟', 'standard', 40),
  ('weekly_distance', 'weekly', 'distance_m', 10000, 6000, '10 km Weekly Total', '6 km Weekly Total', 'Build up your walking distance over the week.', '🗺️', 'standard', 50),
  ('weekly_active_days', 'weekly', 'active_days', 4, 3, 'Walk on 4 Different Days', 'Walk on 3 Different Days', 'Be active on different days this week—rest days always welcome!', '📅', 'standard', 60),
  ('weekly_sightings', 'weekly', 'sightings', 2, 1, '2 Cat Sightings', '1 Cat Sighting', 'Spot and photograph cats respectfully from a distance anywhere.', '🐱', 'standard', 70)
on conflict (id) do update
set
  period = excluded.period,
  metric = excluded.metric,
  target = excluded.target,
  easy_target = excluded.easy_target,
  title = excluded.title,
  easy_title = excluded.easy_title,
  description = excluded.description,
  icon = excluded.icon,
  difficulty = excluded.difficulty,
  sort_order = excluded.sort_order;

select public.ensure_active_challenge_instances((now() at time zone 'utc')::date);
