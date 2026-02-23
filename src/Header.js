import React from "react";
import { AppBar, Toolbar, IconButton, Box, Typography, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();

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
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            YourFaveBudgetingApp
          </Typography>
          <Button color="inherit" onClick={() => navigate('/help')}>
            Help
          </Button>
          <Button color="inherit" onClick={() => navigate('/settings')}>
            Settings
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}

export default Header;
