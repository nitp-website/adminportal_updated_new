"use client";

import Layout from "../components/layout";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DragIndicator, Save, Refresh } from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { officerDesignations } from "@/lib/const";
import Loading from "../components/loading";
import Sign from "../components/signin";
import Unauthorise from "../components/unauthorise";

export default function OfficerControlPanel() {
  const { data: session, status } = useSession();
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Check if user has access
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

  // Fetch current designation priorities
  const fetchPriorities = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/designation-priority");
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
      
          const orderedDesignations = data
            .sort((a, b) => a.priority_order - b.priority_order)
            .map((item) => item.designation);
          setDesignations(orderedDesignations);
        } else {
       
          setDesignations([...officerDesignations]);
        }
      } else {
      
        setDesignations([...officerDesignations]);
      }
    } catch (error) {
      console.error("Error fetching priorities:", error);
      setDesignations([...officerDesignations]);
    } finally {
      setLoading(false);
    }
  };


  const savePriorities = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/designation-priority", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priorities: designations }),
      });

      if (response.ok) {
        setMessage("Designation priorities saved successfully!");
      } else {
        setMessage("Failed to save priorities. Please try again.");
      }
    } catch (error) {
      console.error("Error saving priorities:", error);
      setMessage("Failed to save priorities. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(designations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setDesignations(items);
  };

  const resetToDefault = () => {
    setDesignations([...officerDesignations]);
  };

  useEffect(() => {
    fetchPriorities();
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
      <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Officer Designation Priority Control Panel
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
          Drag and drop the designations below to set their display priority
          order. Higher positions in the list will appear first in dropdowns and
          displays.
        </Typography>

        {message && (
          <Alert
            severity={message.includes("success") ? "success" : "error"}
            sx={{ mb: 3 }}
          >
            {message}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current Designation Order
          </Typography>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="designations">
              {(provided) => (
                <List
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  {designations.map((designation, index) => (
                    <Draggable
                      key={designation}
                      draggableId={designation}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{
                            bgcolor: snapshot.isDragging
                              ? "action.hover"
                              : "inherit",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            "&:last-child": {
                              borderBottom: "none",
                            },
                          }}
                        >
                          <IconButton
                            {...provided.dragHandleProps}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <DragIndicator />
                          </IconButton>
                          <ListItemText
                            primary={`${index + 1}. ${designation}`}
                            primaryTypographyProps={{
                              variant: "body1",
                              fontWeight: 500,
                            }}
                          />
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        </Paper>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={resetToDefault}
            disabled={saving}
          >
            Reset to Default
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={savePriorities}
            disabled={saving}
            sx={{
              backgroundColor: "#830001",
              "&:hover": {
                backgroundColor: "#6a0001",
              },
            }}
          >
            {saving ? "Saving..." : "Save Priorities"}
          </Button>
        </Box>
      </Box>
    </Layout>
  );
}
