import {
    IconButton,
    TableFooter,
    TableRow,
    Typography,
    Button,
    Grid,
    Paper,
    Box,
    Link,
} from '@mui/material'
import { TablePagination } from '@mui/base/TablePagination';
import {
    Edit,
    Flag,
    Description,
    KeyboardArrowLeft,
    KeyboardArrowRight,
    FirstPage,
    LastPage,
} from '@mui/icons-material'
import React, { useState, useEffect } from 'react'
import { AddForm } from './innovation-props/add-form'
import { EditForm } from './innovation-props/edit-form'
import { useSession } from 'next-auth/react'
import { DescriptionModal } from './common-props/description-modal'
import Filter from './common-props/filter'
import PropTypes from 'prop-types'

const paperSx = {
    flexGrow: 1,
    boxSizing: 'border-box',
}

const itemPaperSx = {
    margin: '8px auto',
    padding: '12px',
    lineHeight: 1.5,
}

const truncateSx = {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
}

const iconSx = {
    display: 'block',
    fontSize: '2rem',
    marginLeft: 'auto',
    marginRight: 'auto',
}

const attachedSx = {
    '& > span': { paddingLeft: '8px' },
    '& > span:first-child': {
        paddingLeft: 0,
    },
}

const paginationRootSx = {
    flexShrink: 0,
    marginRight: '20px',
}

function TablePaginationActions(props) {
    const { count, page, rowsPerPage, onPageChange } = props

    const handleFirstPageButtonClick = (event) => {
        onPageChange(event, 0)
    }

    const handleBackButtonClick = (event) => {
        onPageChange(event, page - 1)
    }

    const handleNextButtonClick = (event) => {
        onPageChange(event, page + 1)
    }

    const handleLastPageButtonClick = (event) => {
        onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1))
    }

    return (
        <Box sx={paginationRootSx}>
            <IconButton
                onClick={handleFirstPageButtonClick}
                disabled={page === 0}
                aria-label="first page"
            >
                <FirstPage />
            </IconButton>
            <IconButton
                onClick={handleBackButtonClick}
                disabled={page === 0}
                aria-label="previous page"
            >
                <KeyboardArrowLeft />
            </IconButton>
            <IconButton
                onClick={handleNextButtonClick}
                aria-label="next page"
            >
                <KeyboardArrowRight />
            </IconButton>
            <IconButton
                onClick={handleLastPageButtonClick}
                aria-label="last page"
            >
                <LastPage />
            </IconButton>
        </Box>
    )
}

TablePaginationActions.propTypes = {
    count: PropTypes.number.isRequired,
    onChangePage: PropTypes.func.isRequired,
    page: PropTypes.number.isRequired,
    rowsPerPage: PropTypes.number.isRequired,
}

