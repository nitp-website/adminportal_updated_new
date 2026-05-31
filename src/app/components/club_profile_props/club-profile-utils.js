import { extractS3KeyFromUrl } from '@/lib/utils'

export const emptyClubProfile = {
  title: '',
  about: '',
  description: '',
  patnaPiName: '',
  patnaPiEmail: '',
  patnaPiPhone: '',
  patnaPiDepartment: '',
  bihtaPiName: '',
  bihtaPiEmail: '',
  bihtaPiPhone: '',
  bihtaPiDepartment: '',
}

export function mapClubToFormData(club) {
  return {
    title: club.title,
    about: club.about,
    description: club.description,
    patnaPiName: club.patnaPiName || club.club_pi || '',
    patnaPiEmail: club.patnaPiEmail || '',
    patnaPiPhone: club.patnaPiPhone || '',
    patnaPiDepartment: club.patnaPiDepartment || '',
    bihtaPiName: club.bihtaPiName || '',
    bihtaPiEmail: club.bihtaPiEmail || '',
    bihtaPiPhone: club.bihtaPiPhone || '',
    bihtaPiDepartment: club.bihtaPiDepartment || '',
  }
}

export function mapLogoFromClub(club) {
  if (!club.logo_url) return null

  return {
    name: 'Club logo',
    url: club.logo_url,
    key: extractS3KeyFromUrl(club.logo_url),
  }
}

export function mapBannersFromClub(club) {
  return (club.banners || []).map((banner, index) => ({
    id: banner.id || `${banner.url}-${index}`,
    name: banner.name || `Banner ${index + 1}`,
    url: banner.url,
    key: banner.key || extractS3KeyFromUrl(banner.url),
  }))
}

