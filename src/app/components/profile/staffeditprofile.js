import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  Box,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Divider,
  IconButton,
} from "@mui/material";

import { Add, Delete } from "@mui/icons-material";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { useStaffData } from "../../../context/StaffDataContext";
import { StaffdepList, getDeptFullName } from "@/lib/const";

const safeParse = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// backend stores dates as full datetimes sometimes - normalize to YYYY-MM-DD for <input type="date">
const toDateInput = (value) => (value ? value.toString().split("T")[0] : "");

const SEMESTERS = Array.from({ length: 10 }, (_, i) => String(i + 1));

// batch year range dropdown - e.g. 2020, 2021 ... up to current+10
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: 20 }, (_, i) => String(CURRENT_YEAR - 8 + i));


const PASSING_YEARS = Array.from(
  { length: CURRENT_YEAR - 1960 + 1 },
  (_, i) => String(CURRENT_YEAR - i),
);

const LEVELS = ["UG", "PG", "PhD"]

const parseBatch = (batchStr) => {
  const [start, end] = (batchStr || "").split("-").map((v) => v?.trim());
  return { start: start || "", end: end || "" };
};
export const EditProfile = ({
  handleClose,
  modal,
  currentProfile,
  onUpdate,
}) => {
  const { data: session } = useSession();
  const { updateStaffSection } = useStaffData();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const buildFormData = (profile) => ({
    // user table
    name: profile?.name || "",
    email: profile?.email || "",
    mobile_number : profile?.mobile_number || "",
    gender: profile?.gender || "",
    category: profile?.category || "",
    research_interest: profile?.research_interest || "",

    // staff table
    employee_code: profile?.employee_code || "",
    date_of_joining: toDateInput(profile?.date_of_joining),
    date_of_birth: toDateInput(profile?.date_of_birth),
    cadre: profile?.cadre || "",
    department: profile?.department || "",
    designation: profile?.designation || "",
    pay_level : profile?.pay_level || "",

    permanent_address: safeParse(profile?.permanent_address, {
      place: "",
      district: "",
      state: "",
    }),
    current_address: safeParse(profile?.current_address, {
      place: "",
      district: "",
      state: "",
    }),

    // related tables (labs -> staff_id, education/work_experience -> email)
    labs: (safeParse(profile?.labs, []) || []).map((lab) => ({
      lab_name: lab?.lab_name || "",
      course_code : lab?.course_code || "",
      level : lab?.level || "",
      start_date: toDateInput(lab?.start_date),
      end_date: toDateInput(lab?.end_date),
      batch: lab?.batch || "",
      semester: lab?.semester != null ? String(lab.semester) : "",
      no_of_students: lab?.no_of_students ?? "",
    })),
    education: profile?.education || [],
    work_experience: (profile?.work_experience || []).map((we) => ({
      work_experiences: we?.work_experiences || "",
      institute: we?.institute || "",
      start_date: toDateInput(we?.start_date),
      end_date: toDateInput(we?.end_date),
    })),
  });

  const [formData, setFormData] = useState(buildFormData(currentProfile));

  useEffect(() => {
    if (!modal) return;
    setFormData(buildFormData(currentProfile));
    setError("");
  }, [modal, currentProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (type, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  // ---- Labs ----
  const addLab = () => {
    setFormData((prev) => ({
      ...prev,
      labs: [
        ...prev.labs,
        {
          lab_name: "",
          course_code : "",
          level : "",
          start_date: "",
          end_date: "",
          batch: "",
          semester: "",
          no_of_students: "",
        },
      ],
    }));
  };

  const updateLab = (index, field, value) => {
    setFormData((prev) => {
      const labs = [...prev.labs];
      labs[index] = { ...labs[index], [field]: value };
      return { ...prev, labs };
    });
  };

  const updateLabBatchYear = (index, part, value) => {
    setFormData((prev) => {
      const labs = [...prev.labs];
      const { start, end } = parseBatch(labs[index].batch);
      const newStart = part === "start" ? value : start;
      // if end year is no longer after the (possibly new) start year, clear it
      const newEnd =
        part === "end"
          ? value
          : end && Number(end) > Number(newStart)
            ? end
            : "";
      labs[index] = {
        ...labs[index],
        batch: newStart && newEnd ? `${newStart}-${newEnd}` : newStart,
      };
      return { ...prev, labs };
    });
  };

  const removeLab = (index) => {
    setFormData((prev) => ({
      ...prev,
      labs: prev.labs.filter((_, i) => i !== index),
    }));
  };

  // ---- Education ----
  const addEducation = () => {
    setFormData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          certification: "",
          institution: "",
          passing_year: "",
          specialization: "",
        },
      ],
    }));
  };

  const updateEducation = (index, field, value) => {
    setFormData((prev) => {
      const education = [...prev.education];
      education[index] = { ...education[index], [field]: value };
      return { ...prev, education };
    });
  };

  const removeEducation = (index) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // ---- Work Experience ----
  const addWorkExperience = () => {
    setFormData((prev) => ({
      ...prev,
      work_experience: [
        ...prev.work_experience,
        {
          work_experiences: "",
          institute: "",
          start_date: "",
          end_date: "",
        },
      ],
    }));
  };

  const updateWorkExperience = (index, field, value) => {
    setFormData((prev) => {
      const work_experience = [...prev.work_experience];
      work_experience[index] = { ...work_experience[index], [field]: value };
      return { ...prev, work_experience };
    });
  };

  const removeWorkExperience = (index) => {
    setFormData((prev) => ({
      ...prev,
      work_experience: prev.work_experience.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // /api/staff's PUT identifies the record by user_id
    const user_id = currentProfile?.user_id;

    if (!user_id) {
      setError("Missing user_id — cannot save. Check StaffDataContext.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/staff2", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          name: formData.name,
          mobile_number : formData.mobile_number,
          gender: formData.gender,
          category: formData.category,
          research_interest: formData.research_interest,

          employee_code: formData.employee_code,
          date_of_joining: formData.date_of_joining || null,
          date_of_birth: formData.date_of_birth || null,
          cadre: formData.cadre,
          department: formData.department,
          designation: formData.designation,
          pay_level: formData.pay_level,
          current_address: formData.current_address,
          permanent_address: formData.permanent_address,

          labs: formData.labs.map((lab) => ({
            ...lab,
            no_of_students: lab.no_of_students === "" ? null : lab.no_of_students,
          })),
          education: formData.education,
          work_experience: formData.work_experience,

          // backend does NOT coalesce image/cv - pass through existing
          // values so this save doesn't null out an uploaded photo/CV
          image: currentProfile?.image ?? null,
          cv: currentProfile?.cv ?? null,
        }),
      });

      if (!response.ok) {
        const rawText = await response.text();
        let errBody = {};
        try {
          errBody = JSON.parse(rawText);
        } catch {
          // response wasn't JSON — log it so we can see what actually came back
          console.error("Non-JSON error response from /api/staff2:", {
            status: response.status,
            statusText: response.statusText,
            rawText,
          });
        }
        throw new Error(
          errBody.message ||
            `Failed to update profile (status ${response.status}: ${
              rawText?.slice(0, 200) || "empty body"
            })`,
        );
      }

      await response.json();

      updateStaffSection("profile", { ...currentProfile, ...formData });

      if (onUpdate) {
        onUpdate(formData);
      }

      handleClose();
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const states = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Puducherry",
    "Chandigarh",
    "Andaman and Nicobar Islands",
    "Lakshadweep",
  ];

  return (
    <Dialog open={modal} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Profile Details</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="h6" sx={{ mb: 2, mt: 1 }}>
            Basic Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mobile Number"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                inputProps={{ maxLength: 10, inputMode: "numeric" }}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Employee Code"
                name="employee_code"
                value={formData.employee_code}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
              {[...StaffdepList].map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Designation"
                name="designation"
                value={formData.designation}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cadre"
                name="cadre"
                value={formData.cadre}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pay Level"
                name="pay_level"
                value={formData.pay_level || "Not specified"}
                disabled
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Expertise"
                name="research_interest"
                value={formData.research_interest}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <MenuItem value="GEN">General</MenuItem>
                <MenuItem value="OBC">OBC</MenuItem>
                <MenuItem value="SC">SC</MenuItem>
                <MenuItem value="ST">ST</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <MenuItem value="MALE">Male</MenuItem>
                <MenuItem value="FEMALE">Female</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Joining"
                name="date_of_joining"
                value={formData.date_of_joining}
                disabled
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                InputLabelProps={{ shrink: true }}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />


          <Typography variant="h6" sx={{ mb: 2 }}>
            Education
          </Typography>

          {formData.education.map((edu, index) => (
            <Box
              key={index}
              sx={{ border: "1px solid #ddd", borderRadius: 2, p: 2, mb: 2 }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Degree"
                    value={edu.certification}
                    onChange={(e) =>
                      updateEducation(index, "certification", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Institution"
                    value={edu.institution}
                    onChange={(e) =>
                      updateEducation(index, "institution", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Specialization"
                    value={edu.specialization}
                    onChange={(e) =>
                      updateEducation(index, "specialization", e.target.value)
                    }
                  />
                </Grid>
                 <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Passing Year"
                    value={edu.passing_year}
                    onChange={(e) =>
                      updateEducation(index, "passing_year", e.target.value)
                    }
                  >
                    {PASSING_YEARS.map((yr) => (
                      <MenuItem key={yr} value={yr}>
                        {yr}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid
                  item
                  xs={12}
                  md={1}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  <IconButton
                    color="error"
                    onClick={() => removeEducation(index)}
                  >
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button variant="outlined" startIcon={<Add />} onClick={addEducation}>
            Add Education
          </Button>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Work Experience
          </Typography>

          {formData.work_experience.map((we, index) => (
            <Box
              key={index}
              sx={{ border: "1px solid #ddd", borderRadius: 2, p: 2, mb: 2 }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Role / Description"
                    value={we.work_experiences}
                    onChange={(e) =>
                      updateWorkExperience(
                        index,
                        "work_experiences",
                        e.target.value,
                      )
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Institute"
                    value={we.institute}
                    onChange={(e) =>
                      updateWorkExperience(index, "institute", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    value={we.start_date}
                    onChange={(e) =>
                      updateWorkExperience(
                        index,
                        "start_date",
                        e.target.value,
                      )
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label="End Date"
                    value={we.end_date}
                    onChange={(e) =>
                      updateWorkExperience(index, "end_date", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  display="flex"
                  justifyContent="flex-end"
                  alignItems="center"
                >
                  <IconButton
                    color="error"
                    onClick={() => removeWorkExperience(index)}
                  >
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={addWorkExperience}
          >
            Add Work Experience
          </Button>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Labs
          </Typography>

          {formData.labs.map((lab, index) => (
            <Box
              key={index}
              sx={{ border: "1px solid #ddd", borderRadius: 2, p: 2, mb: 2 }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Lab Name"
                    value={lab.lab_name}
                    onChange={(e) =>
                      updateLab(index, "lab_name", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Course Code"
                    value={lab.course_code}
                    onChange={(e) =>
                      updateLab(index, "course_code", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Level"
                    value={lab.level}
                    onChange={(e) => updateLab(index, "level", e.target.value)}
                  >
                    {LEVELS.map((lvl) => (
                      <MenuItem key={lvl} value={lvl}>
                        {lvl}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Semester"
                    value={lab.semester}
                    onChange={(e) =>
                      updateLab(index, "semester", e.target.value)
                    }
                  >
                    {SEMESTERS.map((sem) => (
                      <MenuItem key={sem} value={sem}>
                        {sem}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Batch Start"
                    value={parseBatch(lab.batch).start}
                    onChange={(e) =>
                      updateLabBatchYear(index, "start", e.target.value)
                    }
                  >
                    {BATCH_YEARS.map((yr) => (
                      <MenuItem key={yr} value={yr}>
                        {yr}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Batch End"
                    value={parseBatch(lab.batch).end}
                    disabled={!parseBatch(lab.batch).start}
                    onChange={(e) =>
                      updateLabBatchYear(index, "end", e.target.value)
                    }
                  >
                    {BATCH_YEARS.filter(
                      (yr) => Number(yr) > Number(parseBatch(lab.batch).start || 0),
                    ).map((yr) => (
                      <MenuItem key={yr} value={yr}>
                        {yr}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="No. of Students"
                    value={lab.no_of_students}
                    onChange={(e) =>
                      updateLab(index, "no_of_students", e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    value={lab.start_date}
                    onChange={(e) =>
                      updateLab(index, "start_date", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="date"
                    label="End Date"
                    value={lab.end_date}
                    onChange={(e) =>
                      updateLab(index, "end_date", e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  md={8}
                  display="flex"
                  justifyContent="flex-end"
                  alignItems="center"
                >
                  <IconButton color="error" onClick={() => removeLab(index)}>
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button variant="outlined" startIcon={<Add />} onClick={addLab}>
            Add Lab
          </Button>

          <Divider sx={{ my: 4 }}/>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Current Address
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Place"
                value={formData.current_address.place}
                onChange={(e) =>
                  handleAddressChange(
                    "current_address",
                    "place",
                    e.target.value,
                  )
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="District"
                value={formData.current_address.district}
                onChange={(e) =>
                  handleAddressChange(
                    "current_address",
                    "district",
                    e.target.value,
                  )
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="State"
                value={formData.current_address.state}
                onChange={(e) =>
                  handleAddressChange(
                    "current_address",
                    "state",
                    e.target.value,
                  )
                }
              >
                {states.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Permanent Address
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Place"
                value={formData.permanent_address.place}
                onChange={(e) =>
                  handleAddressChange(
                    "permanent_address",
                    "place",
                    e.target.value,
                  )
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="District"
                value={formData.permanent_address.district}
                onChange={(e) =>
                  handleAddressChange(
                    "permanent_address",
                    "district",
                    e.target.value,
                  )
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="State"
                value={formData.permanent_address.state}
                onChange={(e) =>
                  handleAddressChange(
                    "permanent_address",
                    "state",
                    e.target.value,
                  )
                }
              >
                {states.map((state) => (
                  <MenuItem key={state} value={state}>
                    {state}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              backgroundColor: "#830001",
              "&:hover": { backgroundColor: "#650001" },
            }}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};