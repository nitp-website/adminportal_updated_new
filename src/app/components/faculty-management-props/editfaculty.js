"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Divider,
  Box,
  IconButton,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { depList, officerDesignations } from "@/lib/const";
import { ROLES } from "@/lib/roles";
import Toast from "../common/Toast";

export function EditFaculty({ open, faculty, onClose, onSuccess, onDelete }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    message: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    role: "",
    ext_no: "",
    research_interest: "",
    academic_responsibility: "",
    is_retired: "0",
    retirement_date: null,
  });
  const [dynamicDesignations, setDynamicDesignations] =
    useState(officerDesignations);

  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const response = await fetch("/api/designation-priority");
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const orderedDesignations = data
              .sort((a, b) => a.priority_order - b.priority_order)
              .map((item) => item.designation);
            setDynamicDesignations(orderedDesignations);
          }
        }
      } catch (error) {
        console.error("Error fetching designation priorities:", error);
       
      }
    };

    fetchDesignations();
  }, []);

  useEffect(() => {
    if (faculty?.profile) {
      setFormData({
        name: faculty.profile.name || "",
        email: faculty.profile.email || "",
        department: faculty.profile.department || "",
        designation: faculty.profile.designation || "",
        role: faculty.profile.role || "",
        ext_no: faculty.profile.ext_no || "",
        research_interest: faculty.profile.research_interest || "",
        academic_responsibility: faculty.profile.academic_responsibility || "",
        is_retired: faculty.profile.is_retired ? "1" : "0",
        retirement_date: faculty.profile.retirement_date || null,
      });
    }
  }, [faculty]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formattedData = {
        ...formData,
        retirement_date:
          formData.is_retired === "0" ? null : formData.retirement_date,
      };

      const response = await fetch("/api/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user",
          ...formattedData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const result = await response.json();

      setToast({
        open: true,
        severity: "success",
        message: "Faculty updated successfully",
      });

      if (onSuccess) {
        onSuccess(formattedData);
      }
    } catch (error) {
      console.error("Update error:", error);
      setToast({
        open: true,
        severity: "error",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseToast = (event, reason) => {
    if (reason === "clickaway") return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle
            sx={{
              backgroundColor: "#830001",
              color: "white",
              fontWeight: 600,
              fontSize: "1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              top: 0,
              zIndex: 1300,
            }}
          >
            Edit Faculty
            {onDelete && (
              <IconButton
                onClick={() => onDelete(faculty)}
                sx={{
                  color: "white",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <Delete />
              </IconButton>
            )}
          </DialogTitle>
          <DialogContent
            sx={{
              mt: 2,
              maxHeight: "70vh",
              overflowY: "auto",
              "&::-webkit-scrollbar": {
                display: "none",
              },
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE and Edge
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ mb: 2, color: "#333", fontWeight: 500 }}
              >
                Faculty Information
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    required
                    value={formData.email}
                    disabled
                    variant="outlined"
                    sx={{
                      "& .MuiInputBase-input.Mui-disabled": {
                        WebkitTextFillColor: "#666",
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Department"
                    required
                    value={formData.department}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    variant="outlined"
                  >
                    {[...depList].map(([key, value]) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                    <MenuItem value="developer">Developer</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  {formData.department === 'Officers' ? (
                    <TextField
                      fullWidth
                      select
                      label="Designation"
                      required
                      value={formData.designation}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          designation: e.target.value,
                        }))
                      }
                      variant="outlined"
                    >
                      {dynamicDesignations.map((designation) => (
                        <MenuItem key={designation} value={designation}>
                          {designation}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      fullWidth
                      label="Designation"
                      value={formData.designation || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          designation: e.target.value,
                        }))
                      }
                      variant="outlined"
                    />
                  )}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Extension Number"
                    value={formData.ext_no || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ext_no: e.target.value,
                      }))
                    }
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Role"
                    required
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    variant="outlined"
                  >
                    {Object.entries(ROLES).map(([key, value]) => (
                      <MenuItem key={key} value={value}>
                        {key}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Research Interest"
                    multiline
                    rows={3}
                    value={formData.research_interest || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        research_interest: e.target.value,
                      }))
                    }
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Academic Responsibility"
                    value={formData.academic_responsibility || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        academic_responsibility: e.target.value,
                      }))
                    }
                    variant="outlined"
                    placeholder="Enter academic responsibility (e.g., Dean - Academic, Student Welfare Dean, Head of Department - CSE, etc.)"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Typography
                variant="h6"
                sx={{ mb: 2, color: "#333", fontWeight: 500 }}
              >
                Employment Status
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    required
                    label="Is Retired"
                    value={formData.is_retired}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_retired: e.target.value,
                      }))
                    }
                    variant="outlined"
                  >
                    <MenuItem value="0">Active</MenuItem>
                    <MenuItem value="1">Retired</MenuItem>
                  </TextField>
                </Grid>
                {formData.is_retired === "1" && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Retirement Date"
                      value={formData.retirement_date || "2025-02-27"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          retirement_date: e.target.value,
                        }))
                      }
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              p: 3,
              backgroundColor: "#f8f9fa",
              position: "sticky",
              bottom: 0,
              zIndex: 1300,
            }}
          >
            <Button
              onClick={onClose}
              variant="outlined"
              sx={{
                color: "#830001",
                borderColor: "#830001",
                "&:hover": {
                  backgroundColor: "#830001",
                  color: "white",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                backgroundColor: "#830001",
                color: "white",
                minWidth: 120,
                "&:hover": {
                  backgroundColor: "#6a0001",
                },
              }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Toast
        open={toast.open}
        handleClose={handleCloseToast}
        severity={toast.severity}
        message={toast.message}
      />
    </>
  );
}
