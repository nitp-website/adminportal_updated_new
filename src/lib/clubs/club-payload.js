import { CLUB_CATEGORIES, EMAIL_PATTERN, PHONE_PATTERN } from './club-constants'
import { normalizeClub } from './club-db'

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanNullableString(value) {
  const cleaned = cleanString(value)
  return cleaned || null
}

function hasAnyOwnProperty(data, keys) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(data, key))
}

function isValidUrl(value) {
  if (!value) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (error) {
    return false
  }
}

export function buildClubPayload(data = {}) {
  const club = normalizeClub(data)
  const patnaPiName = cleanString(data.patnaPiName ?? data.patna_pi_name ?? data.club_pi ?? '')
  const patnaPiEmail = cleanString(data.patnaPiEmail ?? data.patna_pi_email ?? '')
  const patnaPiPhone = cleanString(data.patnaPiPhone ?? data.patna_pi_phone ?? '')
  const patnaPiDepartment = cleanString(data.patnaPiDepartment ?? data.patna_pi_department ?? '')
  const bihtaPiName = cleanString(data.bihtaPiName ?? data.bihta_pi_name ?? '')
  const bihtaPiEmail = cleanString(data.bihtaPiEmail ?? data.bihta_pi_email ?? '')
  const bihtaPiPhone = cleanString(data.bihtaPiPhone ?? data.bihta_pi_phone ?? '')
  const bihtaPiDepartment = cleanString(data.bihtaPiDepartment ?? data.bihta_pi_department ?? '')
  const status = cleanString(club.status) || 'Active'

  return {
    club_name: cleanString(club.club_name),
    club_email: cleanString(club.club_email).toLowerCase(),
    category: cleanNullableString(club.category),
    club_pi: cleanNullableString(club.club_pi || patnaPiName),
    club_president: cleanNullableString(club.club_president),
    club_secretary: cleanNullableString(club.club_secretary),
    status,
    about: cleanNullableString(data.about),
    description: cleanNullableString(data.description),
    logo_url: cleanNullableString(club.logo_url),
    banners: Array.isArray(club.banners) ? club.banners : [],
    patna_pi_name: cleanNullableString(patnaPiName),
    patna_pi_email: cleanNullableString(patnaPiEmail),
    patna_pi_phone: cleanNullableString(patnaPiPhone),
    patna_pi_department: cleanNullableString(patnaPiDepartment),
    bihta_pi_name: cleanNullableString(bihtaPiName),
    bihta_pi_email: cleanNullableString(bihtaPiEmail),
    bihta_pi_phone: cleanNullableString(bihtaPiPhone),
    bihta_pi_department: cleanNullableString(bihtaPiDepartment),
  }
}

export function preserveMissingClubPayloadFields(payload, existingClub, data = {}) {
  const fieldSources = {
    club_name: ['club_name', 'title'],
    club_email: ['club_email'],
    category: ['category'],
    club_pi: ['club_pi', 'patnaPiName', 'patna_pi_name'],
    club_president: ['club_president'],
    club_secretary: ['club_secretary'],
    status: ['status'],
    about: ['about'],
    description: ['description'],
    logo_url: ['logo_url'],
    banners: ['banners'],
    patna_pi_name: ['patnaPiName', 'patna_pi_name'],
    patna_pi_email: ['patnaPiEmail', 'patna_pi_email'],
    patna_pi_phone: ['patnaPiPhone', 'patna_pi_phone'],
    patna_pi_department: ['patnaPiDepartment', 'patna_pi_department'],
    bihta_pi_name: ['bihtaPiName', 'bihta_pi_name'],
    bihta_pi_email: ['bihtaPiEmail', 'bihta_pi_email'],
    bihta_pi_phone: ['bihtaPiPhone', 'bihta_pi_phone'],
    bihta_pi_department: ['bihtaPiDepartment', 'bihta_pi_department'],
  }

  const existingValues = {
    club_name: existingClub.club_name,
    club_email: existingClub.club_email,
    category: existingClub.category,
    club_pi: existingClub.club_pi,
    club_president: existingClub.club_president,
    club_secretary: existingClub.club_secretary,
    status: existingClub.status,
    about: existingClub.about,
    description: existingClub.description,
    logo_url: existingClub.logo_url,
    banners: existingClub.banners,
    patna_pi_name: existingClub.patna_pi_name ?? existingClub.patnaPiName,
    patna_pi_email: existingClub.patna_pi_email ?? existingClub.patnaPiEmail,
    patna_pi_phone: existingClub.patna_pi_phone ?? existingClub.patnaPiPhone,
    patna_pi_department: existingClub.patna_pi_department ?? existingClub.patnaPiDepartment,
    bihta_pi_name: existingClub.bihta_pi_name ?? existingClub.bihtaPiName,
    bihta_pi_email: existingClub.bihta_pi_email ?? existingClub.bihtaPiEmail,
    bihta_pi_phone: existingClub.bihta_pi_phone ?? existingClub.bihtaPiPhone,
    bihta_pi_department: existingClub.bihta_pi_department ?? existingClub.bihtaPiDepartment,
  }

  return Object.entries(fieldSources).reduce(
    (nextPayload, [field, sources]) => {
      if (!hasAnyOwnProperty(data, sources)) {
        nextPayload[field] = existingValues[field] ?? null
      }
      return nextPayload
    },
    { ...payload }
  )
}

