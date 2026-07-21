"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  IconButton,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import { AddStaff } from "./staff-management/addStaff";
import { EditStaff } from "./staff-management/editStaff";
import { ConfirmDelete } from "./staff-management/confirm-delete";
import Loading from "./common/Loading";
import { StaffdepList, getDeptFullName } from "@/lib/const";

const DEPARTMENT_OPTIONS = Array.from(new Set(Array.from(StaffdepList.values())));

const columns = [
  { id: "employee_code", label: "Employee Code", minWidth: 130 },
  { id: "name", label: "Name", minWidth: 180 },
  { id: "email", label: "Email", minWidth: 220 },
  { id: "department", label: "Department", minWidth: 180 },
  { id: "designation", label: "Designation", minWidth: 180 },
  { id: "cadre", label: "Cadre", minWidth: 160 },
  { id: "actions", label: "Actions", minWidth: 120 },
];

export function StaffTable() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [nameSearch, setNameSearch] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "";
      key = "";
    }
    setSortConfig({ key, direction });
  };

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
      });
      if (nameSearch.trim()) params.set("name", nameSearch.trim());
      if (departmentFilter && departmentFilter !== "All") params.set("department", departmentFilter);
      if (sortConfig.key) {
        params.set("sortBy", sortConfig.key);
        params.set("sortOrder", sortConfig.direction || "asc");
      }

      const res = await fetch(`/api/staff2?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setRows(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.total) || 0);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, nameSearch, departmentFilter, sortConfig]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleEdit = async (staff) => {
    try {
      const res = await fetch(`/api/staff2?user_id=${staff.user_id}`);
      if (!res.ok) throw new Error("Failed to fetch staff details");
      const fullStaffData = await res.json();

      setSelectedStaff(fullStaffData);
      setOpenEdit(true);
    } catch (error) {
      console.error("Error fetching staff details:", error);
      alert("Failed to load staff details");
    }
  };

  const handleDelete = async (staffRow) => {
    try {
      const res = await fetch(`/api/staff2?user_id=${staffRow.user_id}`);
      if (!res.ok) throw new Error("Failed to fetch staff details");
      const fullStaffData = await res.json();

      setStaffToDelete(fullStaffData);
      setOpenDelete(true);
    } catch (error) {
      console.error("Error fetching staff details:", error);
      setStaffToDelete(staffRow);
      setOpenDelete(true);
    }
  };

  const handleDeleteFromEdit = (staff) => {
    setStaffToDelete(staff);
    setOpenEdit(false);
    setOpenDelete(true);
  };

  useEffect(() => {
    setPage(0);
  }, [nameSearch, departmentFilter, sortConfig]);

  return (
    <Paper sx={{ width: "100%", overflow: "hidden", p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Staff Management
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
          {loading && <Loading />}
          <TextField
            label="Search by Name"
            variant="outlined"
            size="small"
            value={nameInput}
            onChange={(e) => {
              const value = e.target.value;
              setNameInput(value);
              if (searchTimeout) clearTimeout(searchTimeout);
              const timeout = setTimeout(() => setNameSearch(value), 600);
              setSearchTimeout(timeout);
            }}
            sx={{ flexGrow: 1, minWidth: 180 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: "action.active", mr: 1 }} />,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="dept-filter-label">Filter Department</InputLabel>
            <Select
              labelId="dept-filter-label"
              id="dept-filter"
              value={departmentFilter}
              label="Filter Department"
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <MenuItem value="All">All Departments</MenuItem>
              {DEPARTMENT_OPTIONS.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAdd(true)}
            style={{ backgroundColor: "#830001", color: "white" }}
          >
            Add Staff
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: "calc(100vh - 300px)" }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => {
                const isSortable = ["employee_code", "name", "department"].includes(column.id);
                return (
                  <TableCell
                    key={column.id}
                    style={{
                      minWidth: column.minWidth,
                      fontWeight: "bold",
                      cursor: isSortable ? "pointer" : "default",
                      userSelect: isSortable ? "none" : "auto",
                    }}
                    onClick={isSortable ? () => handleSort(column.id) : undefined}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {column.label}
                      {isSortable && (
                        sortConfig.key === column.id ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUpwardIcon fontSize="small" sx={{ fontSize: "1rem" }} />
                          ) : (
                            <ArrowDownwardIcon fontSize="small" sx={{ fontSize: "1rem" }} />
                          )
                        ) : (
                          <ImportExportIcon fontSize="small" sx={{ color: "action.active", opacity: 0.5, fontSize: "1rem" }} />
                        )
                      )}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                hover
                tabIndex={-1}
                key={row.user_id ?? row.id ?? row.email}
              >
                <TableCell>{row.employee_code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{getDeptFullName(row.department)}</TableCell>
                <TableCell>{row.designation}</TableCell>
                <TableCell>{row.cadre}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(row)}
                    color="primary"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(row)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <AddStaff
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={() => {
          fetchStaff();
          setOpenAdd(false);
        }}
      />

      {selectedStaff && openEdit && (
        <EditStaff
          open={openEdit}
          faculty={selectedStaff}
          onClose={() => {
            setOpenEdit(false);
            setSelectedStaff(null);
          }}
          onSuccess={() => {
            fetchStaff();
            setOpenEdit(false);
            setSelectedStaff(null);
          }}
          onDelete={handleDeleteFromEdit}
        />
      )}

      {openDelete && staffToDelete && (
        <ConfirmDelete
          open={openDelete}
          onClose={() => {
            setOpenDelete(false);
            setStaffToDelete(null);
          }}
          faculty={staffToDelete}
          refreshTable={fetchStaff}
        />
      )}
    </Paper>
  );
}