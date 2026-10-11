"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const AVAILABLE_PERMISSIONS = [
  {
    key: "admissions",
    label: "Admissions Notices",
    description: "Publish, edit, and delete admission notifications & announcements",
    color: "#1976d2",
  },
  {
    key: "job",
    label: "Recruitment (Job) Notices",
    description: "Publish, edit, and delete faculty/staff recruitment and vacancy notices",
    color: "#2e7d32",
  },
];

export default function PermissionTab({ showSnackbar }) {
  const [permissionsList, setPermissionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    permissions: [],
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    email: null,
  });

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/special-permissions");
      if (response.ok) {
        const data = await response.json();
        setPermissionsList(Array.isArray(data) ? data : []);
      } else {
        showSnackbar("Failed to fetch special permissions", "error");
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      showSnackbar("Error fetching permissions", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        email: item.email,
        permissions: Array.isArray(item.permissions) ? [...item.permissions] : [],
      });
    } else {
      setEditingItem(null);
      setFormData({
        email: "",
        permissions: ["admissions"], // default with 1 selected
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ email: "", permissions: [] });
  };

  const handleTogglePermission = (permKey) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permKey);
      const newPerms = exists
        ? prev.permissions.filter((p) => p !== permKey)
        : [...prev.permissions, permKey];
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanEmail) {
      showSnackbar("Faculty email is required", "error");
      return;
    }

    if (formData.permissions.length === 0) {
      showSnackbar("Please select at least one permission", "warning");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/special-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          permissions: formData.permissions,
        }),
      });

      if (response.ok) {
        showSnackbar(
          editingItem
            ? `Permissions updated for ${cleanEmail}`
            : `Permissions granted to ${cleanEmail}`,
          "success"
        );
        fetchPermissions();
        handleCloseDialog();
      } else {
        const err = await response.json();
        showSnackbar(err.error || "Failed to save permissions", "error");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      showSnackbar("Error saving permissions", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.email) return;

    try {
      const response = await fetch(
        `/api/special-permissions?email=${encodeURIComponent(deleteDialog.email)}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        showSnackbar(`Permissions revoked for ${deleteDialog.email}`, "success");
        fetchPermissions();
      } else {
        showSnackbar("Failed to revoke permissions", "error");
      }
    } catch (error) {
      console.error("Error deleting permission:", error);
      showSnackbar("Error deleting permission", "error");
    } finally {
      setDeleteDialog({ open: false, email: null });
    }
  };

  const filteredList = permissionsList.filter((item) =>
    item.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Faculty Notice Access Delegations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Delegate notice publishing rights (Admissions, Recruitment) to specific faculty members without altering their primary profile or role.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: "#830001",
            "&:hover": { backgroundColor: "#600001" },
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Add Faculty Permission
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>How it works:</strong> Faculty members added here will immediately see the <strong>"Notice"</strong> link in their dashboard header, enabling them to post and manage only their authorized notice categories.
      </Alert>

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Filter by faculty email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: "100%", sm: "320px" } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Permissions Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: "#f8f9fa" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: "#333" }}>Faculty Email</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#333" }}>Assigned Permissions</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#333" }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: "#333" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={32} sx={{ color: "#830001" }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading faculty permissions...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchQuery ? "No matching faculty found." : "No faculty delegations added yet."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((item) => (
                <TableRow
                  key={item.email}
                  sx={{
                    "&:hover": { backgroundColor: "#fafafa" },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <EmailIcon fontSize="small" sx={{ color: "#830001" }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.email}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {Array.isArray(item.permissions) &&
                        item.permissions.map((perm) => {
                          const config = AVAILABLE_PERMISSIONS.find((p) => p.key === perm);
                          return (
                            <Chip
                              key={perm}
                              label={config ? config.label : perm}
                              size="small"
                              sx={{
                                backgroundColor: config ? `${config.color}15` : "#e0e0e0",
                                color: config ? config.color : "#333",
                                border: `1px solid ${config ? config.color : "#ccc"}`,
                                fontWeight: 500,
                              }}
                            />
                          );
                        })}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      icon={<CheckCircleOutlineIcon />}
                      label="Active"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="Edit Permissions">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(item)}
                        sx={{ color: "#830001", mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Revoke Access">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, email: item.email })}
                        sx={{ color: "#d32f2f" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSave}>
          <DialogTitle
            sx={{
              backgroundColor: "#830001",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <VpnKeyIcon />
            {editingItem ? "Edit Faculty Permissions" : "Delegate Notice Permissions"}
          </DialogTitle>

          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Specify the faculty member's institutional email and select which notice sections they can manage.
            </Typography>

            <TextField
              fullWidth
              label="Faculty Email Address"
              placeholder="e.g. faculty.name@nitp.ac.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={Boolean(editingItem)}
              required
              sx={{ mb: 3 }}
              helperText={
                editingItem
                  ? "Email cannot be changed once created. Revoke and create new if needed."
                  : "Must match the Google account email used to sign in."
              }
            />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Select Allowed Notice Types:
            </Typography>

            <FormGroup sx={{ pl: 1 }}>
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const checked = formData.permissions.includes(perm.key);
                return (
                  <Box
                    key={perm.key}
                    onClick={() => handleTogglePermission(perm.key)}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      p: 1.5,
                      mb: 1,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: checked ? perm.color : "#e0e0e0",
                      backgroundColor: checked ? `${perm.color}08` : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        borderColor: perm.color,
                        backgroundColor: `${perm.color}05`,
                      },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checked}
                          onChange={() => handleTogglePermission(perm.key)}
                          sx={{
                            color: perm.color,
                            "&.Mui-checked": { color: perm.color },
                            p: 0,
                            mr: 1.5,
                            mt: 0.2,
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: "#333" }}>
                            {perm.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {perm.description}
                          </Typography>
                        </Box>
                      }
                      sx={{ width: "100%", m: 0, alignItems: "flex-start" }}
                    />
                  </Box>
                );
              })}
            </FormGroup>
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} disabled={saving} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{
                backgroundColor: "#830001",
                "&:hover": { backgroundColor: "#600001" },
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              {saving ? "Saving..." : editingItem ? "Update Permissions" : "Grant Permissions"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, email: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: "#d32f2f", fontWeight: 600 }}>Revoke Notice Access?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to revoke notice access for:
            <br />
            <strong>{deleteDialog.email}</strong>?
            <br />
            <br />
            This will immediately remove their access to publish and edit notices. Their faculty profile will remain untouched.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, email: null })}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Revoke Access
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
