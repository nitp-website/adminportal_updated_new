import GoogleProvider from 'next-auth/providers/google'
import { ROLES } from '@/lib/roles'
import { query } from '@/lib/db'
import { getFacultySpecialPermissions } from '@/lib/specialPermissions'
export const authOptions = {
    providers: [
      GoogleProvider({
        clientId: process.env.NEXT_GOOGLE_ID,
        clientSecret: process.env.NEXT_GOOGLE_SECRET,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
            hd: "nitp.ac.in"
          }
        }
      }),
    ],
    callbacks: {
      async signIn({ user, account, profile }) {
        try {
          const results = await query(
            `SELECT * FROM user WHERE email = ?`,
            [profile.email]
          )
  
          if (results.length === 0) {
            console.log("User not found in database")
            return false
          }
  
          const userData = results[0]
          if (userData.is_deleted) {
            console.log("User is marked as deleted/inactive")
            return false
          }
          const numericRole = parseInt(userData.role)
          user.numericRole = numericRole
          user.role = Object.keys(ROLES).find((key) => ROLES[key] === numericRole)
          user.department = userData.department
          user.administration = userData.administration
          user.designation = userData.designation
          user.clubId = userData.club_id ? parseInt(userData.club_id, 10) : null
          
          try {
            user.specialPermissions = await getFacultySpecialPermissions(profile.email)
          } catch (e) {
            user.specialPermissions = []
          }

          if (numericRole === ROLES.CLUB_ADMIN) {
            if (!user.clubId) {
              console.log('Club admin missing club_id on user record')
              return false
            }
            const clubRows = await query(
              'SELECT id, club_login_id, status FROM clubs WHERE id = ? LIMIT 1',
              [user.clubId]
            )
            if (!clubRows.length) {
              console.log('Club not found for club admin login')
              return false
            }
            if (clubRows[0].status !== 'Active') {
              console.log('Club is inactive — login denied')
              return false
            }
            user.clubLoginId = clubRows[0].club_login_id
          }

          return true
        } catch (error) {
          console.error("Database error:", error)
          return false
        }
      },
      async jwt({ token, user, account }) {
        if (account && user) {
          token.accessToken = account.access_token
          token.email = user.email
          token.numericRole = user.numericRole
          token.role = user.role
          token.department = user.department
          token.administration = user.administration
          token.designation = user.designation
          token.clubId = user.clubId ?? null
          token.clubLoginId = user.clubLoginId ?? null
          token.specialPermissions = user.specialPermissions ?? []
        }
        return token
      },
      async session({ session, token }) {
        if (token) {
          session.accessToken = token.accessToken
          session.user.email = token.email
          session.user.numericRole = token.numericRole
          session.user.role = token.role
          session.user.department = token.department
          session.user.administration = token.administration
          session.user.designation = token.designation
          session.user.clubId = token.clubId ?? null
          session.user.clubLoginId = token.clubLoginId ?? null
          session.user.specialPermissions = token.specialPermissions ?? []
        }
        return session
      }
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
    secret: process.env.NEXTAUTH_SECRET,
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60,
    },
    debug: process.env.NODE_ENV === 'development',
  }