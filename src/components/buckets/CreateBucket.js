import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  Typography,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const CreateBucket = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    goalAmount: '',
    targetDate: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const [friends, setFriends] = useState([]);
  const [selectedFriendUids, setSelectedFriendUids] = useState([]);

  // Fetch friends when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchFriends = async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${process.env.REACT_APP_API_URL}/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setFriends(data.friends || []);
      } catch (err) {
        console.error('Failed to load friends:', err);
      }
    };
    fetchFriends();
  }, [open, currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleFriend = (uid) => {
    setSelectedFriendUids(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Bucket name is required');
      return;
    }

    if (!formData.goalAmount || parseFloat(formData.goalAmount) <= 0) {
      setError('Goal amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await currentUser.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_URL}/buckets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          goalAmount: parseFloat(formData.goalAmount),
          targetDate: formData.targetDate || null,
          description: formData.description.trim(),
          memberUids: selectedFriendUids,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bucket');
      }

      setFormData({ name: '', goalAmount: '', targetDate: '', description: '' });
      setSelectedFriendUids([]);

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      console.error('Error creating bucket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: '', goalAmount: '', targetDate: '', description: '' });
      setSelectedFriendUids([]);
      setError(null);
      onClose();
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New Bucket</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <TextField
              label="Bucket Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              autoFocus
              placeholder="e.g., Vacation Fund"
              disabled={loading}
            />

            <Tooltip title="The total savings target for this bucket" placement="right">
              <TextField
                label="Goal Amount"
                name="goalAmount"
                type="number"
                value={formData.goalAmount}
                onChange={handleChange}
                required
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                placeholder="e.g., 2000"
                disabled={loading}
              />
            </Tooltip>

            <Tooltip title="On this date, if the goal is fully reached, funds will be automatically collected" placement="right">
              <TextField
                label="Target Date (Optional)"
                name="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: minDate }}
                helperText="When do you want to reach this goal?"
                disabled={loading}
              />
            </Tooltip>

            <TextField
              label="Description (Optional)"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Add notes about this savings goal..."
              disabled={loading}
            />

            {/* Friend selection — only shown if the user has friends */}
            {friends.length > 0 && (
              <>
                <Divider />
                <Tooltip title="Selected friends will receive an invite to contribute to this bucket" placement="right">
                  <Typography variant="subtitle2" color="text.secondary" sx={{ cursor: 'default' }}>
                    Share with friends (optional)
                  </Typography>
                </Tooltip>
                <List disablePadding dense>
                  {friends.map(friend => (
                    <ListItem
                      key={friend.uid}
                      disableGutters
                      button
                      onClick={() => toggleFriend(friend.uid)}
                      disabled={loading}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked={selectedFriendUids.includes(friend.uid)}
                          tabIndex={-1}
                          disableRipple
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={friend.displayName}
                        secondary={friend.email}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Creating...' : 'Create Bucket'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateBucket;