const DataDisplay = (props) => {
    const {data:session,status} = useSession()
    const [details, setDetails] = useState(props.data)
    const [filterQuery, setFilterQuery] = useState(null)

    // const [rows, setRows] = useState(props.data);
    // const totalRow = [...rows]
    const [page, setPage] = React.useState(0)
    const [rowsPerPage, setRowsPerPage] = React.useState(15)

    // const emptyRows =
    // 	rowsPerPage - Math.min(rowsPerPage, rows.length - page * rowsPerPage);

    const handleChangePage = (event, newPage) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const [addModal, setAddModal] = useState(false)
    const addModalOpen = () => {
        setAddModal(!addModal)
    }
    const handleCloseAddModal = () => {
        setAddModal(false)
    }

    useEffect(() => {
        if (!filterQuery) {
            fetch('/api/innovation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    from: page * rowsPerPage,
                    to: page * rowsPerPage + rowsPerPage,
                    type:"between"
                }),
            })
                .then((res) => res.json())
                .then((data) => {
                    console.log(data)
                    setDetails(data)
                })
                .catch((err) => console.log(err))
        } else {
            fetch('/api/innovation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    ...filterQuery,
                    from: page * rowsPerPage,
                    to: page * rowsPerPage + rowsPerPage,
                    type:"range"
                }),
            })
                .then((res) => res.json())
                .then((data) => {
                    // console.log(data)
                    setDetails(data)
                })
                .catch((err) => console.log(err))
        }

        // setDetails(await response.json());

        console.log('page : ', page)
        console.log('rowperpage : ', rowsPerPage)

        // console.log(response.json());
    }, [page, rowsPerPage, filterQuery])

    const Innovation = ({ detail }) => {
        let openDate = new Date(detail.timestamp)
        let dd = openDate.getDate()
        let mm = openDate.getMonth() + 1
        let yyyy = openDate.getFullYear()
        openDate = dd + '/' + mm + '/' + yyyy

        const [editModal, setEditModal] = useState(false)
        const [descriptionModal, setDescriptionModal] = useState(false)

        const editModalOpen = () => {
            setEditModal(true)
        }

        const handleCloseEditModal = () => {
            setEditModal(false)
        }

        const descModalOpen = () => {
            setDescriptionModal(true)
        }

        const handleCloseDescModal = () => {
            setDescriptionModal(false)
        }

        return (
            <React.Fragment key={detail.id}>
                <Grid item xs={12} sm={8} lg={10}>
                    <Paper
                        sx={{ ...itemPaperSx, minHeight: '50px', position: 'relative' }}
                    >
                        <Box sx={truncateSx}>{detail.title}</Box>
                        <Box sx={attachedSx}>
                            {detail.image && (() => {
                                try {
                                    const images = typeof detail.image === 'string' ? 
                                        JSON.parse(detail.image) : 
                                        detail.image;
                                        
                                    return images.map((img, idx) => (
                                        <span
                                            key={idx}
                                            style={{
                                                marginRight: '10px',
                                                display: 'inline-flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <a 
                                                href={img.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    color: '#1976d2',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Link style={{ marginRight: '5px' }} />
                                                {img.caption}
                                            </a>
                                        </span>
                                    ));
                                } catch (e) {
                                    console.error('Error parsing image data:', e);
                                    return null;
                                }
                            })()}
                        </Box>
                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                            <div>Uploaded By : {detail.email} </div>
                            <div>Updated By: {detail.updatedBy} </div>
                            <div>Open Date: {openDate}</div>
                        </div>
                    </Paper>
                </Grid>

                <Grid item xs={6} sm={2} lg={1}>
                    <Paper
                        sx={{ ...itemPaperSx, textAlign: 'center', cursor: 'pointer' }}
                        onClick={descModalOpen}
                    >
                        <Description sx={iconSx} />
                        <span>Description</span>
                    </Paper>
                    <DescriptionModal
                        data={detail}
                        handleClose={handleCloseDescModal}
                        modal={descriptionModal}
                    />
                </Grid>
                {session.user.role == 1 ||
                session.user.email === detail.email ? (
                    <Grid item xs={6} sm={2} lg={1}>
                        <Paper
                            sx={{ ...itemPaperSx, textAlign: 'center', cursor: 'pointer' }}
                            onClick={editModalOpen}
                        >
                            <Edit sx={iconSx} /> <span>Edit</span>
                        </Paper>{' '}
                        <EditForm
                            data={detail}
                            modal={editModal}
                            handleClose={handleCloseEditModal}
                        />
                    </Grid>
                ) : (
                    <Grid item xs={6} sm={2} lg={1}>
                        <Paper
                            sx={{ ...itemPaperSx, textAlign: 'center', cursor: 'pointer' }}
                        ></Paper>{' '}
                    </Grid>
                )}
            </React.Fragment>
        )
    }

    return (
        <>
            <header>
                <Typography variant="h4" style={{ margin: `15px 0` }}>
                    Recent Innovations
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={addModalOpen}
                >
                    ADD +
                </Button>
                <Filter type="innovation" setEntries={setFilterQuery} />
            </header>

            <AddForm handleClose={handleCloseAddModal} modal={addModal} />

            <Grid container spacing={2} sx={paperSx}>
                {details.map((row,index) => {
                    return <Innovation key={row.id || index} detail={row} />
                })}
            </Grid>
            <TableFooter>
                <TableRow>
                    <TablePagination
                        rowsPerPageOptions={[15, 25, 50, 100]}
                        colSpan={7}
                        count={rowsPerPage * page + details.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        selectprops={{
                            inputProps: { 'aria-label': 'rows per page' },
                            native: true,
                        }}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        ActionsComponent={TablePaginationActions}
                    />
                </TableRow>
            </TableFooter>
        </>
    )
}

export default DataDisplay
