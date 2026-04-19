import React, { useState } from 'react'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import {
    FormControl,
    Input,
    InputLabel,
    MenuItem,
    Select,
} from '@mui/material'
import { depList, administrationList,notice_sub_types } from '@/lib/const'

const Filter = ({ type, setEntries }) => {
    const [open, setOpen] = React.useState(false)
    const [range, setRange] = useState({
        start_date: '',
        end_date: '',
        department: 'all',
        notice_type: 'department',
        notice_sub_type:null
    })
    const currentNoticeSubTypes = React.useMemo(() => {
        if (!range.notice_type) return undefined;
     
        let key = range.notice_type;
       
        if (typeof key === 'string') {
            key = key.toUpperCase();
        }
        const rawSubTypes = notice_sub_types[key];
        if (Array.isArray(rawSubTypes)) {
           
            return rawSubTypes.map(arr => arr[1]);
        }
        return undefined;
    }, [range.notice_type]); 
    console.log(currentNoticeSubTypes)
    const handleClickOpen = () => {
        setOpen(true)
    }

    const handleClose = () => {
        setOpen(false)
    }

    const handleChange = (e) => {
        setRange({ ...range, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
       
        let data = {
            start_date:
                range.start_date !== ''
                    ? new Date(range.start_date).getTime()
                    : 0,
            end_date:
                range.end_date !== ''
                    ? new Date(range.end_date).getTime()
                    : new Date().setYear(new Date().getFullYear() + 10),
            notice_type: range.notice_type,
            notice_sub_type:range.notice_sub_type,
            department: range.department,
        }

        console.log(data)
        //   let entries = await fetch(`/api/${type}/range`, {
        //     method: "post",
        //     headers: { "Content-type": "application/json" },
        //     body: JSON.stringify(data),
        //   });
        //   entries = await entries.json();

        //   // console.log(data);
        // // console.log(entries)
        // setEntries(entries);
        setEntries(data)
        setOpen(false)
    }

    return (
        <div style={{ display: 'inline', padding: `1rem` }}>
            <Button
                variant="outlined"
                style={{ color: '#830001', borderColor: '#830001' }}
                onClick={handleClickOpen}
               
            >
                Filter
            </Button>
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="form-dialog-title"
            >
                <DialogTitle id="form-dialog-title">Filter</DialogTitle>
                <form onSubmit={handleSubmit}>
                    {' '}
                    <DialogContent>
                        <DialogContentText>
                            Filter entries using date and department
                        </DialogContentText>

                        {type === 'notice' && (
                            <FormControl
                                style={{ margin: `10px auto`, width: `100%` }}
                                required
                            >
                                <InputLabel id="demo-dialog-select-label30">
                                    Notice Type
                                </InputLabel>

                                <Select
                                    labelId="demo-dialog-select-label30"
                                    id="demo-dialog-select30"
                                    name="notice_type"
                                    fullWidth
                                    value={range.notice_type}
                                    onChange={(e) => handleChange(e)}
                                    input={<Input />}
                                >
                                    <MenuItem value="general">General</MenuItem>
                                    <MenuItem value="department">
                                        Department
                                    </MenuItem>
                                    {[...administrationList].map(
                                        ([key, value]) => (
                                            <MenuItem key={key} value={key}>
                                                {value}
                                            </MenuItem>
                                        )
                                    )}
                                </Select>
                            </FormControl>
                        )}
                        {type === 'notice' &&
                            Array.isArray(currentNoticeSubTypes) &&
                            currentNoticeSubTypes.length > 0 && (
                                <FormControl
                                    style={{
                                        margin: `10px auto`,
                                        width: `100%`,
                                    }}
                                    required
                                >
                                    <InputLabel id="notice-sub-type">
                                        Notice Sub Type
                                    </InputLabel>
                                    <Select
                                        labelId="notice-sub-type"
                                        autoWidth
                                        id="notice-sub-type"
                                        name="notice_sub_type"
                                        value={range.notice_sub_type}
                                        onChange={handleChange}
                                        input={<Input />}
                                    >
                                        {currentNoticeSubTypes.map((value, idx) => (
                                            <MenuItem key={`${value}${idx}`} value={value}>
                                                {value}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                       
                             {type === 'notice' &&
                            range.notice_type == 'department' && (
                                <FormControl
                                    style={{
                                        margin: `10px auto`,
                                        width: `100%`,
                                    }}
                                    required
                                >
                                    <InputLabel id="department">
                                        Department
                                    </InputLabel>
                                    <Select
                                        labelId="branch"
                                        autoWidth
                                        id="branch"
                                        name="department"
                                        value={range.department}
                                        onChange={(e) => handleChange(e)}
                                        input={<Input />}
                                    >
                                        {[...depList].map(([key, value]) => (
                                            <MenuItem key={key} value={value}>
                                                {value}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        <TextField
                            margin="dense"
                            id="start_date"
                            name="start_date"
                            label="Starting date/Open Date"
                            value={range.start_date}
                            onChange={handleChange}
                            type="date"
                            InputLabelProps={{
                                shrink: true,
                            }}
                            fullWidth
                        />
                        <TextField
                            margin="dense"
                            id="end_date"
                            name="end_date"
                            label="End Date/Close Date"
                            onChange={handleChange}
                            value={range.end_date}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            type="date"
                            fullWidth
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose} color="primary">
                            Cancel
                        </Button>
                        <Button type="submit" color="primary">
                            Submit
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </div>
    )
}

export default Filter
