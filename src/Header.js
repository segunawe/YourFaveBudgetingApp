import React from "react";
import { AppBar, Toolbar, IconButton, Box, Typography } from '@material-ui/core';
import MenuIcon  from '@mui/icons-material/Menu';

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
                sx={{ mr: 2 }}
                >
                 <MenuIcon />

                <Typography variant="h6" component="div" sx={{ flexGrow: 1}}>
                    Left Item
                </Typography>
                </IconButton>
                <IconButton variant ="h6">
                    Right Item
                </IconButton>
            </Toolbar>
        </AppBar>
        </Box>
    );
  }
  export default Header;