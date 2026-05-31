'use client'

import styled from 'styled-components'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { Alert, Button, Paper, Typography, Box } from '@mui/material'
import { Google as GoogleIcon } from '@mui/icons-material'

const SigninContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
`

const SigninCard = styled(Paper)`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  
  .logo-container {
    width: 120px;
    height: 120px;
    position: relative;
    margin-bottom: 1rem;
  }
  
  .title {
    color: #830001;
    font-weight: 600;
    text-align: center;
    margin-bottom: 1rem;
  }
  
  .subtitle {
    color: #546e7a;
    text-align: center;
    margin-bottom: 2rem;
  }
`

const StyledButton = styled(Button)`
  padding: 0.8rem 2rem;
  text-transform: none;
  font-size: 1rem;
  border-radius: 50px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  .MuiSvgIcon-root {
    margin-right: 8px;
  }
`

const signinErrorMessages = {
  // Message shown when a club admin account is disabled.
  ClubInactive: 'Your club login is currently inactive. Please contact the administrator.',
}

export default function Sign({ signinError }) {
  const errorMessage = signinErrorMessages[signinError]

  return (
    <SigninContainer>
      <SigninCard elevation={0}>
        <div className="logo-container">
          <Image
            src="/logo.jpg" 
            alt="NITP Logo"
            fill
            style={{ objectFit: 'contain', borderRadius: '50%' }}
            priority
          />
        </div>
        
        <Box>
          <Typography variant="h4" className="title">
            Admin Portal
          </Typography>
          <Typography variant="body1" className="subtitle">
            National Institute of Technology Patna
          </Typography>
        </Box>

        {errorMessage && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        )}

        <StyledButton
          variant="contained"
          color="primary"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          startIcon={<GoogleIcon />}
        >
          Sign in with Google
        </StyledButton>
      </SigninCard>
    </SigninContainer>
  )
}
