import React from "react";
import { AppBar, Toolbar, IconButton, Box, Typography } from '@mui/material';
import MenuIcon  from '@mui/icons-material/Menu';
import Button from "@mui/material/Button";

function Header() {
    // Add your script code here
    return (
        <Box sx={{ flexGrow: 1 }}> 
         <AppBar position="static" color="primary">
             <Toolbar>
                <IconButton 
                size="large" 
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{ mr: 1 }}
                >
                 <MenuIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow : 1 }} color="inherit">
                    Financial Budgeting App
                </Typography>
                <Button variant ="h6">
                    Profile
                </Button>
             </Toolbar>
         </AppBar>
        </Box>
    );
  }
  export default Header;