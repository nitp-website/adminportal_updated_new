export const CLUB_COLUMNS = `
  id,
  club_name,
  club_email,
  category,
  club_president,
  club_secretary,
  status,
  about,
  description,
  logo_url,
  banners,
  patna_pi_name,
  patna_pi_email,
  patna_pi_phone,
  patna_pi_department,
  bihta_pi_name,
  bihta_pi_email,
  bihta_pi_phone,
  bihta_pi_department,
  created_at,
  updated_at
`

export const CLUB_CATEGORIES = new Set([
  'Technical',
  'Cultural',
  'Sports',
  'Literary',
  'Social',
  'Innovation',
  'Academic',
])

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
export const PHONE_PATTERN = /^(?:\+91[\s-]?)?[6-9]\d[\s-]?\d{4}[\s-]?\d{4}$/

