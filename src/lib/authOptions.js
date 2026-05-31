import GoogleProvider from 'next-auth/providers/google'
import { ROLES, ROLE_NAMES } from '@/lib/roles'
import { query } from '@/lib/db'
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
          const numericRole = parseInt(userData.role)

          // Block inactive club accounts before creating a session.
          if (numericRole === ROLES.CLUB_ADMIN) {
            const clubs = await query(
              `SELECT status FROM clubs
               WHERE LOWER(club_email) = LOWER(?) OR LOWER(club_name) = LOWER(?)
               LIMIT 1`,
              [profile.email, userData.administration || '']
            ).catch((error) => {
              if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes("doesn't exist")) {
                return []
              }
              throw error
            })

            // Club doesn't exist
            if (clubs.length === 0) {
              return '/?signinError=ClubNotFound'
            }
            
            // Club is inactive
            if (clubs[0].status === 'Inactive') {
              return '/?signinError=ClubInactive'
            }
          }

          user.numericRole = numericRole 
          user.role = Object.keys(ROLES).find(key => ROLES[key] === numericRole)
          user.department = userData.department
          user.administration = userData.administration
          user.designation = userData.designation
  
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
        }
        return session
      }
    },
    pages: {
      // Keep all auth feedback on the existing sign-in screen.
      signIn: '/',
      error: '/',
    },
    secret: process.env.NEXTAUTH_SECRET,
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60,
    },
    debug: process.env.NODE_ENV === 'development',
  }
