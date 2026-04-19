"use client";

import Layout from "../components/layout";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Edit, Delete, Add, DragIndicator, Save } from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Loading from "../components/loading";
import Sign from "../components/signin";
import Unauthorise from "../components/unauthorise";

export default function DesignationManagement() {
  const { data: session, status } = useSession();
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [newDesignation, setNewDesignation] = useState("");
  const [message, setMessage] = useState("");

  // Check if user has access (only OFFICER role)
  if (status === "loading") {
    return <Loading />;
  }

  if (!session) {
    return <Sign />;
  }

  if (session.user.role !== 4) {
    // Only OFFICER role can access
    return <Unauthorise />;
  }

  // Fetch designations
  const fetchDesignations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/designations");
      if (response.ok) {
        const data = await response.json();
        setDesignations(data);
      } else {
        setMessage("Failed to fetch designations");
      }
    } catch (error) {
      console.error("Error fetching designations:", error);
      setMessage("Failed to fetch designations");
    } finally {
      setLoading(false);
    }
  };

  // Add new designation
  const handleAdd = async () => {
    if (!newDesignation.trim()) {
      setMessage("Designation name is required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/designations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ designation: newDesignation.trim() }),
      });

      if (response.ok) {
        setMessage("Designation added successfully!");
        setNewDesignation("");
        setOpenAdd(false);
        fetchDesignations();
      } else {
        const error = await response.json();
        setMessage(error.error || "Failed to add designation");
      }
    } catch (error) {
      console.error("Error adding designation:", error);
      setMessage("Failed to add designation");
    } finally {
      setSaving(false);
    }
  };

  // Edit designation
  const handleEdit = async () => {
    if (!editingDesignation.designation.trim()) {
      setMessage("Designation name is required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/designations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingDesignation.id,
          designation: editingDesignation.designation.trim(),
        }),
      });

      if (response.ok) {
        setMessage("Designation updated successfully!");
        setOpenEdit(false);
        setEditingDesignation(null);
        fetchDesignations();
      } else {
        const error = await response.json();
        setMessage(error.error || "Failed to update designation");
      }
    } catch (error) {
      console.error("Error updating designation:", error);
      setMessage("Failed to update designation");
    } finally {
      setSaving(false);
    }
  };

  // Delete designation
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this designation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/designations?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("Designation deleted successfully!");
        fetchDesignations();
      } else {
        const error = await response.json();
        setMessage(error.error || "Failed to delete designation");
      }
    } catch (error) {
      console.error("Error deleting designation:", error);
      setMessage("Failed to delete designation");
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(designations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setDesignations(items);

    const priorities = items.map((item, index) => ({
      id: item.id,
      priority_order: index + 1,
    }));

    try {
      const response = await fetch("/api/designations/update-priority", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priorities }),
      });

      if (response.ok) {
        setMessage("Priority order updated successfully!");
      } else {
        setMessage("Failed to update priority order");
        fetchDesignations();
      }
    } catch (error) {
      console.error("Error updating priorities:", error);
      setMessage("Failed to update priority order");
      fetchDesignations();
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Designation Management
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
          Manage officer designations, their priority order, and add new
          designations. The priority order determines how staff members are
          sorted when fetched.
        </Typography>

        {message && (
          <Alert
            severity={message.includes("success") ? "success" : "error"}
            sx={{ mb: 3 }}
            onClose={() => setMessage("")}
          >
            {message}
          </Alert>
        )}

        <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAdd(true)}
            sx={{
              backgroundColor: "#830001",
              "&:hover": {
                backgroundColor: "#6a0001",
              },
            }}
          >
            Add Designation
          </Button>
        </Box>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Designations (Drag to reorder priority)
          </Typography>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="designations">
              {(provided) => (
                <TableContainer
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell width="60">Priority</TableCell>
                        <TableCell>Designation</TableCell>
                        <TableCell width="100" align="center">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {designations.map((designation, index) => (
                        <Draggable
                          key={designation.id}
                          draggableId={designation.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              sx={{
                                backgroundColor: snapshot.isDragging
                                  ? "action.hover"
                                  : "inherit",
                                "&:hover": {
                                  backgroundColor: "action.hover",
                                },
                              }}
                            >
                              <TableCell>
                                <Box
                                  sx={{ display: "flex", alignItems: "center" }}
                                >
                                  <IconButton
                                    size="small"
                                    {...provided.dragHandleProps}
                                    sx={{ mr: 1 }}
                                  >
                                    <DragIndicator />
                                  </IconButton>
                                  {index + 1}
                                </Box>
                              </TableCell>
                              <TableCell>{designation.designation}</TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingDesignation(designation);
                                    setOpenEdit(true);
                                  }}
                                  color="primary"
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(designation.id)}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Droppable>
          </DragDropContext>
        </Paper>

        {/* Add Designation Dialog */}
        <Dialog
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add New Designation</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Designation Name"
              fullWidth
              variant="outlined"
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAdd();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              variant="contained"
              sx={{
                backgroundColor: "#830001",
                "&:hover": {
                  backgroundColor: "#6a0001",
                },
              }}
            >
              {saving ? "Adding..." : "Add"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Designation Dialog */}
        <Dialog
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Designation</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Designation Name"
              fullWidth
              variant="outlined"
              value={editingDesignation?.designation || ""}
              onChange={(e) =>
                setEditingDesignation({
                  ...editingDesignation,
                  designation: e.target.value,
                })
              }
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleEdit();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button
              onClick={handleEdit}
              disabled={saving}
              variant="contained"
              sx={{
                backgroundColor: "#830001",
                "&:hover": {
                  backgroundColor: "#6a0001",
                },
              }}
            >
              {saving ? "Updating..." : "Update"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