export function validateClubPayload(payload, { requireCategory = false } = {}) {
  const errors = []

  const requiredStringFields = [
    ['club_name', 'Club name is required'],
    ['club_email', 'Club email is required'],
  ]

  for (const [field, message] of requiredStringFields) {
    if (!payload[field]) {
      errors.push({ field, message })
    }
  }

  const maxLengths = [
    ['club_name', 255, 'Club name'],
    ['club_email', 255, 'Club email'],
    ['category', 100, 'Category'],
    ['club_pi', 255, 'Club PI'],
    ['club_president', 255, 'Club president'],
    ['club_secretary', 255, 'Club secretary'],
    ['patna_pi_name', 255, 'Patna PI name'],
    ['patna_pi_email', 255, 'Patna PI email'],
    ['patna_pi_phone', 50, 'Patna PI phone'],
    ['patna_pi_department', 255, 'Patna PI department'],
    ['bihta_pi_name', 255, 'Bihta PI name'],
    ['bihta_pi_email', 255, 'Bihta PI email'],
    ['bihta_pi_phone', 50, 'Bihta PI phone'],
    ['bihta_pi_department', 255, 'Bihta PI department'],
  ]

  for (const [field, max, label] of maxLengths) {
    if (payload[field] && payload[field].length > max) {
      errors.push({ field, message: `${label} must be ${max} characters or fewer` })
    }
  }

  if (payload.club_email && !EMAIL_PATTERN.test(payload.club_email)) {
    errors.push({ field: 'club_email', message: 'Club email is invalid' })
  }

  if (requireCategory && !payload.category) {
    errors.push({ field: 'category', message: 'Category is required' })
  }

  if (payload.category && !CLUB_CATEGORIES.has(payload.category)) {
    errors.push({ field: 'category', message: 'Category is invalid' })
  }

  if (!['Active', 'Inactive'].includes(payload.status)) {
    errors.push({ field: 'status', message: 'Status must be Active or Inactive' })
  }

  for (const field of ['patna_pi_email', 'bihta_pi_email']) {
    if (payload[field] && !EMAIL_PATTERN.test(payload[field])) {
      errors.push({ field, message: `${field === 'patna_pi_email' ? 'Patna' : 'Bihta'} PI email is invalid` })
    }
  }

  for (const field of ['patna_pi_phone', 'bihta_pi_phone']) {
    if (payload[field] && !PHONE_PATTERN.test(payload[field])) {
      errors.push({ field, message: `${field === 'patna_pi_phone' ? 'Patna' : 'Bihta'} PI phone is invalid` })
    }
  }

  if (payload.logo_url && !isValidUrl(payload.logo_url)) {
    errors.push({ field: 'logo_url', message: 'Logo URL is invalid' })
  }

  if (!Array.isArray(payload.banners)) {
    errors.push({ field: 'banners', message: 'Banners must be a list' })
  } else {
    if (payload.banners.length > 10) {
      errors.push({ field: 'banners', message: 'A club can have at most 10 banners' })
    }

    payload.banners.forEach((banner, index) => {
      if (!banner || typeof banner !== 'object') {
        errors.push({ field: `banners.${index}`, message: 'Banner is invalid' })
        return
      }

      if (!banner.url || !isValidUrl(banner.url)) {
        errors.push({ field: `banners.${index}.url`, message: 'Banner URL is invalid' })
      }

      if (banner.name && String(banner.name).length > 255) {
        errors.push({ field: `banners.${index}.name`, message: 'Banner name must be 255 characters or fewer' })
      }
    })
  }

  return errors
}
