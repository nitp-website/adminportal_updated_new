export const ROLES = {
  SUPER_ADMIN: 1,
  DEPT_ADMIN: 6,
  ACADEMIC_ADMIN: 2,
  FACULTY: 3,
  OFFICER: 4,
  STAFF: 5,
  TENDER_NOTICE_ADMIN: 7,
  CLUB_ADMIN: 8
}

export const ROLE_NAMES = {
  1: 'Super Admin',
  6: 'Department Admin',
  2: 'Academic Admin', 
  3: 'Faculty',
  4: 'Officer',
  5: 'Staff',
  7: 'Tender Notice Admin',
  8: 'Club Admin'
}

export const hasAccess = (userRole, userDepartment, requiredRole, requiredDepartment, userClubID, requireClubID) => {
  // Super Admin has access to everything
  if (userRole === ROLES.SUPER_ADMIN) return true

  // Department Admin can only access their department
  if (userRole === ROLES.DEPT_ADMIN) {
    return userDepartment === requiredDepartment
  }

  //Clubs Admin can only access their respective Club
  if (userRole === ROLES.CLUB_ADMIN) {
    return userClubID === requireClubID
  }

  // Academic Admin can access all department notices and academic notices
  if (userRole === ROLES.ACADEMIC_ADMIN) {
    return true // They have access to all departments
  }

  // Other roles can only access their own pages
  return userRole === requiredRole
} 
