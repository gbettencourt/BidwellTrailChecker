import React, { Component } from "react";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import TextField from "@material-ui/core/TextField";
import BikeIcon from "@material-ui/icons/DirectionsBike";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";

const styles = (theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(3),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
});

type UnsubscribeProps = { classes: any };
type UnsubscribeState = {
  isEmailValid: boolean;
  email: string;
  emailHelperText: string;
  regError: string;
  unsubsribed: boolean;
};

class Unsubscribe extends Component<UnsubscribeProps, UnsubscribeState> {
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
    const { classes } = this.props;
    const unsubsribed = this.state.unsubsribed;
    return (
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <div className={classes.paper}>
          <Avatar className={classes.avatar}>
            <BikeIcon />
          </Avatar>
          {unsubsribed ? (
            <Typography component="h1" variant="h5">
              You have been unsubscribed
            </Typography>
          ) : (
            <div>
              <form className={classes.form} noValidate>
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
                  className={classes.submit}
                  onClick={this.handleUnSubClick}
                >
                  Unsubscribe
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  className={classes.submit}
                  onClick={this.handleCancelClick}
                >
                  Cancel
                </Button>
              </form>
            </div>
          )}
        </div>
        <Box mt={5}></Box>
      </Container>
    );
  }
}
export default withStyles(styles as any)(Unsubscribe);
