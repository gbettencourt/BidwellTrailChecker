import React, { Component } from "react";
import BikeIcon from "@mui/icons-material/DirectionsBike";
import {
  Avatar,
  Box,
  Button,
  Container,
  CssBaseline,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

type UnsubscribeProps = {};
type UnsubscribeState = {
  isEmailValid: boolean;
  email: string;
  emailHelperText: string;
  regError: string;
  unsubsribed: boolean;
};

export default class Unsubscribe extends Component<
  UnsubscribeProps,
  UnsubscribeState
> {
  constructor(props) {
    super(props);
    this.handleUnSubClick = this.handleUnSubClick.bind(this);
    this.handleCancelClick = this.handleCancelClick.bind(this);
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.state = {
      unsubsribed: false,
      email: "",
      emailHelperText: "",
      isEmailValid: true,
      regError: "",
    };
  }

  handleUnSubClick() {
    let postData = { email: this.state.email };
    fetch("/api/rmemail", {
      method: "post",
      body: JSON.stringify(postData),
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          this.setState({ unsubsribed: true });
        } else {
          this.setState({ regError: result.error });
        }
      });
  }

  handleCancelClick() {
    window.history.back();
  }

  handleEmailChange(event) {
    this.setState({ email: event.target.value });
  }

  render() {
    const theme = createTheme();
    const unsubsribed = this.state.unsubsribed;
    return (
      <ThemeProvider theme={theme}>
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <Box
            sx={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <BikeIcon />
            </Avatar>
            {unsubsribed ? (
              <Typography component="h1" variant="h5">
                You have been unsubscribed
              </Typography>
            ) : (
              <Box component="form" noValidate sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      variant="outlined"
                      required
                      fullWidth
                      id="email"
                      type="email"
                      label="Email Address"
                      name="email"
                      autoComplete="email"
                      value={this.state.email}
                      helperText={this.state.emailHelperText}
                      error={!this.state.isEmailValid}
                      onChange={this.handleEmailChange}
                    />
                  </Grid>
                </Grid>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ mt: 3, mb: 2 }}
                  onClick={this.handleUnSubClick}
                >
                  Unsubscribe
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ mt: 1, mb: 2 }}
                  onClick={this.handleCancelClick}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Box>
          <Box mt={5}></Box>
        </Container>
      </ThemeProvider>
    );
  }
}
