import React from 'react';
import { Card, CardContent, Button } from '@mui/material';

const CircleRow = () => {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          sx={{
            borderRadius: 25,
            width: 100,
            height: 100,
            marginRight: 1,
            backgroundColor: 'grey',
            '&:hover': {
              backgroundColor: 'black',
            },
          }}
        />
        <Button
          sx={{
            borderRadius: '50%',
            width: 20,
            height: 20,
            marginRight: 1,
            backgroundColor: 'grey',
            '&:hover': {
              backgroundColor: 'black',
            },
          }}
        />
        <Button
          sx={{
            borderRadius: '50%',
            width: 20,
            height: 20,
            marginRight: 1,
            backgroundColor: 'grey',
            '&:hover': {
              backgroundColor: 'black',
            },
          }}
        />
        <Button
          sx={{
            borderRadius: '50%',
            width: 20,
            height: 20,
            backgroundColor: 'grey',
            '&:hover': {
              backgroundColor: 'black',
            },
          }}
        />
      </CardContent>
    </Card>
  );
};

export default CircleRow;
