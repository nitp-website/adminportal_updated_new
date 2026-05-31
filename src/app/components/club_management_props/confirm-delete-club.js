"use client";

import React, { useState } from "react";
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Grid, Typography } from "@mui/material";
import { Business, Delete, Email, Group, Person, Warning } from "@mui/icons-material";

export function ConfirmDeleteClub({ open, onClose, club, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      if (onConfirm) {
        await onConfirm(club);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!club) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="delete-club-dialog-title"
      aria-describedby="delete-club-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        id="delete-club-dialog-title"
        sx={{
          backgroundColor: "#d32f2f",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 1,
          position: "sticky",
          top: 0,
          zIndex: 1300,
        }}
      >
        <Warning />
        Confirm Delete Club
      </DialogTitle>
      <DialogContent
        sx={{
          mt: 2,
          maxHeight: "60vh",
          overflowY: "auto",
          "&::-webkit-scrollbar": {
            display: "none",
          },
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <Alert severity="error" sx={{ mb: 3 }}>
          This action cannot be undone. The selected club will be removed from
          the management list.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            sx={{ mb: 2, fontWeight: 600, color: "#d32f2f" }}
          >
            Club to be deleted:
          </Typography>

          <Box
            sx={{
              p: 3,
              backgroundColor: "#f8f9fa",
              borderRadius: 2,
              border: "2px solid #ffebee",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "#830001",
                  fontSize: "1.5rem",
                }}
              >
                {club.club_name ? (
                  club.club_name.charAt(0).toUpperCase()
                ) : (
                  <Group />
                )}
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#333" }}
                >
                  {club.club_name || "Unknown Club"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {club.category || "No category specified"}
                </Typography>
                <Chip
                  label={club.status || "Active"}
                  color={club.status === "Inactive" ? "default" : "success"}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Email fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, ml: 3 }}>
                  {club.club_email || "No email provided"}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Business fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Club PI
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, ml: 3 }}>
                  {club.patnaPiName || club.patna_pi_name || "No PI specified"}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    President
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, ml: 3 }}>
                  {club.club_president || "No president specified"}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Group fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Secretary
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, ml: 3 }}>
                  {club.club_secretary || "No secretary specified"}
                </Typography>
              </Grid>
            </Grid>

            {club.description && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: "#fff3e0",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  <strong>Description:</strong> {club.description}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <DialogContentText id="delete-club-dialog-description" sx={{ mt: 2 }}>
          <strong>Are you absolutely sure?</strong> This will permanently remove
          this club entry.
        </DialogContentText>

        <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip label="Club Information" color="warning" size="small" />
          <Chip label="Coordinator Details" color="warning" size="small" />
          <Chip label="Contact Details" color="warning" size="small" />
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
            color: "#666",
            borderColor: "#ddd",
            "&:hover": {
              backgroundColor: "#f5f5f5",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmDelete}
          variant="contained"
          color="error"
          autoFocus
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Delete />
            )
          }
          sx={{
            minWidth: 140,
            "&:hover": {
              backgroundColor: "#b71c1c",
            },
          }}
        >
          {loading ? "Deleting..." : "Delete Club"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
