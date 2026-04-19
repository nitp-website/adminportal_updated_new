"use client";

import React, { useState, useEffect } from "react";
import Layout from "../components/layout";
import { useSession } from "next-auth/react";
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
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GroupIcon from "@mui/icons-material/Group";
import Loading from "../components/loading";
import Sign from "../components/signin";
import Unauthorise from "../components/unauthorise";

export default function RoleManagement() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState(0);

  // Role management state
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    role_name: "",
    role_key: "",
  });

  // Designation management state
  const [designations, setDesignations] = useState([]);
  const [designationsLoading, setDesignationsLoading] = useState(true);
  const [designationsOpen, setDesignationsOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [designationFormData, setDesignationFormData] = useState({
    designation: "",
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (session && session.user.role === "SUPER_ADMIN") {
      fetchRoles();
      fetchDesignations();
    }
  }, [session]);

  // Check if user has access (only SUPER_ADMIN)
  if (status === "loading") {
    return <Loading />;
  }

  if (!session) {
    return <Sign />;
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return <Unauthorise />;
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles");
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      } else {
        showSnackbar("Failed to fetch roles", "error");
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      showSnackbar("Error fetching roles", "error");
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await fetch("/api/designations");
      if (response.ok) {
        const data = await response.json();
        setDesignations(data);
      } else {
        showSnackbar("Failed to fetch designations", "error");
      }
    } catch (error) {
      console.error("Error fetching designations:", error);
      showSnackbar("Error fetching designations", "error");
    } finally {
      setDesignationsLoading(false);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Role management handlers
  const handleRolesOpenDialog = (role = null) => {
    setEditingRole(role);
    setRoleFormData({
      role_name: role?.role_name || "",
      role_key: role?.role_key || "",
    });
    setRolesOpen(true);
  };

  const handleRolesCloseDialog = () => {
    setRolesOpen(false);
    setEditingRole(null);
    setRoleFormData({ role_name: "", role_key: "" });
  };

  const handleRolesSubmit = async () => {
    if (!roleFormData.role_name.trim() || !roleFormData.role_key.trim()) {
      showSnackbar("Please fill in all fields", "error");
      return;
    }

    try {
      const url = editingRole ? "/api/roles" : "/api/roles";
      const method = editingRole ? "PUT" : "POST";
      const body = editingRole
        ? { ...roleFormData, id: editingRole.id }
        : roleFormData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        showSnackbar(
          `Role ${editingRole ? "updated" : "created"} successfully`,
        );
        fetchRoles();
        handleRolesCloseDialog();
      } else {
        const error = await response.json();
        showSnackbar(error.error || "Failed to save role", "error");
      }
    } catch (error) {
      console.error("Error saving role:", error);
      showSnackbar("Error saving role", "error");
    }
  };

  const handleRolesDelete = async (roleId) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const response = await fetch(`/api/roles?id=${roleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showSnackbar("Role deleted successfully");
        fetchRoles();
      } else {
        const error = await response.json();
        showSnackbar(error.error || "Failed to delete role", "error");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      showSnackbar("Error deleting role", "error");
    }
  };

  const handleRolesDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(roles);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setRoles(items);

    try {
      const response = await fetch("/api/roles/update-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: items }),
      });

      if (!response.ok) {
        showSnackbar("Failed to update role priorities", "error");
        fetchRoles();
      }
    } catch (error) {
      console.error("Error updating priorities:", error);
      showSnackbar("Error updating role priorities", "error");
      fetchRoles();
    }
  };

  // Designation management handlers
  const handleDesignationsOpenDialog = (designation = null) => {
    setEditingDesignation(designation);
    setDesignationFormData({
      designation: designation?.designation || "",
    });
    setDesignationsOpen(true);
  };

  const handleDesignationsCloseDialog = () => {
    setDesignationsOpen(false);
    setEditingDesignation(null);
    setDesignationFormData({ designation: "" });
  };

  const handleDesignationsSubmit = async () => {
    if (!designationFormData.designation.trim()) {
      showSnackbar("Please enter a designation", "error");
      return;
    }

    try {
      const url = editingDesignation
        ? "/api/designations"
        : "/api/designations";
      const method = editingDesignation ? "PUT" : "POST";
      const body = editingDesignation
        ? { ...designationFormData, id: editingDesignation.id }
        : designationFormData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        showSnackbar(
          `Designation ${
            editingDesignation ? "updated" : "created"
          } successfully`,
        );
        fetchDesignations();
        handleDesignationsCloseDialog();
      } else {
        const error = await response.json();
        showSnackbar(error.error || "Failed to save designation", "error");
      }
    } catch (error) {
      console.error("Error saving designation:", error);
      showSnackbar("Error saving designation", "error");
    }
  };

  const handleDesignationsDelete = async (designationId) => {
    if (!confirm("Are you sure you want to delete this designation?")) return;

    try {
      const response = await fetch(`/api/designations?id=${designationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showSnackbar("Designation deleted successfully");
        fetchDesignations();
      } else {
        const error = await response.json();
        showSnackbar(error.error || "Failed to delete designation", "error");
      }
    } catch (error) {
      console.error("Error deleting designation:", error);
      showSnackbar("Error deleting designation", "error");
    }
  };

  const handleDesignationsDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(designations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setDesignations(items);

    try {
      const priorities = items.map((designation, index) => ({
        id: designation.id,
        priority_order: index + 1,
      }));

      const response = await fetch("/api/designations/update-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priorities }),
      });

      if (!response.ok) {
        const error = await response.json();
        showSnackbar(
          error.error || "Failed to update designation priorities",
          "error",
        );
        fetchDesignations();
      }
    } catch (error) {
      console.error("Error updating priorities:", error);
      showSnackbar("Error updating designation priorities", "error");
      fetchDesignations();
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: "1200px", mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <AdminPanelSettingsIcon sx={{ mr: 2, fontSize: "2rem" }} />
          <Typography variant="h4" component="h1">
            System Control Center
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage roles and officer designations with priority ordering. Changes
          here affect staff ordering and access permissions.
        </Typography>

        <Paper sx={{ width: "100%", mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="control center tabs"
          >
            <Tab
              icon={<AdminPanelSettingsIcon />}
              label="Role Management"
              iconPosition="start"
            />
            <Tab
              icon={<GroupIcon />}
              label="Designation Management"
              iconPosition="start"
            />
          </Tabs>

          <Divider />

          {/* Role Management Tab */}
          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h6">System Roles</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleRolesOpenDialog()}
                >
                  Add New Role
                </Button>
              </Box>

              {rolesLoading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "200px",
                  }}
                >
                  <Typography>Loading roles...</Typography>
                </Box>
              ) : (
                <DragDropContext onDragEnd={handleRolesDragEnd}>
                  <Droppable droppableId="roles">
                    {(provided) => (
                      <List
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {roles.map((role, index) => (
                          <Draggable
                            key={role.id}
                            draggableId={role.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <ListItem
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                sx={{
                                  bgcolor: snapshot.isDragging
                                    ? "action.hover"
                                    : "background.paper",
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Box
                                  {...provided.dragHandleProps}
                                  sx={{ mr: 2, cursor: "grab" }}
                                >
                                  <DragIndicatorIcon />
                                </Box>

                                <ListItemText
                                  primary={
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      <Typography variant="h6">
                                        {role.role_name}
                                      </Typography>
                                      <Chip
                                        label={role.role_key}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                      />
                                      {/* <Chip
                                        label={`Priority: ${role.priority}`}
                                        size="small"
                                        color="secondary"
                                      /> */}
                                    </Box>
                                  }
                                />

                                <IconButton
                                  onClick={() => handleRolesOpenDialog(role)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>

                                <IconButton
                                  onClick={() => handleRolesDelete(role.id)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </ListItem>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </Box>
          )}

          {/* Designation Management Tab */}
          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h6">Officer Designations</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleDesignationsOpenDialog()}
                >
                  Add New Designation
                </Button>
              </Box>

              {designationsLoading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "200px",
                  }}
                >
                  <Typography>Loading designations...</Typography>
                </Box>
              ) : (
                <DragDropContext onDragEnd={handleDesignationsDragEnd}>
                  <Droppable droppableId="designations">
                    {(provided) => (
                      <List
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {designations.map((designation, index) => (
                          <Draggable
                            key={designation.id}
                            draggableId={designation.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <ListItem
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                sx={{
                                  bgcolor: snapshot.isDragging
                                    ? "action.hover"
                                    : "background.paper",
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Box
                                  {...provided.dragHandleProps}
                                  sx={{ mr: 2, cursor: "grab" }}
                                >
                                  <DragIndicatorIcon />
                                </Box>

                                <ListItemText
                                  primary={
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      <Typography variant="h6">
                                        {designation.designation}
                                      </Typography>
                                      {/* <Chip
                                        label={`Priority: ${designation.designation_priority}`}
                                        size="small"
                                        color="secondary"
                                      /> */}
                                    </Box>
                                  }
                                />

                                <IconButton
                                  onClick={() =>
                                    handleDesignationsOpenDialog(designation)
                                  }
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>

                                <IconButton
                                  onClick={() =>
                                    handleDesignationsDelete(designation.id)
                                  }
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </ListItem>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </List>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </Box>
          )}
        </Paper>

        {/* Role Add/Edit Dialog */}
        <Dialog
          open={rolesOpen}
          onClose={handleRolesCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingRole ? "Edit Role" : "Add New Role"}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Role Name"
              fullWidth
              variant="outlined"
              value={roleFormData.role_name}
              onChange={(e) =>
                setRoleFormData({ ...roleFormData, role_name: e.target.value })
              }
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              margin="dense"
              label="Role Key"
              fullWidth
              variant="outlined"
              value={roleFormData.role_key}
              onChange={(e) =>
                setRoleFormData({ ...roleFormData, role_key: e.target.value })
              }
              helperText="Unique identifier for the role (e.g., SUPER_ADMIN)"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleRolesCloseDialog}>Cancel</Button>
            <Button onClick={handleRolesSubmit} variant="contained">
              {editingRole ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Designation Add/Edit Dialog */}
        <Dialog
          open={designationsOpen}
          onClose={handleDesignationsCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingDesignation ? "Edit Designation" : "Add New Designation"}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Designation"
              fullWidth
              variant="outlined"
              value={designationFormData.designation}
              onChange={(e) =>
                setDesignationFormData({
                  ...designationFormData,
                  designation: e.target.value,
                })
              }
              sx={{ mb: 2, mt: 1 }}
              helperText="Officer designation (e.g., Director, Assistant Director)"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDesignationsCloseDialog}>Cancel</Button>
            <Button onClick={handleDesignationsSubmit} variant="contained">
              {editingDesignation ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}
