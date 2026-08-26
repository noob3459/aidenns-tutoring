-- One-time data push — NOT run automatically, paste into the Supabase
-- SQL Editor and run once.
--
-- Reorients the site's marketing copy from "structured K-9 curriculum"
-- to "homework help, no set curriculum" (per request: help students
-- with their actual homework/struggles using the tutor's own sample
-- problems and methods, not a fixed lesson plan). DEFAULT_CONFIG in
-- src/context/SiteConfigContext.jsx was updated to match — but per the
-- grade-template retrofit above, any field already stored in
-- site_settings wins over that fallback, so the live text needs this
-- same push or the site keeps showing the old curriculum-framed copy
-- regardless of what ships in the code.
--
-- Unlike retrofit-grade-templates.sql, these UPDATEs are unconditional
-- (no "only if it still matches the old value" guard) since this is an
-- intentional content rewrite, not a bug patch — if any of these fields
-- were hand-edited via the admin dashboard since, this will overwrite
-- that edit with the new copy.

update public.site_settings set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(data,
  '{hero,eyebrow}', '"{grades} Math Homework Help · 100% Free"'),
  '{hero,line1}', '"Stuck on Math Homework?"'),
  '{hero,line2}', '"Get Help. Free."'),
  '{hero,subtext}', '"One-on-one help with whatever your {grades} student is working on right now — no set curriculum, just clear explanations using my own practice problems and methods, online or in person."')
where id = 1;

update public.site_settings set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(data,
  '{pages,services,eyebrow}', '"╱ How I Can Help"'),
  '{pages,services,heading1}', '"Whatever they’re"'),
  '{pages,services,heading2}', '"stuck on."'),
  '{pages,services,sub}', '"No curriculum, no set lesson plan — just focused help on the {grades} math your student is working on right now."')
where id = 1;

update public.site_settings set data = jsonb_set(data, '{pages,approach,sub}', '"Tell me what they’re stuck on, and I’ll walk through it with my own practice problems until it clicks."')
where id = 1;

update public.site_settings set data = jsonb_set(jsonb_set(data,
  '{footer,blurb}', '"Aidenn’s Tutoring: free homework help for {grades} math, whatever they’re stuck on, funded by generous donors."'),
  '{footer,aboutBlurb}', '"Free, one-on-one help with {grades} math homework — no curriculum, just clear explanations when something isn’t clicking."')
where id = 1;

update public.site_settings set data = jsonb_set(data, '{home,featureCards}', '[
  {
    "eyebrow": "01 / Personalized",
    "heading": "Help With What They’re Actually Stuck On",
    "sub": "{grades}, no curriculum required",
    "text": "No fixed lesson plan. Bring the homework, the topic, or the test that’s giving them trouble, and we work through it using my own practice problems and methods."
  },
  {
    "eyebrow": "02 / Live Sessions",
    "heading": "Concepts Click in Real Time",
    "sub": "Shared whiteboard, zero pressure",
    "text": "Watch understanding build live with a shared digital whiteboard and a tutor who adjusts the moment something doesn’t click."
  },
  {
    "eyebrow": "03 / Booking",
    "heading": "Scheduling In Under a Minute",
    "sub": "Pick a time, you’re set",
    "text": "Choose a grade, a format, and an open time slot. A confirmed session lands in your inbox in minutes. Completely free."
  }
]'::jsonb)
where id = 1;

update public.site_settings set data = jsonb_set(data, '{approach,protocolSteps}', '[
  {
    "title": "Tell Me What’s Stuck", "tagline": "Two minutes, that’s it.",
    "text": "Tell me your student’s grade and exactly what they’re stuck on: a homework set, one confusing topic, a test coming up. No cost, no obligation, no catch.",
    "meta": "Step 1 / Listen",
    "imageUrl": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    "title": "I Pull Together the Right Help", "tagline": "Made for that exact problem.",
    "text": "No fixed curriculum to work through. I put together practice problems and explanations aimed at the specific thing that isn’t clicking yet.",
    "meta": "Step 2 / Plan",
    "imageUrl": "https://images.unsplash.com/photo-1509869175650-a1d97972541a?auto=format&fit=crop&w=1200&q=80"
  },
  {
    "title": "Start Free Sessions", "tagline": "Online or in person.",
    "text": "Meet on a recurring weekly slot that fits your family’s schedule. Every session is completely free, this week, next month, always.",
    "meta": "Step 3 / Learn",
    "imageUrl": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=80"
  }
]'::jsonb)
where id = 1;

update public.site_settings set data = jsonb_set(data, '{approach,trustBadges}', '[
  { "title": "Loved by Parents", "text": "“My son actually looks forward to math night now.” (a parent, Grade 4)" },
  { "title": "Real Confidence Gains", "text": "Families consistently report better grades and less homework stress within weeks of starting." },
  { "title": "Background-Checked & Trusted", "text": "Every session is led by a background-checked tutor experienced helping {grades} students work through whatever math they’re stuck on." }
]'::jsonb)
where id = 1;

update public.site_settings set data = jsonb_set(data, '{services,items}', '[
  { "title": "Concept Breakdown", "text": "Stuck on one topic, like fractions or word problems? We rebuild it from scratch with practice problems made for exactly where they’re stuck." },
  { "title": "Homework Help", "text": "Bring whatever’s due tonight, a worksheet, a problem set, a review packet, and we work through it together, step by step." },
  { "title": "Test & Quiz Prep", "text": "Review exactly what’s on the upcoming test, with practice problems modeled on your student’s actual class." },
  { "title": "Ongoing Support", "text": "Weekly sessions that follow whatever your student is covering in class right now. No fixed curriculum, just consistent help." },
  { "title": "Online Sessions", "text": "Live 1:1 video sessions from anywhere, with a shared digital whiteboard." },
  { "title": "In-Person Sessions", "text": "Face-to-face tutoring at a local library or community space near you." }
]'::jsonb)
where id = 1;

update public.site_settings set data = jsonb_set(data, '{booking,steps,0,sub}', '"I help {gradesLong} students with their math homework. Free, always."')
where id = 1;

update public.site_settings set data = jsonb_set(data, '{about,bioParagraphs}', '[
  { "text": "I started Aidenn’s Tutoring because I believe every {grades} student deserves help the moment they get stuck on math homework, regardless of what their family can afford." },
  { "text": "There’s no fixed curriculum here. Every session is built around whatever your student is actually working on right now, a homework set, one confusing topic, an upcoming test, using my own practice problems and explanations." },
  { "text": "Outside of tutoring, I’m focused on keeping this program free forever, funded by donations instead of tuition." }
]'::jsonb)
where id = 1;

update public.site_settings set data = jsonb_set(data, '{about,credentials}', '[
  { "title": "Trusted by Many", "text": "Relied on by families across the community for safe, one-on-one tutoring." },
  { "title": "Homework Help Specialist", "text": "Focused on helping {grades} students work through whatever math they’re currently stuck on, no set curriculum." },
  { "title": "Local & Online", "text": "In-person sessions in Rancho Cucamonga and Fontana, CA, plus online nationwide." }
]'::jsonb)
where id = 1;

update public.site_settings set data = jsonb_set(data, '{legal,privacyParagraphs,0,text}', '"Aidenn’s Tutoring is a free {grades} math homework help service. We collect only what’s needed to schedule and run sessions: a parent or guardian’s name, email, phone number, and the student’s grade level."')
where id = 1;
