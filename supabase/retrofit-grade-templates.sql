-- One-time data retrofit — NOT run automatically, paste into the
-- Supabase SQL Editor and run once.
--
-- The {grades}/{gradesLong} template-token system (added in commit
-- 522b26f) was only ever written into DEFAULT_CONFIG, the client-side
-- fallback used when a field is absent from the database. The live
-- site_settings row already had these 13 fields populated with literal
-- "K-9" text from before the token system existed, and a stored value
-- always wins over the fallback — so the literal text kept showing on
-- the public site no matter what the Grades Served admin setting was
-- changed to.
--
-- Each UPDATE below is a no-op unless the field still holds EXACTLY its
-- pre-tokenization literal value, so any of these 13 fields an admin
-- has since hand-edited to something else is left untouched.

update public.site_settings set data = jsonb_set(data, '{hero,eyebrow}', '"{grades} Math Tutoring · 100% Free"')
  where id = 1 and data#>>'{hero,eyebrow}' = 'K-9 Math Tutoring · 100% Free';

update public.site_settings set data = jsonb_set(data, '{hero,subtext}', '"One-on-one {grades} math tutoring from a certified educator, online or in person. No tuition, no hidden fees, ever."')
  where id = 1 and data#>>'{hero,subtext}' = 'One-on-one K-9 math tutoring from a certified educator, online or in person. No tuition, no hidden fees, ever.';

update public.site_settings set data = jsonb_set(data, '{pages,services,sub}', '"{grades} math, covered start to finish, online or in person, always at no cost."')
  where id = 1 and data#>>'{pages,services,sub}' = 'K-9 math, covered start to finish, online or in person, always at no cost.';

update public.site_settings set data = jsonb_set(data, '{footer,blurb}', '"Aidenn’s Tutoring: free {grades} math tutoring, online and in person, funded by generous donors."')
  where id = 1 and data#>>'{footer,blurb}' = 'Aidenn’s Tutoring: free K-9 math tutoring, online and in person, funded by generous donors.';

update public.site_settings set data = jsonb_set(data, '{footer,aboutBlurb}', '"Certified {grades} math tutoring for every family, no tuition, no hidden fees, ever."')
  where id = 1 and data#>>'{footer,aboutBlurb}' = 'Certified K-9 math tutoring for every family, no tuition, no hidden fees, ever.';

update public.site_settings set data = jsonb_set(data, '{home,featureCards,0,sub}', '"{grades}, matched exactly"')
  where id = 1 and data#>>'{home,featureCards,0,sub}' = 'K-9, matched exactly';

update public.site_settings set data = jsonb_set(data, '{approach,trustBadges,2,text}', '"Every session is led by a certified {grades} educator trained in child-safe tutoring practices."')
  where id = 1 and data#>>'{approach,trustBadges,2,text}' = 'Every session is led by a certified K-9 educator trained in child-safe tutoring practices.';

update public.site_settings set data = jsonb_set(data, '{booking,steps,0,sub}', '"We tutor {gradesLong} math. Free, always."')
  where id = 1 and data#>>'{booking,steps,0,sub}' = 'We tutor kindergarten through 9th grade math. Free, always.';

update public.site_settings set data = jsonb_set(data, '{about,bioParagraphs,0,text}', '"I started Aidenn’s Tutoring because I believe every {grades} student deserves one-on-one math help, regardless of what their family can afford."')
  where id = 1 and data#>>'{about,bioParagraphs,0,text}' = 'I started Aidenn’s Tutoring because I believe every K-9 student deserves one-on-one math help, regardless of what their family can afford.';

update public.site_settings set data = jsonb_set(data, '{about,credentials,1,title}', '"{grades} Math Specialist"')
  where id = 1 and data#>>'{about,credentials,1,title}' = 'K-9 Math Specialist';

update public.site_settings set data = jsonb_set(data, '{about,credentials,1,text}', '"Focused exclusively on {grades} math, from counting to Algebra I."')
  where id = 1 and data#>>'{about,credentials,1,text}' = 'Focused exclusively on K-9 math, from counting to Algebra I.';

update public.site_settings set data = jsonb_set(data, '{legal,privacyParagraphs,0,text}', '"Aidenn’s Tutoring is a free {grades} math tutoring service. We collect only what’s needed to schedule and run sessions: a parent or guardian’s name, email, phone number, and the student’s grade level."')
  where id = 1 and data#>>'{legal,privacyParagraphs,0,text}' = 'Aidenn’s Tutoring is a free K-9 math tutoring service. We collect only what’s needed to schedule and run sessions: a parent or guardian’s name, email, phone number, and the student’s grade level.';

update public.site_settings set data = jsonb_set(data, '{legal,termsParagraphs,0,text}', '"Sessions booked through Aidenn’s Tutoring are provided free of charge to {grades} students. Donations are entirely optional and go toward keeping the program free for every family."')
  where id = 1 and data#>>'{legal,termsParagraphs,0,text}' = 'Sessions booked through Aidenn’s Tutoring are provided free of charge to K-9 students. Donations are entirely optional and go toward keeping the program free for every family.';
