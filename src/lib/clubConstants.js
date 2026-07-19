export const CLUB_CATEGORIES = [
  'Technical',
  'Sports',
  'Cultural & Social',
]

export const CLUB_STATUSES = ['Active', 'Inactive']

export const EMPTY_CAMPUS_PI = {
  name: '',
  email: '',
  phone: '',
  department: '',
}

export const DEFAULT_CLUB_FORM = {
  club_login_id: '',
  name: '',
  email: '',
  category: 'Technical',
  status: 'Active',
  description: '',
  about: '',
  logo: '',
  pictures: [],
  picturesInput: '',
  patna_campus_pi: { ...EMPTY_CAMPUS_PI },
  bihta_campus_pi: { ...EMPTY_CAMPUS_PI },
  club_president: '',
  club_secretary: '',
}
