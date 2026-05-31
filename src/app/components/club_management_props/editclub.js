"use client";

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Grid, Typography, Divider, IconButton } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useEffect, useState } from "react";

const clubCategories = [ "Technical", "Cultural", "Sports", "Literary", "Social", "Innovation", "Academic" ];

export function EditClub({ open, club, onClose, onSuccess, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    club_name: "",
    club_email: "",
    category: "",
    club_pi: "",
    club_president: "",
    club_secretary: "",
    status: "Active",
    description: "",
  });

  useEffect(() => {
    if (club) {
      setFormData({
        id: club.id || "",
        club_name: club.club_name || "",
        club_email: club.club_email || "",
        category: club.category || "",
        club_pi: club.club_pi || "",
        club_president: club.club_president || "",
        club_secretary: club.club_secretary || "",
        status: club.status || "Active",
        description: club.description || "",
      });
    }
  }, [club]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (onSuccess) {
        await onSuccess(formData);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!club) {
    return null;
  }

  return (
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
          Edit Club
          {onDelete && (
            <IconButton
              onClick={() => onDelete(club)}
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
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: "#333", fontWeight: 500 }}
            >
              Club Information
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Club Name"
                  required
                  value={formData.club_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      club_name: e.target.value,
                    }))
                  }
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Club Email"
                  type="email"
                  required
                  value={formData.club_email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      club_email: e.target.value,
                    }))
                  }
                  variant="outlined"
                  disabled
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
                  label="Category"
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  variant="outlined"
                >
                  {clubCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  required
                  label="Status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  variant="outlined"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </div>

          <Divider sx={{ my: 3 }} />

          <div>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: "#333", fontWeight: 500 }}
            >
              Coordinator Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Club PI"
                  value={formData.club_pi}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      club_pi: e.target.value,
                    }))
                  }
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Club President"
                  value={formData.club_president}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      club_president: e.target.value,
                    }))
                  }
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Club Secretary"
                  value={formData.club_secretary}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      club_secretary: e.target.value,
                    }))
                  }
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </div>
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
  );
}
