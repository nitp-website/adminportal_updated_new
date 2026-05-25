'use client'

import styled from 'styled-components'
import Image from 'next/image'

const StyledFooter = styled.footer`
  padding: 3rem 1rem 2rem;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  border-top: 3px solid #830001;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
`

const FooterContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`

const FooterSection = styled.div`
  h3 {
    margin-bottom: 1.5rem;
    color: #fff;
    font-size: 1.3rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #830001;
    padding-bottom: 0.5rem;
    display: inline-block;
  }
  
  p {
    margin: 0.8rem 0;
    line-height: 1.8;
    color: #ecf0f1;
    font-size: 0.95rem;
  }
  
  a {
    color: #3498db;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.3s ease;
    
    &:hover {
      color: #e74c3c;
      text-decoration: underline;
    }
  }
`

const Logo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  
  img {
    width: 70px;
    height: 70px;
    object-fit: contain;
    margin-right: 1rem;
    border: 3px solid #ecf0f1;
    border-radius: 50%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  h2 {
    color: white;
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.3;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  @media (max-width: 768px) {
    justify-content: center;
    flex-direction: column;
    
    img {
      margin-right: 0;
      margin-bottom: 0.8rem;
    }
  }
`

const LinkList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  
  a {
    display: inline-block;
    padding: 0.5rem 0;
    border-left: 3px solid transparent;
    padding-left: 0.8rem;
    transition: all 0.3s ease;
    
    &:hover {
      border-left-color: #830001;
      padding-left: 1.2rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
  }
`

const Copyright = styled.div`
  text-align: center;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #495057;
  color: #bdc3c7;
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.1);
  margin-left: -1rem;
  margin-right: -1rem;
  padding-left: 1rem;
  padding-right: 1rem;

  p{
    padding-bottom: 1rem;
  }
`

export default function Footer() {
  return (
    <StyledFooter>
      <FooterContainer>
        <FooterSection>
          <Logo>
            <img src="/logo.jpg" alt="NIT Patna Logo" style={{ borderRadius: '50%' }} />
            <h2>National Institute of Technology Patna</h2>
          </Logo>
          <p>Ashok Rajpath, Mahendru, Patna, Bihar 800005</p>
          <p>📞 0612-2371715</p>
          <p>✉️ <a href="mailto:info@nitp.ac.in">info@nitp.ac.in</a></p>
          <p>🌐 <a href="https://www.nitp.ac.in" target="_blank" rel="noopener noreferrer">www.nitp.ac.in</a></p>
        </FooterSection>
        
        <FooterSection>
          <h3>Quick Links</h3>
          <LinkList>
            <a href="https://www.nitp.ac.in" target="_blank" rel="noopener noreferrer">
              NIT Patna Main Website
            </a>
            <a href="http://exam.nitp.ac.in/" target="_blank" rel="noopener noreferrer">
              Faculty Academic Portal
            </a>
          </LinkList>
        </FooterSection>
      </FooterContainer>
      
      <Copyright>
        <p>© {new Date().getFullYear()} National Institute of Technology Patna. All rights reserved.</p>
      </Copyright>
    </StyledFooter>
  )
}
