import { 
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  InputLabel,
  Typography
} from '@mui/material'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import useRefreshData from '@/custom-hooks/refresh'
import { useFacultyData } from '@/context/FacultyDataContext'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

// Add formatDate helper function at the top
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (error) {
        console.error('Date parsing error:', error);
        return '';
    }
};

// Add Form Component
export const AddForm = ({ handleClose, modal }) => {
    const { data: session } = useSession()
    const { updateFacultySection } = useFacultyData()
    const initialState = {
        semester: '',
        level: '',
        course_number: '',
        course_title: '',
        course_type: '',
        student_count: '',
        lectures: '',
        tutorials: '',
        practicals: '',
        total_theory: '',
        lab_hours: '',
        years_offered: ''
    }
    const [content, setContent] = useState(initialState)
    const refreshData = useRefreshData(false)
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (e) => {
        setContent({ ...content, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        setSubmitting(true)
        e.preventDefault()

        try {
            const result = await fetch('/api/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'teaching_engagement',
                  ...content,
                  // Format start_date and end_date to 'YYYY-MM-DD' for DATE or 'YYYY-MM-DD HH:MM:SS' for DATETIME
                  start_date: content.start_date
                    ? new Date(content.start_date).toISOString().split('T')[0]  // Format as 'YYYY-MM-DD'
                    : null,
                  end_date: content.end_date
                    ? new Date(content.end_date).toISOString().split('T')[0]  // Format as 'YYYY-MM-DD'
                    : null,
                  id: Date.now().toString(),
                  email: session?.user?.email,
                }),
              });
              

            if (!result.ok) throw new Error('Failed to create')
            
            const updatedData = await result.json();
                
            // Update the context data
            updateFacultySection(11, updatedData.data);
            
            // Update the component's state via the window reference
            if (window.getTeachingEngagementComponent) {
                window.getTeachingEngagementComponent().updateData(updatedData.data);
            }
            
            handleClose()
            setContent(initialState)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={modal} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Add Teaching Engagement</DialogTitle>
                <DialogContent>
                <TextField
    margin="dense"
    label="Semester"
    name="semester"
    select
    fullWidth
    required
    value={content.semester}
    onChange={handleChange}
>
    {[...Array(10).keys()].map((num) => (
        <MenuItem key={num + 1} value={num + 1}>
            {num + 1}
        </MenuItem>
    ))}
</TextField>


                    <InputLabel id="level">Level</InputLabel>
                    <Select
                        labelId="level"
                        name="level"
                        value={content.level}
                        onChange={handleChange}
                        fullWidth
                        required
                    >
                        <MenuItem value="UG">UG</MenuItem>
                        <MenuItem value="PG">PG</MenuItem>
                        <MenuItem value="PhD">PhD</MenuItem>
                        <MenuItem value="MCA">MCA</MenuItem>
                        <MenuItem value="DD">DD</MenuItem>
                        <MenuItem value="M.Plan">M.Plan</MenuItem>
                        <MenuItem value="Research Associate">Research Associate</MenuItem>
                    </Select>
                    <TextField
                        margin="dense"
                        label="Course Number"
                        name="course_number"
                        fullWidth
                        required
                        value={content.course_number}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Course Title"
                        name="course_title"
                        fullWidth
                        required
                        value={content.course_title}
                        onChange={handleChange}
                    />
                    <InputLabel id="course-type">Course Type</InputLabel>
                    <Select
                        labelId="course-type"
                        name="course_type"
                        value={content.course_type}
                        onChange={handleChange}
                        fullWidth
                        required
                    >
                        <MenuItem value="Core">Core</MenuItem>
                        <MenuItem value="Elective">Elective</MenuItem>
                        <MenuItem value="Lab">Lab</MenuItem>
                    </Select>
                    <TextField
                        margin="dense"
                        label="Student Count"
                        name="student_count"
                        type="number"
                        fullWidth
                        required
                        value={content.student_count}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Lectures"
                        name="lectures"
                        type="number"
                        fullWidth
                        required
                        value={content.lectures}
                        onChange={handleChange}
                        helperText="Lecture per week according to the curriculum."
                    />

                    <TextField
                        margin="dense"
                        label="Tutorials"
                        name="tutorials"
                        type="number"
                        fullWidth
                        required
                        value={content.tutorials}
                        onChange={handleChange}
                        helperText="Tutorial per week according to the curriculum."
                    />
                    <TextField
                        margin="dense"
                        label="Practicals"
                        name="practicals"
                        type="number"
                        fullWidth
                        required
                        value={content.practicals}
                        onChange={handleChange}
                        helperText="Practical per week according to the curriculum."
                    />
                    <TextField
                        margin="dense"
                        label="Total Theory Hours"
                        name="total_theory"
                        type="number"
                        fullWidth
                        required
                        value={content.total_theory}
                        onChange={handleChange}
                        helperText="Total theory classes held in a semester."
                    />
                    <TextField
                        margin="dense"
                        label="Total Lab Hours"
                        name="lab_hours"
                        type="number"
                        fullWidth
                        required
                        value={content.lab_hours}
                        onChange={handleChange}
                        helperText="Total lab hours held in a semester."
                    />
                    <TextField
                        margin="dense"
                        label="Years Offered"
                        name="years_offered"
                        fullWidth
                        required
                        value={content.years_offered}
                        onChange={handleChange}
                        helperText="e.g., 2024 *strictly in the format YYYY otherwise no computation will be done"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        type="submit"
                        color="primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}

// Edit Form Component
export const EditForm = ({ handleClose, modal, values }) => {
    const { data: session } = useSession()
    const { updateFacultySection } = useFacultyData()
    // Parse dates when initializing content
    const [content, setContent] = useState({
        ...values,
        start_date: values.start_date ? new Date(values.start_date) : null,
        end_date: values.end_date ? new Date(values.end_date) : null
    })
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (e) => {
        setContent({ ...content, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const result = await fetch('/api/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'teaching_engagement',
                    ...content,
                    // Format dates before sending to API
                    start_date: content.start_date 
                        ? new Date(content.start_date).toISOString().split('T')[0]
                        : null,
                    end_date: content.end_date
                        ? new Date(content.end_date).toISOString().split('T')[0]
                        : null,
                    email: session?.user?.email
                }),
            })

            if (!result.ok) throw new Error('Failed to update')
            
            const updatedData = await result.json();
                
            // Update the context data
            updateFacultySection(11, updatedData.data);
            
            // Update the component's state via the window reference
            if (window.getTeachingEngagementComponent) {
                window.getTeachingEngagementComponent().updateData(updatedData.data);
            }
            
            handleClose()
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={modal} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Edit Teaching Engagement</DialogTitle>
                <DialogContent>
                <TextField
    margin="dense"
    label="Semester"
    name="semester"
    select
    fullWidth
    required
    value={content.semester}
    onChange={handleChange}
>
    {[...Array(10).keys()].map((num) => (
        <MenuItem key={num + 1} value={num + 1}>
            {num + 1}
        </MenuItem>
    ))}
</TextField>

                    <TextField
                        margin="dense"
                        label="Level"
                        name="level"
                        select
                        fullWidth
                        required
                        value={content.level}
                        onChange={handleChange}
                    >
                        <MenuItem value="UG">UG</MenuItem>
                        <MenuItem value="PG">PG</MenuItem>
                        <MenuItem value="MCA">MCA</MenuItem>
                        <MenuItem value="DD">DD</MenuItem>
                        <MenuItem value="PhD">PhD</MenuItem>
                        <MenuItem value="B.Plan">B.Plan</MenuItem>
                        <MenuItem value="M.Plan">M.Plan</MenuItem>
                        <MenuItem value="Research Associate">Research Associate</MenuItem>
                    </TextField>
                    <TextField
                        margin="dense"
                        label="Course Number"
                        name="course_number"
                        fullWidth
                        required
                        value={content.course_number}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Course Title"
                        name="course_title"
                        fullWidth
                        required
                        value={content.course_title}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Course Type"
                        name="course_type"
                        select
                        fullWidth
                        required
                        value={content.course_type}
                        onChange={handleChange}
                    >
                        <MenuItem value="Theory">Theory</MenuItem>
                        <MenuItem value="Lab">Lab</MenuItem>
                        <MenuItem value="Both">Both</MenuItem>
                    </TextField>
                    <TextField
                        margin="dense"
                        label="Student Count"
                        name="student_count"
                        type="number"
                        fullWidth
                        required
                        value={content.student_count}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Lectures"
                        name="lectures"
                        type="number"
                        fullWidth
                        required
                        value={content.lectures}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Tutorials"
                        name="tutorials"
                        type="number"
                        fullWidth
                        required
                        value={content.tutorials}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Practicals"
                        name="practicals"
                        type="number"
                        fullWidth
                        required
                        value={content.practicals}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Total Theory"
                        name="total_theory"
                        type="number"
                        fullWidth
                        required
                        value={content.total_theory}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Lab Hours"
                        name="lab_hours"
                        type="number"
                        fullWidth
                        required
                        value={content.lab_hours}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Year Offered"
                        name="years_offered"
                        fullWidth
                        required
                        value={content.years_offered}
                        onChange={handleChange}
                        helperText="e.g., 2024 *strictly in the format YYYY otherwise no computation will be done"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        type="submit"
                        color="primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}

// Main Component
export default function TeachingEngagementManagement() {
    const { data: session } = useSession()
    const { facultyData, updateFacultySection } = useFacultyData();
    const [courses, setCourses] = useState([])
    const [openAdd, setOpenAdd] = useState(false)
    const [openEdit, setOpenEdit] = useState(false)
    const [selectedCourse, setSelectedCourse] = useState(null)
    const [loading, setLoading] = useState(true)
    
    // Add window reference to this component
    React.useEffect(() => {
        // Expose the component instance to the window
        window.getTeachingEngagementComponent = () => ({
            updateData: (newData) => {
                setCourses(newData);
            }
        });
        
        // Cleanup
        return () => {
            delete window.getTeachingEngagementComponent;
        };
    }, []);

    // Fetch data
    React.useEffect(() => {
        const fetchCourses = async () => {
            try {
                if (facultyData && facultyData.teaching_engagement) {
                    const response = await fetch(`/api/faculty?type=${session?.user?.email}`)
                    if (!response.ok) throw new Error('Failed to fetch')
                    const data = await response.json()
                    setCourses(data.teaching_engagement || [])
                } else {
                    const response = await fetch(`/api/faculty?type=${session?.user?.email}`)
                    if (!response.ok) throw new Error('Failed to fetch')
                    const data = await response.json()
                    setCourses(data.teaching_engagement || [])
                }
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }

        if (session?.user?.email) {
            fetchCourses()
        }
    }, [session, facultyData])

    const handleEdit = (course) => {
        setSelectedCourse(course)
        setOpenEdit(true)
    }

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this course?')) {
            try {
                const response = await fetch('/api/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'teaching_engagement',
                        id,
                        email: session?.user?.email
                    }),
                })
                
                if (!response.ok) throw new Error('Failed to delete')
                
                const updatedData = await response.json();

                const updatedTeachingData = courses.filter((c)=>c.id !== id)
                
                // Update the context data
                updateFacultySection('teaching_engagement', updatedTeachingData);
                
                // Update the local state
                setCourses(updatedTeachingData);
            } catch (error) {
                console.error('Error:', error)
            }
        }
    }

    if (loading) return <div>Loading...</div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                <Typography variant="h6">Teaching Engagement</Typography>
                <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={() => setOpenAdd(true)}
                    style={{ backgroundColor: '#830001', color: 'white' }}
                >
                    Add Course
                </Button>
            </div>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Course</TableCell>
                            <TableCell>Level</TableCell>
                            <TableCell>Semester</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Students</TableCell>
                            <TableCell>Hours</TableCell>
                            <TableCell>Years</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {courses?.sort((a,b)=>b.years_offered - a.years_offered)?.map((course) => (
                            <TableRow key={course.id}>
                                <TableCell>
                                    {course.course_number} - {course.course_title}
                                </TableCell>
                                <TableCell>{course.level}</TableCell>
                                <TableCell>{course.semester}</TableCell>
                                <TableCell>{course.course_type}</TableCell>
                                <TableCell>{course.student_count}</TableCell>
                                <TableCell>
                                    T: {course.total_theory} | L: {course.lab_hours}
                                </TableCell>
                                <TableCell>{course.years_offered}</TableCell>
                                <TableCell align="right">
                                    <IconButton 
                                        onClick={() => handleEdit(course)}
                                        color="primary"
                                        size="small"
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton 
                                        onClick={() => handleDelete(course.id)}
                                        color="error"
                                        size="small"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {courses?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No courses found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <AddForm 
                modal={openAdd}
                handleClose={() => setOpenAdd(false)}
            />

            {selectedCourse && (
                <EditForm
                    modal={openEdit}
                    handleClose={() => {
                        setOpenEdit(false)
                        setSelectedCourse(null)
                    }}
                    values={selectedCourse}
                />
            )}
        </div>
    )
}