import React, { Component } from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import BikeIcon from "@mui/icons-material/DirectionsBike";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Captcha } from "../components/Captcha";
import { getRandomInt } from "../util/Util";

type SignUpProps = {};
type SignUpState = {
  isRegistered: boolean;
  isEmailValid: boolean;
  isCaptchaValid: boolean;
  email: string;
  emailHelperText: string;
  captcha: string;
  captchaHelperText: string;
  captchaCode: number;
  regError: string;
  trailStatus: string;
  lastCheckTime: string;
};

export default class SignUp extends Component<SignUpProps, SignUpState> {
  constructor(props: SignUpProps) {
    super(props);
    this.handleRegisterClick = this.handleRegisterClick.bind(this);
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handleCaptchaChange = this.handleCaptchaChange.bind(this);
    this.state = {
      isRegistered: false,
      isEmailValid: true,
      isCaptchaValid: true,
      email: "",
      emailHelperText: "",
      captcha: "",
      captchaHelperText: "",
      captchaCode: getRandomInt(1000, 9999),
      regError: "",
      trailStatus: "",
      lastCheckTime: "",
    };
  }

  componentDidMount() {
    fetch("/api/trailstatus")
      .then((res) => res.json())
      .then((status) =>
        this.setState({
          trailStatus: status.trailStatus,
          lastCheckTime: status.lastCheck,
        })
      );
  }

  handleRegisterClick() {
    const isValidEmail = (document.getElementById("email") as any).validity
      ?.valid;
    if (!isValidEmail) {
      this.setState({
        isEmailValid: false,
        emailHelperText: "Please enter a valid email",
      });
    }
    const isValidCaptcha = this.verifyCaptcha(
      (document.getElementById("captcha") as HTMLInputElement).value
    );
    if (!isValidCaptcha) {
      this.setState({
        isCaptchaValid: false,
        captchaHelperText: "Please enter the number below",
      });
    }
    if (!isValidEmail || !isValidCaptcha) {
      return;
    }
    const postData = { email: this.state.email };
    fetch("/api/registeremail", {
      method: "post",
      body: JSON.stringify(postData),
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          this.setState({ isRegistered: true });
        } else {
          this.setState({ regError: result.error });
        }
      });
  }

  handleEmailChange(event) {
    this.setState({ email: event.target.value });
  }

  handleCaptchaChange(event) {
    const value = event.target.value;
    const isValid = this.verifyCaptcha(value);
    this.setState({ captcha: value, isCaptchaValid: isValid });
  }

  verifyCaptcha(value) {
    return value && value !== "" && parseInt(value) === this.state.captchaCode;
  }

  render() {
    const isRegistered = this.state.isRegistered;
    const regError = this.state.regError;
    const trailStatusStyle = {
      color: this.state.trailStatus === "Open" ? "green" : "red",
    };
    const theme = createTheme();
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
            {regError && (
              <Typography component="h1" variant="h5">
                Unable to register {regError}
              </Typography>
            )}
            {isRegistered ? (
              <Typography component="h1" variant="h5">
                Your registration was successful!
              </Typography>
            ) : (
              <div>
                <Box mt={2}></Box>
                <Typography component="h1" variant="h5">
                  Current trail status:{" "}
                  <span style={trailStatusStyle}>{this.state.trailStatus}</span>
                </Typography>
                <Typography component="h6" variant="h6">
                  Last checked:{" "}
                  <span>
                    {new Date(this.state.lastCheckTime).toLocaleString()}
                  </span>
                </Typography>
                <Box mt={5}></Box>
                <Typography component="h1" variant="h5">
                  Enter your email address to get notifications when the Upper
                  Bidwell Park trail status changes:
                </Typography>
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
                  <Grid container sx={{ mt: 2 }}>
                    <Grid item xs={12}>
                      <TextField
                        variant="outlined"
                        required
                        fullWidth
                        id="captcha"
                        type="number"
                        label="Enter Code Below"
                        name="captcha"
                        value={this.state.captcha}
                        helperText={this.state.captchaHelperText}
                        error={!this.state.isCaptchaValid}
                        onChange={this.handleCaptchaChange}
                      />
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 2 }}>
                      <Captcha chars={this.state.captchaCode.toString()} />
                    </Grid>
                  </Grid>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3, mb: 2 }}
                    onClick={this.handleRegisterClick}
                  >
                    Sign Up
                  </Button>
                </Box>
              </div>
            )}
          </Box>
          <Box mt={2}></Box>
          <Box>
            <Link href="Unsubscribe">Unsubscribe</Link>
          </Box>
          <Box>
            <Link href="https://www.chico.ca.us/park-trails">
              Park Trail Page
            </Link>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }
}
