'use client'

import { AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Avatar, Box } from '@mui/material'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import styled from 'styled-components'
import MenuIcon from '@mui/icons-material/Menu'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import DashboardIcon from '@mui/icons-material/Dashboard'
import NotificationsIcon from '@mui/icons-material/Notifications'
import EventIcon from '@mui/icons-material/Event'
import NewspaperIcon from '@mui/icons-material/Newspaper'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import GroupIcon from '@mui/icons-material/Group'
import SettingsIcon from '@mui/icons-material/Settings'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { ROLES } from '@/lib/roles'
import { useFacultyData } from '@/context/FacultyDataContext'

const StyledHeader = styled.header`
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 2rem;
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .title {
    color: white;
    font-size: 1.2rem;
    font-weight: 500;
    margin-left: 0.5rem;
  }

  .drawer-list {
    width: 280px;
    min-width: 280px;
    height: 100%;
    background: linear-gradient(to bottom, #f5f5f5, #ffffff);
  }
  
  .drawer-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    
     justify-content: center; 
    background-color: #830001;
    color: white;
  }
  
  .drawer-avatar {
    width: 90px;
    height: 90px;
    border: 4px solid white;
    margin-bottom: 1.25rem;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .drawer-user-name {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .drawer-user-role {
    font-size: 0.85rem;
    opacity: 0.9;
  }
  
  .menu-item {
    margin: 0.5rem 0.75rem;
    border-radius: 8px;
    transition: all 0.2s ease;
    padding: 0.5rem 0.75rem;
    
    &:hover {
      background-color: rgba(131, 0, 1, 0.08);
    }
  }
  
  .menu-icon {
    color: #830001;
    margin-right: 0.5rem;
  }
  
  .logout-button {
    margin-top: auto;
    padding: 1.5rem;
    display: flex;
    justify-content: center;
  }
  
  .user-section {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.5rem;
  }
  
  .signout-button {
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.5);
    transition: all 0.2s ease;
    padding: 0.5rem 1rem;
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      border-color: white;
    }
  }
`

const menuItems = {
  [ROLES.SUPER_ADMIN]: [
    { text: 'Profile', href: '/', icon: <AccountCircleIcon /> },
    { text: 'Events', href: '/events', icon: <EventIcon /> },
    { text: 'Notice', href: '/notice', icon: <NotificationsIcon /> },
    { text: 'News', href: '/news', icon: <NewspaperIcon /> },
    { text: 'Innovation', href: '/innovation', icon: <LightbulbIcon /> },
    { text: 'Faculty Management', href: '/faculty-management', icon: <GroupIcon /> },
    { text: 'Role Management', href: '/role-management', icon: <AdminPanelSettingsIcon /> }
  ],
  [ROLES.ACADEMIC_ADMIN]: [
    { text: 'Profile', href: '/', icon: <AccountCircleIcon /> },
    { text: 'Notice', href: '/notice', icon: <NotificationsIcon /> }
  ],
  [ROLES.DEPT_ADMIN]: [
    { text: 'Profile', href: '/', icon: <AccountCircleIcon /> },
    { text: 'Notice', href: '/notice', icon: <NotificationsIcon /> }
  ],
  [ROLES.FACULTY]: [
    { text: 'Profile', href: '/', icon: <AccountCircleIcon /> }
  ],
  [ROLES.OFFICER]: [
    { text: 'Profile', href: '/', icon: <AccountCircleIcon /> },
    { text: 'Notice', href: '/notice', icon: <NotificationsIcon /> },
    { text: 'Designation Management', href: '/designation-management', icon: <AdminPanelSettingsIcon /> },
    { text: 'Officer Control Panel', href: '/officer-control-panel', icon: <SettingsIcon /> }
  ],
  [ROLES.STAFF]: [
    { text: 'Profile', href: '/', icon: <AccountCircleIcon /> }
  ],
  [ROLES.TENDER_NOTICE_ADMIN]: [
    { text: 'Profile', href: '/', icon: <AccountCircleIcon /> },
    { text: 'Notice', href: '/notice', icon: <NotificationsIcon /> }
  ]
}

