'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const FacultyDataContext = createContext({})

// Cache for faculty data to prevent duplicate API calls
// Using memory cache and session storage for persistence
const facultyDataCache = new Map()

// Cache timeout in milliseconds (10 minutes)
const CACHE_TIMEOUT = 10 * 60 * 1000

export function FacultyDataProvider({ children }) {
  const { data: session } = useSession()
  const [facultyData, setFacultyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(null)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null)

  // Auto-refresh function
  const setupAutoRefresh = (userEmail) => {
    // Clear any existing interval
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
    }
    
    // Set up new interval for auto-refresh every 10 minutes
    const interval = setInterval(() => {
      console.log('[FacultyDataContext] Auto-refreshing data after 10 minutes')
      refreshFacultyData()
    }, CACHE_TIMEOUT)
    
    setAutoRefreshInterval(interval)
    return interval
  }

  // Cleanup auto-refresh on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval)
      }
    }
  }, [autoRefreshInterval])

  useEffect(() => {
    if (!session?.user?.email) {
      setLoading(false)
      return
    }

    // Skip faculty data fetch for non-faculty roles (CLUB_ADMIN, etc.)
    const nonFacultyRoles = ['CLUB_ADMIN']
    if (session?.user?.role && nonFacultyRoles.includes(session.user.role)) {
      console.log('[FacultyDataContext] Skipping faculty data fetch for role:', session.user.role)
      setFacultyData(null)
      setLoading(false)
      return
    }

    const userEmail = session.user.email
    console.log('[FacultyDataContext] Initializing for user:', userEmail)
    
    // Try to get data from session storage first
    const trySessionStorage = () => {
      if (typeof window !== 'undefined') {
        try {
          const storageKey = `faculty_data_${userEmail}`
          const storedData = sessionStorage.getItem(storageKey)
          
          if (storedData) {
            const { data, timestamp } = JSON.parse(storedData)
            const now = Date.now()
            
            // Check if cache is still valid (less than 10 minutes old)
            if (now - timestamp < CACHE_TIMEOUT) {
              console.log('[FacultyDataContext] Using session storage cache for:', userEmail)
              console.log('[FacultyDataContext] Cache data structure:', Object.keys(data))
              setFacultyData(data)
              facultyDataCache.set(userEmail, { data, timestamp })
              setLastFetchTime(timestamp)
              setLoading(false)
              
              // Setup auto-refresh for remaining time
              const remainingTime = CACHE_TIMEOUT - (now - timestamp)
              setTimeout(() => {
                setupAutoRefresh(userEmail)
              }, remainingTime)
              
              return true
            }
            
            console.log('[FacultyDataContext] Cache expired for:', userEmail)
          }
        } catch (err) {
          console.error('[FacultyDataContext] Error accessing session storage:', err)
        }
      }
      return false
    }
    
    // Check memory cache
    if (facultyDataCache.has(userEmail)) {
      const { data, timestamp } = facultyDataCache.get(userEmail)
      const now = Date.now()
      
      if (now - timestamp < CACHE_TIMEOUT) {
        console.log('[FacultyDataContext] Using memory cache for:', userEmail)
        console.log('[FacultyDataContext] Memory cache data structure:', Object.keys(data))
        setFacultyData(data)
        setLastFetchTime(timestamp)
        setLoading(false)
        
        // Setup auto-refresh for remaining time
        const remainingTime = CACHE_TIMEOUT - (now - timestamp)
        setTimeout(() => {
          setupAutoRefresh(userEmail)
        }, remainingTime)
        
        return
      }
      
      console.log('[FacultyDataContext] Memory cache expired for:', userEmail)
    }
    
    // Try session storage
    if (trySessionStorage()) {
      return
    }
    
    // No valid cache, fetch from API
    const fetchFacultyData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('[FacultyDataContext] Fetching faculty data for:', userEmail)
        const startTime = performance.now()
        
        const response = await fetch(`/api/faculty?type=${encodeURIComponent(userEmail)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store' // Don't use HTTP cache
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        const endTime = performance.now()
        const now = Date.now()
        
        console.log(`[FacultyDataContext] Faculty data fetched in ${endTime - startTime}ms`)
        console.log('[FacultyDataContext] API response data structure:', Object.keys(data))
        console.log('[FacultyDataContext] Profile data:', data.profile)
        console.log('[FacultyDataContext] Sample data sections:')
        console.log('  - about_me:', data.about_me?.length || 0, 'items')
        console.log('  - work_experience:', data.work_experience?.length || 0, 'items')
        console.log('  - education:', data.education?.length || 0, 'items')
        console.log('  - phd_candidates:', data.phd_candidates?.length || 0, 'items')
        console.log('  - institute_activities:', data.institute_activities?.length || 0, 'items')
        
        // Cache the data in memory
        facultyDataCache.set(userEmail, { data, timestamp: now })
        
        // Cache in session storage
        if (typeof window !== 'undefined') {
          try {
            const storageKey = `faculty_data_${userEmail}`
            sessionStorage.setItem(storageKey, JSON.stringify({ data, timestamp: now }))
          } catch (err) {
            console.error('[FacultyDataContext] Error storing in session storage:', err)
          }
        }
        
        setFacultyData(data)
        setLastFetchTime(now)
        
        // Setup auto-refresh
        setupAutoRefresh(userEmail)
        
      } catch (err) {
        console.error('[FacultyDataContext] Error fetching faculty data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchFacultyData()
  }, [session?.user?.email])

  // Function to refresh faculty data (force reload)
  const refreshFacultyData = async () => {
    if (!session?.user?.email) return
    
    const userEmail = session.user.email
    // Clear caches
    facultyDataCache.delete(userEmail)
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      try {
        const storageKey = `faculty_data_${userEmail}`
        sessionStorage.removeItem(storageKey)
      } catch (err) {
        console.error('[FacultyDataContext] Error clearing session storage:', err)
      }
    }
    
    // Refetch data
    setLoading(true)
    try {
      console.log('[FacultyDataContext] Force refreshing faculty data for:', userEmail)
      const response = await fetch(`/api/faculty?type=${encodeURIComponent(userEmail)}`, {
        cache: 'no-store', // Don't use HTTP cache
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
      const now = Date.now()
      
      console.log('[FacultyDataContext] Refreshed data structure:', Object.keys(data))
      console.log('[FacultyDataContext] Refreshed profile data:', data.profile)
      console.log('[FacultyDataContext] Refreshed sample sections:')
      console.log('  - about_me:', data.about_me?.length || 0, 'items')
      console.log('  - work_experience:', data.work_experience?.length || 0, 'items')
      console.log('  - education:', data.education?.length || 0, 'items')
      
      // Update both caches
      facultyDataCache.set(userEmail, { data, timestamp: now })
      
      if (typeof window !== 'undefined') {
        try {
          const storageKey = `faculty_data_${userEmail}`
          sessionStorage.setItem(storageKey, JSON.stringify({ data, timestamp: now }))
        } catch (err) {
          console.error('[FacultyDataContext] Error storing in session storage:', err)
        }
      }
      
      setFacultyData(data)
      setLastFetchTime(now)
      
      // Setup auto-refresh
      setupAutoRefresh(userEmail)
      
    } catch (err) {
      setError(err.message)
      console.error('[FacultyDataContext] Error refreshing faculty data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Function to update specific data section
  const updateFacultySection = (sectionName, newData) => {
    if (!facultyData) return
    
    const updatedData = {
      ...facultyData,
      [sectionName]: newData
    }
    
    setFacultyData(updatedData)
    
    // Update caches
    if (session?.user?.email) {
      const now = Date.now()
      facultyDataCache.set(session.user.email, { data: updatedData, timestamp: now })
      
      if (typeof window !== 'undefined') {
        try {
          const storageKey = `faculty_data_${session.user.email}`
          sessionStorage.setItem(storageKey, JSON.stringify({ data: updatedData, timestamp: now }))
        } catch (err) {
          console.error('[FacultyDataContext] Error updating session storage:', err)
        }
      }
    }
  }

  const getBasicInfo = () => {
    const info = facultyData?.profile || {}
    console.log('[FacultyDataContext] getBasicInfo called, returning:', info)
    return info
  }

  const value = {
    facultyData,
    loading,
    error,
    lastFetchTime,
    refreshFacultyData,
    updateFacultySection,
    
    // Helper functions for easier access
    getBasicInfo,
    getEducation: () => {
      const education = facultyData?.education || []
      console.log('[FacultyDataContext] getEducation called, returning:', education)
      return education
    },
    getExperience: () => {
      const experience = facultyData?.work_experience || []
      console.log('[FacultyDataContext] getExperience called, returning:', experience)
      return experience
    },
    getJournalPapers: () => facultyData?.journal_papers || [],
    getConferencePapers: () => facultyData?.conference_papers || [],
    getBookChapters: () => facultyData?.book_chapters || [],
    getEditedBooks: () => facultyData?.edited_books || [],
    getPatents: () => facultyData?.patents || [],
    getProjects: () => facultyData?.projects || [],
    getSponsoredProjects: () => facultyData?.sponsored_projects || [],
    getConsultancyProjects: () => facultyData?.consultancy_projects || [],
    getProjectSupervision: () => facultyData?.project_supervision || [],
    getPhdCandidates: () => facultyData?.phd_candidates || [],
    getInternships: () => facultyData?.internships || [],
    getMemberships: () => facultyData?.memberships || [],
    getIpr: () => facultyData?.ipr || [],
    getDepartmentActivities: () => facultyData?.department_activities || [],
    getInstituteActivities: () => facultyData?.institute_activities || [],
    getConferenceSessionChairs: () => facultyData?.conference_session_chairs || [],
    getJournalReviewers: () => facultyData?.international_journal_reviewers || [],
    getTalksAndLectures: () => facultyData?.talks_and_lectures || []
  }

  return (
    <FacultyDataContext.Provider value={value}>
      {children}
    </FacultyDataContext.Provider>
  )
}

export function useFacultyData() {
  const context = useContext(FacultyDataContext)
  if (context === undefined) {
    throw new Error('useFacultyData must be used within a FacultyDataProvider')
  }
  console.log('[FacultyDataContext] useFacultyData hook called, context available:', !!context)
  return context
}

// Hook for specific data sections
export function useFacultySection(sectionName) {
  const { facultyData, loading, error } = useFacultyData()
  
  return {
    data: facultyData?.[sectionName] || [],
    loading,
    error
  }
}
