import { query } from './db'

export async function populateClubsWithPiDetails(clubs) {
  if (!clubs) return clubs
  const isArray = Array.isArray(clubs)
  const clubList = isArray ? clubs : [clubs]

  // Gather all unique PI emails
  const emails = new Set()
  for (const club of clubList) {
    if (club.members && typeof club.members === 'object') {
      for (const sessionKey of Object.keys(club.members)) {
        const session = club.members[sessionKey]
        if (session?.patna?.pi?.email) {
          emails.add(session.patna.pi.email.toLowerCase().trim())
        }
        if (session?.bihta?.pi?.email) {
          emails.add(session.bihta.pi.email.toLowerCase().trim())
        }
        if (session?.patna_campus_pi?.email) {
          emails.add(session.patna_campus_pi.email.toLowerCase().trim())
        }
        if (session?.bihta_campus_pi?.email) {
          emails.add(session.bihta_campus_pi.email.toLowerCase().trim())
        }
      }
    }
  }

  if (emails.size === 0) return clubs

  try {
    const emailList = Array.from(emails)
    const placeholders = emailList.map(() => '?').join(',')
    const facultyRows = await query(
      `SELECT name, email, ext_no as contact, department, image as avatar 
       FROM user 
       WHERE email IN (${placeholders}) AND is_deleted = 0`,
      emailList
    )

    const facultyMap = new Map(
      facultyRows.map(f => [f.email.toLowerCase().trim(), f])
    )

    for (const club of clubList) {
      if (club.members && typeof club.members === 'object') {
        for (const sessionKey of Object.keys(club.members)) {
          const session = club.members[sessionKey]
          
          if (session?.patna?.pi?.email) {
            const email = session.patna.pi.email.toLowerCase().trim()
            const fac = facultyMap.get(email)
            if (fac) {
              session.patna.pi = {
                ...session.patna.pi,
                name: fac.name || session.patna.pi.name,
                department: fac.department || session.patna.pi.department,
                contact: fac.contact || session.patna.pi.contact,
                avatar: fac.avatar || session.patna.pi.avatar
              }
            }
          }

          if (session?.bihta?.pi?.email) {
            const email = session.bihta.pi.email.toLowerCase().trim()
            const fac = facultyMap.get(email)
            if (fac) {
              session.bihta.pi = {
                ...session.bihta.pi,
                name: fac.name || session.bihta.pi.name,
                department: fac.department || session.bihta.pi.department,
                contact: fac.contact || session.bihta.pi.contact,
                avatar: fac.avatar || session.bihta.pi.avatar
              }
            }
          }

          if (session?.patna_campus_pi?.email) {
            const email = session.patna_campus_pi.email.toLowerCase().trim()
            const fac = facultyMap.get(email)
            if (fac) {
              session.patna_campus_pi = {
                ...session.patna_campus_pi,
                name: fac.name || session.patna_campus_pi.name,
                department: fac.department || session.patna_campus_pi.department,
                contact: fac.contact || session.patna_campus_pi.contact,
                avatar: fac.avatar || session.patna_campus_pi.avatar
              }
            }
          }

          if (session?.bihta_campus_pi?.email) {
            const email = session.bihta_campus_pi.email.toLowerCase().trim()
            const fac = facultyMap.get(email)
            if (fac) {
              session.bihta_campus_pi = {
                ...session.bihta_campus_pi,
                name: fac.name || session.bihta_campus_pi.name,
                department: fac.department || session.bihta_campus_pi.department,
                contact: fac.contact || session.bihta_campus_pi.contact,
                avatar: fac.avatar || session.bihta_campus_pi.avatar
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error populating PI details:', err)
  }

  return isArray ? clubList : clubList[0]
}