export default function Header() {
  const { data: session } = useSession()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const facultyDataContext = useFacultyData()
  const [profileImage, setProfileImage] = useState(null)
  
  console.log('Header - facultyDataContext:', facultyDataContext)
  console.log('Header - facultyData:', facultyDataContext?.facultyData)
  console.log('Header - profile image from context:', facultyDataContext?.facultyData?.profile?.image)
  
  // Use the same approach as profile page - watch for facultyData changes
  useEffect(() => {
    console.log('Header - facultyData changed:', facultyDataContext?.facultyData)
    if (facultyDataContext?.facultyData?.profile?.image) {
      console.log('Header - Setting profile image from facultyData:', facultyDataContext.facultyData.profile.image)
      setProfileImage(facultyDataContext.facultyData.profile.image)
    }
  }, [facultyDataContext?.facultyData])

  // Fallback to getBasicInfo if facultyData is not available
  useEffect(() => {
    if (session?.user?.email && facultyDataContext && typeof facultyDataContext.getBasicInfo === 'function') {
      try {
        const basicInfo = facultyDataContext.getBasicInfo()
        console.log('Header - Basic Info:', basicInfo)
        if (basicInfo?.image && !profileImage) {
          console.log('Header - Setting profile image from basic info:', basicInfo.image)
          setProfileImage(basicInfo.image)
        }
      } catch (error) {
        console.error('Error getting basic info in header:', error)
      }
    }
  }, [session?.user?.email, facultyDataContext, profileImage])

  // Force refresh when session changes
  useEffect(() => {
    if (session?.user?.email && facultyDataContext?.facultyData?.profile?.image) {
      console.log('Header - Session changed, setting image:', facultyDataContext.facultyData.profile.image)
      setProfileImage(facultyDataContext.facultyData.profile.image)
    }
  }, [session?.user?.email, facultyDataContext?.facultyData?.profile?.image])

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return
    }
    setDrawerOpen(open)
  }

  const getMenuItems = () => {
    if (!session?.user?.numericRole) return []
    return menuItems[session.user.numericRole] || []
  }

  const handleSignOut = () => {
    signOut()
  }

  const drawerList = () => (
    <Box 
      className="drawer-list" 
      role="presentation" 
      onClick={toggleDrawer(false)}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%' , margin:'10px'}}
    >
      <div className="drawer-header center text-center justify-center ">
        <Avatar 
          src={profileImage || '/faculty.png'} 
          alt={session?.user?.name || 'User'} 
          className="drawer-avatar"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = '/faculty.png'
          }}
        >
          {!profileImage && session?.user?.name?.charAt(0)}
        </Avatar>
        <Typography variant="h6" className="drawer-user-name">
          {session?.user?.name}
        </Typography>
        <Typography variant="body2" className="drawer-user-role">
          {session?.user?.role}
        </Typography>
      </div>
      
      <List sx={{ flexGrow: 1, py: 2 }}>
        {getMenuItems().map((item) => (
          <Link href={item.href} key={item.text} style={{ textDecoration: 'none', color: 'inherit' }}>
            <ListItem button className="menu-item">
              <ListItemIcon className="menu-icon">
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          </Link>
        ))}
      </List>
      
      <Divider />
      <Box className="logout-button">
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleSignOut}
          startIcon={<ExitToAppIcon />}
          fullWidth
          sx={{ 
            backgroundColor: '#830001', 
            '&:hover': { backgroundColor: '#9a0000' },
            padding: '0.75rem'
          }}
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  )

  return (
    <StyledHeader>
      <AppBar position="static" style={{backgroundColor:"#830001"}}>
        <Toolbar className="toolbar">
          <div className="logo-section">
            <IconButton
              color="inherit"
              onClick={toggleDrawer(true)}
              edge="start"
              sx={{ mr: 1 }}
            >
              <MenuIcon style={{color:"white"}} />
            </IconButton>
            <Image 
              src="/logo.jpg" 
              alt="NITP Logo" 
              width={45} 
              height={45}
              style={{borderRadius:"50%", border: "2px solid white"}}
            />
            <Typography variant="h6" className="title" style={{color:"white",fontWeight:"bold"}}>
              NIT Patna Admin Portal
            </Typography>
          </div>
          
          {session && (
            <div className="user-section">
              <Avatar 
                src={profileImage || '/faculty.png'} 
                alt={session.user.name}
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = '/faculty.png'
                }}
                sx={{ 
                  width: 40, 
                  height: 40, 
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                {!profileImage && session.user.name?.charAt(0)}
              </Avatar>
              <Button 
                variant="outlined" 
                size="medium"
                onClick={handleSignOut}
                startIcon={<ExitToAppIcon />}
                className="signout-button"
              >
                Sign Out
              </Button>
            </div>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            minWidth: '280px',
            width: '280px'
          }
        }}
      >
        {drawerList()}
      </Drawer>
    </StyledHeader>
  )
}

